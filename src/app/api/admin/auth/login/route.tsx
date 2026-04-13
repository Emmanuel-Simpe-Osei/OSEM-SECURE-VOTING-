import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/server";
import { getAdminSession } from "@/lib/auth/session";
import { generateToken } from "@/lib/security/hash";
import { getSafeIPHash } from "@/lib/utils/ip";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/security/rateLimit";
import { z } from "zod";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(request, RATE_LIMITS.adminLogin);
  if (!rl.allowed) return rateLimitResponse(rl);

  const ipHash = getSafeIPHash(request);

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

    const { data: authData, error: authError } =
      await supabaseServer.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      await supabaseServer.from("audit_logs").insert({
        actor_type: "system",
        actor_id: "unknown",
        action: "ADMIN_LOGIN_FAILED",
        target_type: "admin",
        target_id: email,
        metadata: { reason: "invalid_credentials" },
        ip_hash: ipHash,
      });
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 },
      );
    }

    const { data: adminUser } = await supabaseServer
      .from("admin_users")
      .select("id, role, is_active")
      .eq("user_id", authData.user.id)
      .single();

    if (!adminUser || !adminUser.is_active) {
      await supabaseServer.from("audit_logs").insert({
        actor_type: "system",
        actor_id: "unknown",
        action: "ADMIN_LOGIN_UNAUTHORIZED",
        target_type: "admin",
        target_id: "redacted",
        metadata: { reason: "account_inactive_or_not_found" },
        ip_hash: ipHash,
      });
      return NextResponse.json(
        { error: "Admin account not found or inactive." },
        { status: 401 },
      );
    }

    const session = await getAdminSession();
    session.admin_id = authData.user.id;
    session.email = email;
    session.role = adminUser.role;
    session.session_id = generateToken(16);
    await session.save();

    await supabaseServer
      .from("admin_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("user_id", authData.user.id);

    await supabaseServer.from("audit_logs").insert({
      actor_type: "admin",
      actor_id: authData.user.id,
      action: "ADMIN_LOGIN_SUCCESS",
      target_type: "admin",
      target_id: authData.user.id,
      metadata: { role: adminUser.role },
      ip_hash: ipHash,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
