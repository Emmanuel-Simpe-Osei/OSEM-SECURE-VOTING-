import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";
import { z } from "zod";

const UUID = z.uuid();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid election ID." }, { status: 400 });
  }

  const { data: election } = await supabaseServer
    .from("elections")
    .select("status, created_by")
    .eq("id", id)
    .single();

  if (!election) {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }

  if (session.role !== "super_admin" && election.created_by !== session.admin_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (election.status !== "closed") {
    return NextResponse.json(
      { error: "Results can only be published for closed elections." },
      { status: 400 },
    );
  }

  const { error } = await supabaseServer
    .from("elections")
    .update({ results_visibility: "public_after_close" })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to publish results." },
      { status: 500 },
    );
  }

  await supabaseServer.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: session.admin_id,
    action: "RESULTS_PUBLISHED",
    target_type: "election",
    target_id: id,
    metadata: { published_at: new Date().toISOString() },
    ip_hash: "server-side",
  });

  return NextResponse.json({ success: true });
}
