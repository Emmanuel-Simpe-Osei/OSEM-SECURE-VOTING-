import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

export async function GET(request: NextRequest) {
  // Verify admin session
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Get all elections
  const { data: elections } = await supabaseServer
    .from("elections")
    .select("id, title, slug, status, start_time, end_time, created_at")
    .order("created_at", { ascending: false });

  // Get stats
  const { count: totalElections } = await supabaseServer
    .from("elections")
    .select("*", { count: "exact", head: true });

  const { count: activeElections } = await supabaseServer
    .from("elections")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const { count: totalVoters } = await supabaseServer
    .from("voter_eligibility")
    .select("*", { count: "exact", head: true });

  const { count: totalVotesCast } = await supabaseServer
    .from("ballot_submissions")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    elections: elections || [],
    admin_email: session.email,
    stats: {
      total_elections: totalElections || 0,
      active_elections: activeElections || 0,
      total_voters: totalVoters || 0,
      total_votes_cast: totalVotesCast || 0,
    },
  });
}
