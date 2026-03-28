import crypto from "crypto";

// Dedicated hash salt — separate from session secret
// Add HASH_SALT to your .env.local
const HASH_SALT = process.env.HASH_SALT!;

if (!HASH_SALT || HASH_SALT.length < 32) {
  throw new Error("HASH_SALT must be at least 32 characters");
}

// Hash an IP address using HMAC — salted, not reversible
export function hashIP(ip: string): string {
  return crypto.createHmac("sha256", HASH_SALT).update(ip).digest("hex");
}

// Hash any value with HMAC
export function hashWithSalt(value: string, salt: string): string {
  return crypto.createHmac("sha256", salt).update(value).digest("hex");
}

// Generate a cryptographically secure random token
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

// Generate a secure 6-digit OTP
export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// Generate a readable 8-character confirmation code
export function generateConfirmationCode(): string {
  return crypto.randomBytes(6).toString("hex").toUpperCase().substring(0, 8);
}
