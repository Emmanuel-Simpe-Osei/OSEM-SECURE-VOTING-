import { NextRequest, NextResponse } from "next/server";

function getSessionCookie(
  request: NextRequest,
  cookieName: string,
): string | undefined {
  return request.cookies.get(cookieName)?.value;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin route protection ───────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const adminCookie = getSessionCookie(request, "osem_admin_session");

    if (!adminCookie) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // ── Student ballot protection ────────────────────────────────────
  const isProtectedStudentRoute =
    pathname.includes("/ballot") ||
    pathname.includes("/review") ||
    pathname.includes("/success");

  if (isProtectedStudentRoute) {
    const studentCookie = getSessionCookie(request, "osem_vote_session");

    if (!studentCookie) {
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
