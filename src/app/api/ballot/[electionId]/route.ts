import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";
import { generateToken } from "@/lib/security/hash";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ electionId: string }> },
) {
  const { electionId } = await params;

  // Step 1: Verify student session
  const session = await getStudentSession();
  if (!session?.student_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Step 2: Verify session matches election
  if (session.election_id !== electionId) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Step 3: Get election details
  const { data: election } = await supabaseServer
    .from("elections")
    .select("id, title, slug, status, start_time, end_time")
    .eq("id", electionId)
    .single();

  if (!election || election.status !== "active") {
    return NextResponse.json(
      { error: "Election is not active" },
      { status: 400 },
    );
  }

  // Step 4: Check time window
  const now = new Date();
  if (
    now < new Date(election.start_time) ||
    now > new Date(election.end_time)
  ) {
    return NextResponse.json(
      { error: "Election is not active" },
      { status: 400 },
    );
  }

  // Step 5: Check voter hasn't already voted
  const { data: voter } = await supabaseServer
    .from("voter_eligibility")
    .select("has_voted, full_name")
    .eq("election_id", electionId)
    .eq("student_id", session.student_id)
    .single();

  if (!voter) {
    return NextResponse.json({ error: "Voter not found" }, { status: 400 });
  }

  if (voter.has_voted) {
    return NextResponse.json({ error: "Already voted" }, { status: 400 });
  }

  // Step 6: Get positions and candidates
  const { data: positions } = await supabaseServer
    .from("positions")
    .select(
      `
      id,
      name,
      description,
      max_votes,
      sort_order,
      candidates (
        id,
        full_name,
        bio,
        photo_url,
        sort_order
      )
    `,
    )
    .eq("election_id", electionId)
    .order("sort_order");

  // Step 7: Generate one-time submission token
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  await supabaseServer.from("ballot_submission_tokens").insert({
    election_id: electionId,
    student_id: session.student_id,
    token,
    expires_at: expiresAt.toISOString(),
  });

  return NextResponse.json({
    election: {
      id: election.id,
      title: election.title,
      slug: election.slug,
    },
    voter: {
      full_name: voter.full_name,
    },
    positions: positions || [],
    token,
  });
}
