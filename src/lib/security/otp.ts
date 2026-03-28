import crypto from "crypto";

// Dedicated OTP salt — completely separate from SESSION_SECRET
// Rotating SESSION_SECRET will NOT invalidate pending OTPs
const OTP_SALT = process.env.OTP_SALT!;

if (!OTP_SALT || OTP_SALT.length < 32) {
  throw new Error("OTP_SALT must be at least 32 characters");
}

// Hash OTP before storing — never store plain OTP
export function hashOTP(otp: string): string {
  return crypto.createHmac("sha256", OTP_SALT).update(otp).digest("hex");
}

// Verify submitted OTP against stored hash using timing-safe comparison
export function verifyOTP(submitted: string, storedHash: string): boolean {
  const submittedHash = hashOTP(submitted);
  const a = Buffer.from(submittedHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Note: one-time-use enforcement (used_at check) happens in the
// database RPC — not here. This file only handles hashing and verification.
