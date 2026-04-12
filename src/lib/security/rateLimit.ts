import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { getClientIP } from "@/lib/utils/ip";
import { supabaseServer } from "@/lib/db/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface RateLimitConfig {
  prefix: string; // e.g. "admin_login"
  limit: number; // max attempts
  windowSeconds: number; // sliding window in seconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // seconds until window resets
}

/**
 * Sliding window rate limiter using Upstash Redis.
 * Key: prefix:ip
 * Uses INCR + EXPIRE — atomic, fast, serverless-safe.
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const ip = getClientIP(request) ?? "no-ip";
  const key = `rl:${config.prefix}:${ip}`;

  try {
    // Increment counter
    const count = await redis.incr(key);

    // Set expiry only on first request in window
    if (count === 1) {
      await redis.expire(key, config.windowSeconds);
    }

    // Get TTL so we can report reset time
    const ttl = await redis.ttl(key);
    const remaining = Math.max(0, config.limit - count);
    const allowed = count <= config.limit;

    // If this is the threshold hit — flag it as suspicious
    if (count === config.limit + 1) {
      await flagSuspiciousActivity(request, ip, config.prefix, count);
    }

    return {
      allowed,
      remaining,
      resetIn: ttl > 0 ? ttl : config.windowSeconds,
    };
  } catch (err) {
    // Redis failure — fail open (allow request) to avoid blocking legit users
    // Log the failure but don't crash
    console.error("[rateLimit] Redis error — failing open:", err);
    return { allowed: true, remaining: 1, resetIn: 0 };
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
      target_id: ip.substring(0, 8) + "****", // partial IP for logs
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
    // Non-blocking — don't let logging failure affect the response
  }
}

// Pre-configured limiters for each endpoint
export const RATE_LIMITS = {
  adminLogin: {
    prefix: "admin_login",
    limit: 5,
    windowSeconds: 900, // 15 min
  },
  adminGoogleCallback: {
    prefix: "admin_google",
    limit: 10,
    windowSeconds: 300, // 5 min
  },
  sessionVerify: {
    prefix: "session_verify",
    limit: 3,
    windowSeconds: 900, // 15 min — strict, one attempt per student
  },
  eligibilityCheck: {
    prefix: "eligibility",
    limit: 3,
    windowSeconds: 900, // 15 min
  },
  voteSubmit: {
    prefix: "vote_submit",
    limit: 5,
    windowSeconds: 300, // 5 min
  },
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
