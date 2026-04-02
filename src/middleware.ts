import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin route protection ───────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const adminCookie = request.cookies.get("osem_admin_session");
    if (!adminCookie?.value) {
      return NextResponse.redirect(
        new URL("/admin/login?error=unauthorized", request.url),
      );
    }
  }

  // ── Student ballot protection ────────────────────────────────────
  const isProtectedStudentRoute =
    pathname.includes("/ballot") ||
    pathname.includes("/review") ||
    pathname.includes("/success");

  if (isProtectedStudentRoute) {
    const studentCookie = request.cookies.get("osem_vote_session");
    if (!studentCookie?.value) {
      const parts = pathname.split("/");
      const slugIndex = parts.indexOf("election") + 1;
      const slug = parts[slugIndex];
      return NextResponse.redirect(
        new URL(`/election/${slug}/login`, request.url),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
