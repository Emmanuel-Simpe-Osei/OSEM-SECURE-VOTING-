import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { supabaseServer } from "@/lib/db/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const googleSession = await getServerSession(authOptions);
  if (!googleSession?.user?.email) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const email = googleSession.user.email.toLowerCase();

  // Get election
  const { data: election } = await supabaseServer
    .from("elections")
    .select(
      `
      id, title, status,
      eligibility_check_enabled,
      eligibility_check_open_from,
      session_verification_enabled,
      session_verification_message,
      available_sessions,
      start_time
    `,
    )
    .eq("slug", slug)
    .single();

  if (!election) {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }

  if (!election.eligibility_check_enabled) {
    return NextResponse.json(
      { error: "Eligibility check is not open for this election." },
      { status: 403 },
    );
  }

  // Check if eligibility window is open
  const now = new Date();
  if (
    election.eligibility_check_open_from &&
    now < new Date(election.eligibility_check_open_from)
  ) {
    return NextResponse.json(
      { error: "Eligibility check has not opened yet." },
      { status: 403 },
    );
  }

  // Don't allow check after election starts
  if (election.status === "active" || election.status === "closed") {
    return NextResponse.json(
      { error: "Eligibility check is closed. The election has started." },
      { status: 403 },
    );
  }

  // Check if already checked
  const { data: existingCheck } = await supabaseServer
    .from("eligibility_checks")
    .select("id, result")
    .eq("election_id", election.id)
    .eq("school_email", email)
    .single();

  if (existingCheck) {
    return NextResponse.json({
      already_checked: true,
      previous_result:
        existingCheck.result === "eligible" ? "eligible" : "already_checked",
      election: {
        title: election.title,
        id: election.id,
        session_verification_enabled: election.session_verification_enabled,
        available_sessions: election.available_sessions || [
          "Morning",
          "Evening",
          "Weekend",
        ],
        not_eligible_message: election.session_verification_message,
      },
    });
  }

  // Get voter info
  const { data: voter } = await supabaseServer
    .from("voter_eligibility")
    .select(
      "id, student_id, full_name, level, programme, programme_session, has_voted, eligible",
    )
    .eq("election_id", election.id)
    .eq("school_email", email)
    .single();

  return NextResponse.json({
    already_checked: false,
    election: {
      title: election.title,
      id: election.id,
      session_verification_enabled: election.session_verification_enabled,
      available_sessions: election.available_sessions || [
        "Morning",
        "Evening",
        "Weekend",
      ],
      not_eligible_message: election.session_verification_message,
    },
    voter: voter
      ? {
          full_name: voter.full_name,
          student_id: voter.student_id,
          level: voter.level,
          programme: voter.programme,
          programme_session: voter.programme_session,
        }
      : null,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const googleSession = await getServerSession(authOptions);
  if (!googleSession?.user?.email) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const email = googleSession.user.email.toLowerCase();
  const { selected_session } = await request.json();

  // Get election
  const { data: election } = await supabaseServer
    .from("elections")
    .select(
      `
      id, title, status,
      eligibility_check_enabled,
      session_verification_enabled,
      session_verification_message,
      available_sessions
    `,
    )
    .eq("slug", slug)
    .single();

  if (!election || !election.eligibility_check_enabled) {
    return NextResponse.json({ error: "Not available." }, { status: 403 });
  }

  if (election.status === "active" || election.status === "closed") {
    return NextResponse.json(
      { error: "Check period is closed." },
      { status: 403 },
    );
  }

  // Check if already checked — prevent multiple attempts
  const { data: existingCheck } = await supabaseServer
    .from("eligibility_checks")
    .select("id, result")
    .eq("election_id", election.id)
    .eq("school_email", email)
    .single();

  if (existingCheck) {
    return NextResponse.json({
      result: "already_checked",
      message: "You have already completed your eligibility check.",
    });
  }

  // Get voter
  const { data: voter } = await supabaseServer
    .from("voter_eligibility")
    .select(
      "id, student_id, full_name, level, programme, programme_session, has_voted, eligible",
    )
    .eq("election_id", election.id)
    .eq("school_email", email)
    .single();

  // Not found in DB
  if (!voter || !voter.eligible) {
    await supabaseServer.from("eligibility_checks").insert({
      election_id: election.id,
      student_id: email.split("@")[0],
      school_email: email,
      full_name: null,
      programme_session: null,
      result: "not_found",
    });

    return NextResponse.json({
      result: "not_found",
      message:
        election.session_verification_message ||
        "Your details were not found in our records. Please visit the admin desk with your student ID or proof of registration before election day.",
    });
  }

  // Already voted
  if (voter.has_voted) {
    await supabaseServer.from("eligibility_checks").insert({
      election_id: election.id,
      student_id: voter.student_id,
      school_email: email,
      full_name: voter.full_name,
      programme_session: voter.programme_session,
      result: "already_voted",
    });

    return NextResponse.json({ result: "already_voted" });
  }

  // Session verification check
  if (election.session_verification_enabled && selected_session) {
    const allowedSessions = ["Morning", "Evening", "Weekend"];
    if (!allowedSessions.includes(selected_session)) {
      return NextResponse.json({ error: "Invalid session." }, { status: 400 });
    }

    const sessionMatch =
      voter.programme_session?.toLowerCase() === selected_session.toLowerCase();

    if (!sessionMatch) {
      // Log failed attempt — no retry
      await supabaseServer.from("eligibility_checks").insert({
        election_id: election.id,
        student_id: voter.student_id,
        school_email: email,
        full_name: voter.full_name,
        programme_session: selected_session,
        result: "session_mismatch",
      });

      return NextResponse.json({
        result: "session_mismatch",
        message:
          election.session_verification_message ||
          "Your session could not be verified. Please visit the admin desk with your student ID or proof of registration before election day.",
        voter: {
          full_name: voter.full_name,
          student_id: voter.student_id,
        },
      });
    }
  }

  // All checks passed — eligible
  await supabaseServer.from("eligibility_checks").insert({
    election_id: election.id,
    student_id: voter.student_id,
    school_email: email,
    full_name: voter.full_name,
    programme_session: voter.programme_session,
    result: "eligible",
  });

  return NextResponse.json({
    result: "eligible",
    voter: {
      full_name: voter.full_name,
      student_id: voter.student_id,
      level: voter.level,
      programme: voter.programme,
      programme_session: voter.programme_session,
    },
    election: { title: election.title },
  });
}
