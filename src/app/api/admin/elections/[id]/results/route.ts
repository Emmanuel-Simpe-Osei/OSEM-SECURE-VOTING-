import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

interface DisplayCandidate {
  id: string;
  full_name: string;
  photo_url: string | null;
  vote_count: number;
  percentage: number;
  is_leading: boolean;
}

interface DisplayPosition {
  id: string;
  name: string;
  total_votes: number;
  candidates: DisplayCandidate[];
}

interface DisplayStats {
  total_voters: number;
  has_voted: number;
  turnout_percent: number;
  remaining: number;
}

interface DisplayData {
  election: {
    title: string;
    status: string;
    start_time: string;
    end_time: string;
  };
  stats: DisplayStats;
  positions: DisplayPosition[];
}

interface ResultCandidate {
  id: string;
  full_name: string;
  photo_url: string | null;
  vote_count: number;
  percentage: number;
  is_winner: boolean;
  is_tie: boolean;
}

interface ResultPosition {
  id: string;
  name: string;
  max_votes: number;
  total_votes: number;
  has_tie: boolean;
  candidates: ResultCandidate[];
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

  // Get election details
  const { data: election } = await supabaseServer
    .from("elections")
    .select(
      "id, title, status, results_visibility, start_time, end_time, updated_at",
    )
    .eq("id", id)
    .single();

  if (!election) {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }

  // Get ballot count
  const { count: totalBallots } = await supabaseServer
    .from("ballot_submissions")
    .select("id", { count: "exact", head: true })
    .eq("election_id", id);

  // Call the SAME function that works for display
  const { data: displayData, error: rpcError } = await supabaseServer.rpc(
    "get_display_results",
    { election_id_param: id },
  );

  if (rpcError || !displayData) {
    console.error("RPC error:", rpcError);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 },
    );
  }

  const typedDisplayData = displayData as DisplayData;
  const stats = typedDisplayData.stats;
  let positionsData = typedDisplayData.positions || [];

  // Filter out duplicate positions (keep first occurrence of each ID)
  const seenPositionIds = new Set<string>();
  const uniquePositions: DisplayPosition[] = [];

  for (const position of positionsData) {
    if (!seenPositionIds.has(position.id)) {
      seenPositionIds.add(position.id);
      uniquePositions.push(position);
    }
  }

  positionsData = uniquePositions;

  // Transform display data to match results API format
  const positions: ResultPosition[] = positionsData.map(
    (position: DisplayPosition) => {
      const candidates: ResultCandidate[] = position.candidates.map(
        (c: DisplayCandidate) => {
          const allVoteCounts = position.candidates.map(
            (cand: DisplayCandidate) => cand.vote_count,
          );
          const maxVotes = Math.max(...allVoteCounts, 0);
          const winnersCount = position.candidates.filter(
            (cand: DisplayCandidate) =>
              cand.vote_count === maxVotes && maxVotes > 0,
          ).length;
          const hasTie = winnersCount > 1;

          return {
            id: c.id,
            full_name: c.full_name,
            photo_url: c.photo_url,
            vote_count: c.vote_count,
            percentage: c.percentage,
            is_winner: c.is_leading,
            is_tie: hasTie && c.is_leading,
          };
        },
      );

      const allVoteCounts = candidates.map(
        (c: ResultCandidate) => c.vote_count,
      );
      const maxVotes = Math.max(...allVoteCounts, 0);
      const winnersCount = candidates.filter(
        (c: ResultCandidate) => c.vote_count === maxVotes && maxVotes > 0,
      ).length;
      const hasTie = winnersCount > 1;

      return {
        id: position.id,
        name: position.name,
        max_votes: 1,
        total_votes: position.total_votes,
        has_tie: hasTie,
        candidates,
      };
    },
  );

  return NextResponse.json({
    election,
    stats: {
      total_voters: stats.total_voters,
      has_voted: stats.has_voted,
      turnout_percent: stats.turnout_percent,
      total_ballots: totalBallots || 0,
      valid_votes: totalBallots || 0,
      rejected_votes: 0,
    },
    published_at:
      election.results_visibility === "public_after_close"
        ? election.updated_at
        : null,
    positions,
  });
}
