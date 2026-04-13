import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { getClientIP } from "@/lib/utils/ip";
import { supabaseServer } from "@/lib/db/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface RateLimitConfig {
  prefix: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const ip = getClientIP(request) ?? "no-ip";
  const key = `rl:${config.prefix}:${ip}`;

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, config.windowSeconds);
    }

    const ttl = await redis.ttl(key);
    const remaining = Math.max(0, config.limit - count);
    const allowed = count <= config.limit;

    if (count === config.limit + 1) {
      await flagSuspiciousActivity(request, ip, config.prefix, count);
    }

    return {
      allowed,
      remaining,
      resetIn: ttl > 0 ? ttl : config.windowSeconds,
    };
  } catch {
    // Redis failure — fail CLOSED to protect the election
    // Better to block a request than allow unlimited attempts
    return { allowed: false, remaining: 0, resetIn: 60 };
  }
}

async function flagSuspiciousActivity(
  request: NextRequest,
  ip: string,
  action: string,
  attemptCount: number,
) {
  try {
    const userAgent = request.headers.get("user-agent") ?? "unknown";
    await supabaseServer.from("audit_logs").insert({
      actor_type: "system",
      actor_id: "rate_limiter",
      action: "RATE_LIMIT_EXCEEDED",
      target_type: "ip",
      target_id: ip.substring(0, 8) + "****",
      metadata: {
        prefix: action,
        attempt_count: attemptCount,
        user_agent: userAgent.substring(0, 200),
        path: request.nextUrl.pathname,
        flagged_at: new Date().toISOString(),
      },
      ip_hash: ip,
    });
  } catch {
    // Non-blocking
  }
}

export const RATE_LIMITS = {
  adminLogin: { prefix: "admin_login", limit: 5, windowSeconds: 900 },
  adminGoogleCallback: {
    prefix: "admin_google",
    limit: 10,
    windowSeconds: 300,
  },
  sessionVerify: { prefix: "session_verify", limit: 3, windowSeconds: 900 },
  eligibilityCheck: { prefix: "eligibility", limit: 3, windowSeconds: 900 },
  voteSubmit: { prefix: "vote_submit", limit: 5, windowSeconds: 300 },
} as const;

export function rateLimitResponse(result: RateLimitResult) {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please wait before trying again.",
      retry_after: result.resetIn,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.resetIn),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  );
}
