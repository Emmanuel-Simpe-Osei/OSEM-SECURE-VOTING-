import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/server";
import { getAdminSession } from "@/lib/auth/session";
import { generateToken } from "@/lib/security/hash";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const returnedState = searchParams.get("state");

  // Verify state
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
    const redirectUri = `${process.env.APP_BASE_URL}/api/admin/auth/google-callback`;

    // Exchange code for tokens
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

    // Get user info
    const userRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
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
      return NextResponse.redirect(
        new URL("/admin/login?error=not_admin", request.url),
      );
    }

    // Check admin_users table
    const { data: adminUser } = await supabaseServer
      .from("admin_users")
      .select("id, role, is_active")
      .eq("user_id", authUser.id)
      .single();

    if (!adminUser || !adminUser.is_active) {
      return NextResponse.redirect(
        new URL("/admin/login?error=not_admin", request.url),
      );
    }

    // Create admin iron-session
    const session = await getAdminSession();
    session.admin_id = authUser.id;
    session.email = email;
    session.role = adminUser.role;
    session.session_id = generateToken(16);
    await session.save();

    // Update last login
    await supabaseServer
      .from("admin_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("user_id", authUser.id);

    // Audit log
    await supabaseServer.from("audit_logs").insert({
      actor_type: "admin",
      actor_id: authUser.id,
      action: "ADMIN_LOGIN_GOOGLE",
      target_type: "admin",
      target_id: authUser.id,
      metadata: { email, role: adminUser.role, method: "google_oauth" },
      ip_hash: "server-side",
    });

    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  } catch (err) {
    console.error("[admin/google-callback]", err);
    return NextResponse.redirect(
      new URL("/admin/login?error=google_failed", request.url),
    );
  }
}
