import { NextRequest } from "next/server";

export function getClientIP(request: NextRequest): string | null {
  // On Vercel, x-forwarded-for is set by Vercel infrastructure — safe to trust
  // On other platforms, validate your proxy setup before trusting this header
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP;

  // Return null — callers must handle missing IP explicitly
  // Never silently fall back to 127.0.0.1 in production
  return process.env.NODE_ENV === "development" ? "127.0.0.1" : null;
}
