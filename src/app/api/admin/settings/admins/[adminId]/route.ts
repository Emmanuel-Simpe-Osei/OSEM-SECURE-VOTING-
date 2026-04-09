import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> },
) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { adminId } = await params;

  // ✅ Query by user_id
  const { data: currentAdmin } = await supabaseServer
    .from("admin_users")
    .select("id, role")
    .eq("user_id", session.admin_id)
    .single();

  if (currentAdmin?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cannot remove yourself — compare admin_users.id
  if (adminId === currentAdmin.id) {
    return NextResponse.json(
      { error: "You cannot remove yourself." },
      { status: 400 },
    );
  }

  const { error } = await supabaseServer
    .from("admin_users")
    .delete()
    .eq("id", adminId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to remove admin." },
      { status: 500 },
    );
  }

  await supabaseServer.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: session.admin_id,
    action: "ADMIN_REMOVED",
    target_type: "admin_users",
    target_id: adminId,
    metadata: {},
    ip_hash: "admin-action",
  });

  return NextResponse.json({ success: true });
}
