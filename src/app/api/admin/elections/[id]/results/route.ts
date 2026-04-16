import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

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

  // Transform display data to match results API format
  const stats = displayData.stats as any;
  const positions = ((displayData.positions as any[]) || []).map(
    (position: any) => {
      const candidates = position.candidates.map((c: any) => {
        const maxVotes = Math.max(
          ...position.candidates.map((cand: any) => cand.vote_count),
          0,
        );
        const winnersCount = position.candidates.filter(
          (cand: any) => cand.vote_count === maxVotes && maxVotes > 0,
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
      });

      const maxVotes = Math.max(...candidates.map((c: any) => c.vote_count), 0);
      const winnersCount = candidates.filter(
        (c: any) => c.vote_count === maxVotes && maxVotes > 0,
      ).length;
      const hasTie = winnersCount > 1;

      return {
        id: position.id,
        name: position.name,
        max_votes: 1, // Default since display doesn't track max_votes per position
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
