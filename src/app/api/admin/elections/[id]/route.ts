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
      candidates (id, full_name, bio, photo_url, sort_order, status)
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const { extend_minutes } = body;
  if (!extend_minutes || typeof extend_minutes !== "number" || extend_minutes < 1 || extend_minutes > 480) {
    return NextResponse.json({ error: "Invalid extension. Must be between 1 and 480 minutes." }, { status: 400 });
  }
  const { data: election } = await supabaseServer
    .from("elections")
    .select("id, end_time, status, created_by")
    .eq("id", id)
    .single();
  if (!election) {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }
  if (!["active", "scheduled", "paused"].includes(election.status)) {
    return NextResponse.json({ error: "Can only extend active, scheduled or paused elections." }, { status: 400 });
  }
  const newEndTime = new Date(new Date(election.end_time).getTime() + extend_minutes * 60 * 1000);
  const { error } = await supabaseServer
    .from("elections")
    .update({ end_time: newEndTime.toISOString() })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Failed to extend election." }, { status: 500 });
  }
  await supabaseServer.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: session.admin_id,
    action: "ELECTION_TIME_EXTENDED",
    target_type: "election",
    target_id: id,
    metadata: { extend_minutes, new_end_time: newEndTime.toISOString() },
  });
  return NextResponse.json({ success: true, new_end_time: newEndTime.toISOString() });
}
