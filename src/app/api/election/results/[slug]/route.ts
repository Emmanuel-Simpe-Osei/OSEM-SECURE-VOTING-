import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/server";

interface Candidate {
  id: string;
  full_name: string;
  photo_url: string | null;
  votes: { id: string }[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const { data: election } = await supabaseServer
    .from("elections")
    .select(
      "id, title, slug, status, start_time, end_time, results_visibility, updated_at",
    )
    .eq("slug", slug)
    .single();

  if (!election) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (
    election.status !== "closed" ||
    election.results_visibility !== "public_after_close"
  ) {
    return NextResponse.json(
      { error: "Results not published yet." },
      { status: 403 },
    );
  }

  const [totalRes, votedRes, positionsRes, submissionsRes] = await Promise.all([
    supabaseServer
      .from("voter_eligibility")
      .select("id", { count: "exact", head: true })
      .eq("election_id", election.id),

    supabaseServer
      .from("voter_eligibility")
      .select("id", { count: "exact", head: true })
      .eq("election_id", election.id)
      .eq("has_voted", true),

    supabaseServer
      .from("positions")
      .select(
        `
        id, name, sort_order,
        candidates (
          id, full_name, photo_url,
          votes (id)
        )
      `,
      )
      .eq("election_id", election.id)
      .order("sort_order"),

    supabaseServer
      .from("ballot_submissions")
      .select("id", { count: "exact", head: true })
      .eq("election_id", election.id),
  ]);

  const total = totalRes.count || 0;
  const voted = votedRes.count || 0;
  const totalBallots = submissionsRes.count || 0;

  const positions = (positionsRes.data || []).map((position) => {
    const candidatesWithCounts = position.candidates.map(
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

    // Detect tie — more than one candidate has max votes
    const winnersCount = candidatesWithCounts.filter(
      (c) => c.vote_count === maxVotes && maxVotes > 0,
    ).length;
    const hasTie = winnersCount > 1;

    return {
      id: position.id,
      name: position.name,
      total_votes: totalPositionVotes,
      has_tie: hasTie,
      candidates: candidatesWithCounts.map((c) => ({
        ...c,
        percentage:
          totalPositionVotes > 0
            ? Math.round((c.vote_count / totalPositionVotes) * 100)
            : 0,
        is_winner: c.vote_count === maxVotes && maxVotes > 0,
        is_tie: hasTie && c.vote_count === maxVotes,
      })),
    };
  });

  return NextResponse.json({
    election: {
      title: election.title,
      status: election.status,
      start_time: election.start_time,
      end_time: election.end_time,
      slug: election.slug,
    },
    stats: {
      total_voters: total,
      has_voted: voted,
      turnout_percent: total > 0 ? Math.round((voted / total) * 100) : 0,
      total_ballots: totalBallots,
      valid_votes: totalBallots,
      rejected_votes: 0,
    },
    published_at: election.updated_at,
    positions,
  });
}
