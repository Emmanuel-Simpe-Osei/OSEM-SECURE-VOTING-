import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";
import { z } from "zod";

const addAdminSchema = z.object({
  email: z.string().email().min(5).max(255),
  role: z.enum(["admin", "super_admin"]),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: currentAdmin, error: roleError } = await supabaseServer
    .from("admin_users")
    .select("id, role")
    .eq("user_id", session.admin_id)
    .single();

  if (roleError || !currentAdmin) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (currentAdmin.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: admins, error } = await supabaseServer
    .from("admin_users")
    .select("id, user_id, email, role, is_active, created_at, last_login_at")
    .order("created_at");

  if (error || !admins) {
    return NextResponse.json({
      admins: [],
      current_admin_id: currentAdmin.id,
    });
  }

  const userIds = admins.map((a) => a.user_id);

  const { data: authData } = await supabaseServer
    .rpc("get_user_emails", { user_ids: userIds })
    .select();

  const emailMap: Record<string, string> = {};
  if (authData && Array.isArray(authData)) {
    authData.forEach((u: { id: string; email: string }) => {
      emailMap[u.id] = u.email;
    });
  }

  const enriched = admins.map((a) => ({
    ...a,
    email: a.email || emailMap[a.user_id] || a.user_id,
  }));

  return NextResponse.json({
    admins: enriched,
    current_admin_id: currentAdmin.id,
  });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: currentAdmin } = await supabaseServer
    .from("admin_users")
    .select("role")
    .eq("user_id", session.admin_id)
    .single();

  if (currentAdmin?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = addAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input." },
      { status: 400 },
    );
  }

  const { email, role } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  let userId: string;

  const { data: existingUsers } = await supabaseServer.auth.admin.listUsers();
  const existingAuthUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === normalizedEmail,
  );

  if (existingAuthUser) {
    userId = existingAuthUser.id;
  } else {
    const { data: newUser, error: createError } =
      await supabaseServer.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
      });

    if (createError || !newUser?.user) {
      return NextResponse.json(
        { error: "Failed to create user account." },
        { status: 500 },
      );
    }
    userId = newUser.user.id;
  }

  const { data: existingAdmin } = await supabaseServer
    .from("admin_users")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existingAdmin) {
    return NextResponse.json(
      { error: "This email is already an admin." },
      { status: 409 },
    );
  }

  const { error } = await supabaseServer.from("admin_users").insert({
    user_id: userId,
    role,
    is_active: true,
    email: normalizedEmail,
    full_name: normalizedEmail.split("@")[0],
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to add admin." },
      { status: 500 },
    );
  }

  await supabaseServer.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: session.admin_id,
    action: "ADMIN_ADDED",
    target_type: "admin_users",
    target_id: userId,
    metadata: { role },
    ip_hash: "admin-action",
  });

  return NextResponse.json({ success: true });
}
