import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await getAdminSession();
  if (!session.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const { enabled, open_from } = body;

  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { data: election } = await supabaseServer
    .from("elections")
    .select("id, title")
    .eq("id", id)
    .single();

  if (!election) {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }

  const { error } = await supabaseServer
    .from("elections")
    .update({
      eligibility_check_enabled: enabled,
      eligibility_check_open_from: open_from || null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to save." }, { status: 500 });
  }

  await supabaseServer.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: session.admin_id,
    action: enabled
      ? "eligibility_check_enabled"
      : "eligibility_check_disabled",
    target_type: "election",
    target_id: id,
    metadata: {
      election_title: election.title,
      enabled,
      open_from: open_from || null,
    },
  });

  const { data: checks } = await supabaseServer
    .from("eligibility_checks")
    .select("result")
    .eq("election_id", id);

  const total = checks?.length ?? 0;
  const eligible = checks?.filter((c) => c.result === "eligible").length ?? 0;
  const failed = total - eligible;

  return NextResponse.json({
    success: true,
    stats: { total, eligible, failed },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await getAdminSession();
  if (!session.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: checks } = await supabaseServer
    .from("eligibility_checks")
    .select("result")
    .eq("election_id", id);

  const total = checks?.length ?? 0;
  const eligible = checks?.filter((c) => c.result === "eligible").length ?? 0;
  const failed = total - eligible;

  return NextResponse.json({ stats: { total, eligible, failed } });
}
