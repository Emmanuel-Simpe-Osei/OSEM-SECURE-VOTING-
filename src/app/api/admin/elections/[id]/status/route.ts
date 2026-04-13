import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";
import { getSafeIPHash } from "@/lib/utils/ip";
import { z } from "zod";

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["scheduled"],
  scheduled: ["active", "draft"],
  active: ["paused", "closed"],
  paused: ["active", "closed"],
  closed: ["archived"],
  archived: [],
};

const statusSchema = z.object({
  status: z.enum([
    "draft",
    "scheduled",
    "active",
    "paused",
    "closed",
    "archived",
  ]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;

  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json(
      { error: "Invalid election ID." },
      { status: 400 },
    );
  }

  const ipHash = getSafeIPHash(request);
  const body = await request.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const newStatus = parsed.data.status;

  const { data: election } = await supabaseServer
    .from("elections")
    .select("status, created_by")
    .eq("id", id)
    .single();

  if (!election) {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }

  if (
    session.role !== "super_admin" &&
    election.created_by !== session.admin_id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowed = VALID_TRANSITIONS[election.status] || [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      {
        error: `Cannot change status from ${election.status} to ${newStatus}.`,
      },
      { status: 400 },
    );
  }

  const { error } = await supabaseServer
    .from("elections")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update status." },
      { status: 500 },
    );
  }

  await supabaseServer.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: session.admin_id,
    action: "ELECTION_STATUS_CHANGED",
    target_type: "election",
    target_id: id,
    metadata: { from: election.status, to: newStatus },
    ip_hash: ipHash,
  });

  return NextResponse.json({ success: true, status: newStatus });
}
