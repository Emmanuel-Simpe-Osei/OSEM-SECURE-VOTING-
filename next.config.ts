import type { NextConfig } from "next";

// Derive the Supabase origin once at startup for use in CSP
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
let supabaseOrigin = "https://*.supabase.co";
if (supabaseUrl) {
  try {
    supabaseOrigin = new URL(supabaseUrl).origin;
  } catch {
    // fall back to wildcard
  }
}

const csp = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for hydration scripts
  "script-src 'self' 'unsafe-inline'",
  // Tailwind and component libraries use inline styles
  "style-src 'self' 'unsafe-inline'",
  // Supabase Storage for candidate photos; data:/blob: for canvas/previews
  `img-src 'self' data: blob: ${supabaseOrigin}`,
  "font-src 'self' data:",
  // API calls to Supabase (HTTP + WebSocket) and Google OAuth
  [
    "connect-src 'self'",
    supabaseOrigin,
    supabaseOrigin.replace("https://", "wss://"),
    "https://accounts.google.com",
    "https://oauth2.googleapis.com",
    "https://www.googleapis.com",
  ].join(" "),
  // No plugins, no framing, no external form targets
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
]
  .map((d) => d.trim())
  .join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
