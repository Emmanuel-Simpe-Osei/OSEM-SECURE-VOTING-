import { NextRequest } from "next/server";
import { hashIP } from "@/lib/security/hash";

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
  return process.env.NODE_ENV === "development" ? "127.0.0.1" : null;
}

// Safe IP hash — handles null IP gracefully
// Use this everywhere instead of hashIP(getClientIP()) directly
export function getSafeIPHash(request: NextRequest): string {
  const ip = getClientIP(request);
  if (!ip) return "unknown";
  return hashIP(ip);
}

// Safe rate limit key from IP — handles null
// Returns a fallback key so rate limiting still applies
export function getIPRateLimitKey(
  request: NextRequest,
  prefix: string,
): string {
  const ip = getClientIP(request);
  // If IP is null, use 'no-ip' — still rate limited, just grouped together
  // This is intentionally strict — unknown IP gets limited as one entity
  return `${prefix}:${ip ?? "no-ip"}`;
}
