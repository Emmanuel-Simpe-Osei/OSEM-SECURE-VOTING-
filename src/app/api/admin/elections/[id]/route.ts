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

  const { data: election } = await supabaseServer
    .from("elections")
    .select(
      "id, title, slug, status, start_time, end_time, results_visibility, description",
    )
    .eq("id", id)
    .single();

  if (!election) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get positions with candidates
  const { data: positions } = await supabaseServer
    .from("positions")
    .select(
      `
      id, name, max_votes, sort_order,
      candidates (id, full_name, status)
    `,
    )
    .eq("election_id", id)
    .order("sort_order");

  // Get stats
  const { count: totalVoters } = await supabaseServer
    .from("voter_eligibility")
    .select("*", { count: "exact", head: true })
    .eq("election_id", id);

  const { count: hasVoted } = await supabaseServer
    .from("voter_eligibility")
    .select("*", { count: "exact", head: true })
    .eq("election_id", id)
    .eq("has_voted", true);

  const total = totalVoters || 0;
  const voted = hasVoted || 0;

  return NextResponse.json({
    election,
    positions: positions || [],
    stats: {
      total_voters: total,
      has_voted: voted,
      turnout_percent: total > 0 ? Math.round((voted / total) * 100) : 0,
    },
  });
}
