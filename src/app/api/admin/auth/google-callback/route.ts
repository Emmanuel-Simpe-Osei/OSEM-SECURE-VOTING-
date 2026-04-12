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
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  // Rate limit — 10 attempts per IP per 5 min
  const rl = await checkRateLimit(request, RATE_LIMITS.adminGoogleCallback);
  if (!rl.allowed) {
    // Can't return JSON here — this is a redirect endpoint
    // Redirect to login with error instead
    return NextResponse.redirect(
      new URL("/admin/login?error=too_many_requests", request.url),
    );
  }

  const ipHash = getSafeIPHash(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const returnedState = searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  cookieStore.delete("oauth_state");

  if (!storedState || storedState !== returnedState) {
    return NextResponse.redirect(
      new URL("/admin/login?error=invalid_state", request.url),
    );
  }

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/admin/login?error=google_failed", request.url),
    );
  }

  try {
    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/admin/auth/google-callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL("/admin/login?error=google_failed", request.url),
      );
    }

    const userRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );

    const googleUser = await userRes.json();
    const email = googleUser.email?.toLowerCase();

    if (!email) {
      return NextResponse.redirect(
        new URL("/admin/login?error=google_failed", request.url),
      );
    }

    // Find user in Supabase Auth
    const { data: authUsers } = await supabaseServer.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email,
    );

    if (!authUser) {
      await supabaseServer.from("audit_logs").insert({
        actor_type: "system",
        actor_id: "unknown",
        action: "ADMIN_LOGIN_GOOGLE_NOT_FOUND",
        target_type: "admin",
        target_id: email,
        metadata: { email },
        ip_hash: ipHash,
      });
      return NextResponse.redirect(
        new URL("/admin/login?error=not_admin", request.url),
      );
    }

    const { data: adminUser } = await supabaseServer
      .from("admin_users")
      .select("id, role, is_active")
      .eq("user_id", authUser.id)
      .single();

    if (!adminUser || !adminUser.is_active) {
      await supabaseServer.from("audit_logs").insert({
        actor_type: "system",
        actor_id: authUser.id,
        action: "ADMIN_LOGIN_GOOGLE_UNAUTHORIZED",
        target_type: "admin",
        target_id: email,
        metadata: { email, is_active: adminUser?.is_active },
        ip_hash: ipHash,
      });
      return NextResponse.redirect(
        new URL("/admin/login?error=not_admin", request.url),
      );
    }

    const session = await getAdminSession();
    session.admin_id = authUser.id;
    session.email = email;
    session.role = adminUser.role;
    session.session_id = generateToken(16);
    await session.save();

    await supabaseServer
      .from("admin_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("user_id", authUser.id);

    await supabaseServer.from("audit_logs").insert({
      actor_type: "admin",
      actor_id: authUser.id,
      action: "ADMIN_LOGIN_GOOGLE",
      target_type: "admin",
      target_id: authUser.id,
      metadata: { email, role: adminUser.role, method: "google_oauth" },
      ip_hash: ipHash,
    });

    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  } catch (err) {
    console.error("[admin/google-callback]", err);
    return NextResponse.redirect(
      new URL("/admin/login?error=google_failed", request.url),
    );
  }
}
