import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    await session.destroy();
  } catch {
    // Session already invalid — still return success
  }

  const response = NextResponse.json({ success: true });
  
  // Explicitly clear the cookie
  response.cookies.set("osem_admin_session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
