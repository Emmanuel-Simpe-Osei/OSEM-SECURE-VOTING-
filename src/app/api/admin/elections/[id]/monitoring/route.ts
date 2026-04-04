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

  const [electionRes, totalRes, votedRes, activityRes] = await Promise.all([
    supabaseServer
      .from("elections")
      .select("id, title, slug, status, start_time, end_time")
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
      .from("voter_eligibility")
      .select("student_id, full_name, voted_at")
      .eq("election_id", id)
      .eq("has_voted", true)
      .not("voted_at", "is", null)
      .order("voted_at", { ascending: false })
      .limit(20),
  ]);

  if (!electionRes.data) {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }

  const total = totalRes.count || 0;
  const voted = votedRes.count || 0;

  return NextResponse.json({
    election: electionRes.data,
    stats: {
      total_voters: total,
      has_voted: voted,
      turnout_percent: total > 0 ? Math.round((voted / total) * 100) : 0,
      remaining: total - voted,
    },
    recent_activity: activityRes.data || [],
  });
}
