import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

interface Candidate {
  id: string;
  full_name: string;
  photo_url: string | null;
  votes: { id: string }[];
}

interface CandidateWithCount {
  id: string;
  full_name: string;
  photo_url: string | null;
  vote_count: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;

  const [electionRes, totalRes, votedRes, positionsRes, submissionsRes] =
    await Promise.all([
      supabaseServer
        .from("elections")
        .select(
          "id, title, status, results_visibility, start_time, end_time, updated_at",
        )
        .eq("id", id)
        .single(),

      supabaseServer
        .from("voter_eligibility")
        .select("id", { count: "exact", head: true })
        .eq("election_id", id),

      supabaseServer
        .from("voter_eligibility")
        .select("id", { count: "exact", head: true })
        .eq("election_id", id)
        .eq("has_voted", true),

      supabaseServer
        .from("positions")
        .select(
          `
        id, name, max_votes, sort_order,
        candidates (
          id, full_name, photo_url,
          votes (id)
        )
      `,
        )
        .eq("election_id", id)
        .order("sort_order"),

      supabaseServer
        .from("ballot_submissions")
        .select("id", { count: "exact", head: true })
        .eq("election_id", id),
    ]);

  if (!electionRes.data) {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }

  const total = totalRes.count || 0;
  const voted = votedRes.count || 0;
  const totalBallots = submissionsRes.count || 0;

  const positions = (positionsRes.data || []).map((position) => {
    const candidatesWithCounts: CandidateWithCount[] = position.candidates.map(
      (candidate: Candidate) => ({
        id: candidate.id,
        full_name: candidate.full_name,
        photo_url: candidate.photo_url,
        vote_count: candidate.votes?.length || 0,
      }),
    );

    const totalPositionVotes = candidatesWithCounts.reduce(
      (sum, c) => sum + c.vote_count,
      0,
    );

    const maxVotes = Math.max(
      ...candidatesWithCounts.map((c) => c.vote_count),
      0,
    );

    const winnersCount = candidatesWithCounts.filter(
      (c) => c.vote_count === maxVotes && maxVotes > 0,
    ).length;
    const hasTie = winnersCount > 1;

    const candidates = candidatesWithCounts.map((c) => ({
      ...c,
      percentage:
        totalPositionVotes > 0
          ? Math.round((c.vote_count / totalPositionVotes) * 100)
          : 0,
      is_winner: c.vote_count === maxVotes && maxVotes > 0,
      is_tie: hasTie && c.vote_count === maxVotes,
    }));

    return {
      id: position.id,
      name: position.name,
      max_votes: position.max_votes,
      total_votes: totalPositionVotes,
      has_tie: hasTie,
      candidates,
    };
  });

  return NextResponse.json({
    election: electionRes.data,
    stats: {
      total_voters: total,
      has_voted: voted,
      turnout_percent: total > 0 ? Math.round((voted / total) * 100) : 0,
      total_ballots: totalBallots,
      valid_votes: totalBallots,
      rejected_votes: 0,
    },
    published_at:
      electionRes.data.results_visibility === "public_after_close"
        ? electionRes.data.updated_at
        : null,
    positions,
  });
}
