import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Run all queries in parallel
  const [electionsRes, activeRes, votersRes, votesRes] = await Promise.all([
    supabaseServer
      .from("elections")
      .select("id, title, slug, status, start_time, end_time, created_at")
      .order("created_at", { ascending: false }),
    supabaseServer
      .from("elections")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabaseServer
      .from("voter_eligibility")
      .select("id", { count: "exact", head: true }),
    supabaseServer
      .from("ballot_submissions")
      .select("id", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    elections: electionsRes.data || [],
    admin_email: session.email,
    stats: {
      total_elections: electionsRes.data?.length || 0,
      active_elections: activeRes.count || 0,
      total_voters: votersRes.count || 0,
      total_votes_cast: votesRes.count || 0,
    },
  });
}
