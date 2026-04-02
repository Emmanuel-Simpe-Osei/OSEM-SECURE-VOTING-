import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/server";
import { getAdminSession } from "@/lib/auth/session";
import { generateToken } from "@/lib/security/hash";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;

    // Check email is in admin whitelist
    const allowedEmails = (process.env.ADMIN_ALLOWED_EMAILS || "")
      .split(",")
      .map((e) => e.trim());

    console.log("[admin/login] allowedEmails:", allowedEmails);
    console.log("[admin/login] email:", email);
    console.log("[admin/login] is allowed:", allowedEmails.includes(email));

    if (!allowedEmails.includes(email)) {
      await supabaseServer.from("audit_logs").insert({
        actor_type: "system",
        actor_id: "unknown",
        action: "ADMIN_LOGIN_UNAUTHORIZED",
        target_type: "admin",
        target_id: email,
        metadata: { email },
        ip_hash: "server-side",
      });
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 },
      );
    }

    // Verify with Supabase Auth
    const { data: authData, error: authError } =
      await supabaseServer.auth.signInWithPassword({
        email,
        password,
      });

    console.log("[admin/login] authError:", authError);
    console.log("[admin/login] authData user id:", authData?.user?.id);

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 },
      );
    }

    // Check admin_users table
    const { data: adminUser, error: adminError } = await supabaseServer
      .from("admin_users")
      .select("id, role, is_active")
      .eq("user_id", authData.user.id)
      .single();

    console.log("[admin/login] adminError:", adminError);
    console.log("[admin/login] adminUser:", adminUser);

    if (!adminUser || !adminUser.is_active) {
      return NextResponse.json(
        { error: "Admin account not found or inactive." },
        { status: 401 },
      );
    }

    // Create admin session
    const session = await getAdminSession();
    session.admin_id = authData.user.id;
    session.email = email;
    session.role = adminUser.role;
    session.session_id = generateToken(16);
    await session.save();

    // Write audit log
    await supabaseServer.from("audit_logs").insert({
      actor_type: "admin",
      actor_id: authData.user.id,
      action: "ADMIN_LOGIN_SUCCESS",
      target_type: "admin",
      target_id: authData.user.id,
      metadata: { email, role: adminUser.role },
      ip_hash: "server-side",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/auth/login] unexpected error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
