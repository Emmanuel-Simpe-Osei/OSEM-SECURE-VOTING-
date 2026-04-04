import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Allow rate limiting to be disabled when Redis is not configured
// This is acceptable for initial deployment — add Upstash before scaling
const isRedisConfigured =
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_URL.trim() !== "" &&
  process.env.UPSTASH_REDIS_REST_TOKEN &&
  process.env.UPSTASH_REDIS_REST_TOKEN.trim() !== "";

let redis: Redis | null = null;

if (isRedisConfigured) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

function createLimiter(requests: number, window: string) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      requests,
      window as `${number} ${"ms" | "s" | "m" | "h" | "d"}`,
    ),
  });
}

export const otpRequestLimiter = createLimiter(3, "1 m");
export const otpVerifyLimiter = createLimiter(5, "15 m");
export const voteSubmitLimiter = createLimiter(3, "1 h");

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<{ success: boolean; remaining?: number }> {
  // If Redis not configured — allow all requests
  // Add Upstash Redis before running a real election at scale
  if (!limiter) {
    return { success: true, remaining: 999 };
  }

  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
  };
}
