import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/server";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // CRITICAL: Reject if CRON_SECRET is not configured
  if (!cronSecret) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const now = new Date().toISOString();
  const results = {
    started: 0,
    closed: 0,
    errors: [] as string[],
  };

  // Auto-start scheduled elections
  const { data: toStart, error: startFetchError } = await supabaseServer
    .from("elections")
    .select("id, title, slug")
    .eq("status", "scheduled")
    .lte("start_time", now);

  if (startFetchError) {
    results.errors.push(`fetch scheduled: ${startFetchError.message}`);
  } else if (toStart && toStart.length > 0) {
    for (const election of toStart) {
      const { error } = await supabaseServer
        .from("elections")
        .update({ status: "active" })
        .eq("id", election.id);

      if (error) {
        results.errors.push(`start ${election.id}: ${error.message}`);
      } else {
        results.started++;
        await supabaseServer.from("audit_logs").insert({
          actor_type: "system",
          actor_id: "cron",
          action: "ELECTION_AUTO_STARTED",
          target_type: "election",
          target_id: election.id,
          metadata: {
            title: election.title,
            slug: election.slug,
            triggered_at: now,
          },
          ip_hash: "cron",
        });
      }
    }
  }

  // Auto-close active/paused elections
  const { data: toClose, error: closeFetchError } = await supabaseServer
    .from("elections")
    .select("id, title, slug")
    .in("status", ["active", "paused"])
    .lte("end_time", now);

  if (closeFetchError) {
    results.errors.push(`fetch active: ${closeFetchError.message}`);
  } else if (toClose && toClose.length > 0) {
    for (const election of toClose) {
      const { error } = await supabaseServer
        .from("elections")
        .update({ status: "closed" })
        .eq("id", election.id);

      if (error) {
        results.errors.push(`close ${election.id}: ${error.message}`);
      } else {
        results.closed++;
        await supabaseServer.from("audit_logs").insert({
          actor_type: "system",
          actor_id: "cron",
          action: "ELECTION_AUTO_CLOSED",
          target_type: "election",
          target_id: election.id,
          metadata: {
            title: election.title,
            slug: election.slug,
            triggered_at: now,
          },
          ip_hash: "cron",
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: now,
    started: results.started,
    closed: results.closed,
    errors: results.errors,
  });
}
