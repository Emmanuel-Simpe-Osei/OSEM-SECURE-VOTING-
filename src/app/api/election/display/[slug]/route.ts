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

  // Get election
  const { data: election } = await supabaseServer
    .from("elections")
    .select("id, title, status, start_time, end_time, results_visibility")
    .eq("slug", slug)
    .single();

  if (!election) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only show display for active or paused elections
  // OR if results are public after close
  const canShowResults =
    election.status === "active" ||
    election.status === "paused" ||
    (election.status === "closed" &&
      election.results_visibility === "public_after_close");

  if (!canShowResults) {
    return NextResponse.json(
      { error: "Display not available." },
      { status: 403 },
    );
  }

  // Run all queries in parallel
  const [totalRes, votedRes, positionsRes] = await Promise.all([
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
  ]);

  const total = totalRes.count || 0;
  const voted = votedRes.count || 0;

  // Build results
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

    return {
      id: position.id,
      name: position.name,
      total_votes: totalPositionVotes,
      candidates: candidatesWithCounts.map((c) => ({
        ...c,
        percentage:
          totalPositionVotes > 0
            ? Math.round((c.vote_count / totalPositionVotes) * 100)
            : 0,
        is_leading: c.vote_count === maxVotes && maxVotes > 0,
      })),
    };
  });

  return NextResponse.json({
    election: {
      title: election.title,
      status: election.status,
      start_time: election.start_time,
      end_time: election.end_time,
    },
    stats: {
      total_voters: total,
      has_voted: voted,
      turnout_percent: total > 0 ? Math.round((voted / total) * 100) : 0,
      remaining: total - voted,
    },
    positions,
  });
}
