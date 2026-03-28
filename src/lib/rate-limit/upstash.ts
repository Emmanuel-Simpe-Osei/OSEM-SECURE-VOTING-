import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Only initialise if env vars are present
// During local dev without Upstash, we skip rate limiting
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

// Generic rate limit checker — returns true if allowed, false if blocked
export async function checkRateLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<{ allowed: boolean; remaining: number }> {
  if (!limiter) return { allowed: true, remaining: 999 }; // Dev mode — no Redis
  const result = await limiter.limit(key);
  return { allowed: result.success, remaining: result.remaining };
}
