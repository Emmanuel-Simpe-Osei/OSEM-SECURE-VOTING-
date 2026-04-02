import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Production guard ───────────────────────────────────────────────
// In production, Redis MUST be configured — no silent bypass allowed
if (
  process.env.NODE_ENV === "production" &&
  !process.env.UPSTASH_REDIS_REST_URL
) {
  throw new Error(
    "UPSTASH_REDIS_REST_URL is required in production. " +
      "Rate limiting cannot be disabled on a live election system.",
  );
}

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// OTP request limiter — 3 per student per 15 minutes
export const otpRequestLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "15 m"),
      prefix: "osem:otp_request",
    })
  : null;

// OTP verify limiter — 5 attempts per student per 15 minutes
export const otpVerifyLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: "osem:otp_verify",
    })
  : null;

// Vote submit limiter — 2 attempts per student per 5 minutes
export const voteSubmitLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(2, "5 m"),
      prefix: "osem:vote_submit",
    })
  : null;

// ── Normalise rate limit key ───────────────────────────────────────
// Ensures consistent key format regardless of what the caller passes
// Strips whitespace, lowercases, removes special characters
function normaliseKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_:\-\.]/g, "_");
}

// ── Generic rate limit checker ────────────────────────────────────
export async function checkRateLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<{ allowed: boolean; remaining: number }> {
  // Dev mode — no Redis configured, allow all requests
  if (!limiter) {
    console.warn(
      "[RATE LIMIT] Running without Redis — all requests allowed. OK in dev only.",
    );
    return { allowed: true, remaining: 999 };
  }

  const normalisedKey = normaliseKey(key);
  const result = await limiter.limit(normalisedKey);
  return { allowed: result.success, remaining: result.remaining };
}
