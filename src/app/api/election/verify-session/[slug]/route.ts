import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { supabaseServer } from "@/lib/db/server";
import { getStudentSession } from "@/lib/auth/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Must have Google session
  const googleSession = await getServerSession(authOptions);
  if (!googleSession?.user?.email) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Must have student iron-session
  const studentSession = await getStudentSession();
  if (!studentSession?.student_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const email = googleSession.user.email.toLowerCase();

  // Get election
  const { data: election } = await supabaseServer
    .from("elections")
    .select(
      "id, title, status, session_verification_enabled, session_verification_message, available_sessions",
    )
    .eq("slug", slug)
    .single();

  if (!election || election.status !== "active") {
    return NextResponse.json(
      { error: "Election not found or not active." },
      { status: 404 },
    );
  }

  // If verification not enabled — tell client to skip to ballot
  if (!election.session_verification_enabled) {
    return NextResponse.json({ session_verification_enabled: false });
  }

  // Get voter
  const { data: voter } = await supabaseServer
    .from("voter_eligibility")
    .select(
      "id, student_id, full_name, level, programme, programme_session, has_voted",
    )
    .eq("election_id", election.id)
    .eq("school_email", email)
    .single();

  if (!voter) {
    return NextResponse.json({ error: "Voter not found." }, { status: 404 });
  }

  if (voter.has_voted) {
    return NextResponse.json({ error: "Already voted." }, { status: 409 });
  }

  return NextResponse.json({
    session_verification_enabled: true,
    election: {
      title: election.title,
      session_verification_message:
        election.session_verification_message ||
        "Your session could not be verified. Please visit the admin desk with your student ID or proof of registration.",
      available_sessions: election.available_sessions || [
        "Morning",
        "Evening",
        "Weekend",
      ],
    },
    voter: {
      full_name: voter.full_name,
      student_id: voter.student_id,
      level: voter.level,
      programme: voter.programme,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Must have Google session
  const googleSession = await getServerSession(authOptions);
  if (!googleSession?.user?.email) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Must have student iron-session
  const studentSession = await getStudentSession();
  if (!studentSession?.student_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { selected_session } = await request.json();

  if (!selected_session || typeof selected_session !== "string") {
    return NextResponse.json(
      { error: "No session selected." },
      { status: 400 },
    );
  }

  // Sanitize input
  const allowedSessions = ["Morning", "Evening", "Weekend"];
  if (!allowedSessions.includes(selected_session)) {
    return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  }

  const email = googleSession.user.email.toLowerCase();

  // Get election
  const { data: election } = await supabaseServer
    .from("elections")
    .select(
      "id, title, status, session_verification_enabled, session_verification_message",
    )
    .eq("slug", slug)
    .single();

  if (!election || election.status !== "active") {
    return NextResponse.json(
      { error: "Election not active." },
      { status: 404 },
    );
  }

  if (!election.session_verification_enabled) {
    return NextResponse.json(
      { error: "Session verification not enabled." },
      { status: 400 },
    );
  }

  // Get voter
  const { data: voter } = await supabaseServer
    .from("voter_eligibility")
    .select("id, student_id, full_name, programme_session, has_voted")
    .eq("election_id", election.id)
    .eq("school_email", email)
    .single();

  if (!voter) {
    // Log suspicious attempt — email not in voter list
    await supabaseServer.from("audit_logs").insert({
      actor_type: "unknown",
      actor_id: email,
      action: "SESSION_VERIFY_VOTER_NOT_FOUND",
      target_type: "election",
      target_id: election.id,
      metadata: { email, selected_session, slug },
      ip_hash: "client-side",
    });

    // Destroy session — no retry
    await studentSession.destroy();

    return NextResponse.json({
      verified: false,
      message:
        election.session_verification_message ||
        "Your session could not be verified. Please visit the admin desk with your student ID or proof of registration.",
    });
  }

  if (voter.has_voted) {
    return NextResponse.json({ error: "Already voted." }, { status: 409 });
  }

  // Check session match
  const verified =
    voter.programme_session?.toLowerCase() === selected_session.toLowerCase();

  // Log every attempt — success or failure
  await supabaseServer.from("audit_logs").insert({
    actor_type: "voter",
    actor_id: voter.student_id,
    action: verified ? "SESSION_VERIFIED" : "SESSION_MISMATCH",
    target_type: "election",
    target_id: election.id,
    metadata: {
      student_id: voter.student_id,
      selected_session,
      actual_session: voter.programme_session,
      email,
      verified,
    },
    ip_hash: "client-side",
  });

  if (!verified) {
    // Destroy iron-session — no retry possible
    await studentSession.destroy();

    return NextResponse.json({
      verified: false,
      message:
        election.session_verification_message ||
        "Your session could not be verified. Please visit the admin desk with your student ID or proof of registration.",
    });
  }

  // Verified — mark session as verified
  studentSession.session_verified = true;
  await studentSession.save();

  return NextResponse.json({ verified: true });
}
