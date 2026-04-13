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

// Check if we're in development mode
const isDev = process.env.NODE_ENV === "development";

// Log to confirm config is loaded (check terminal when running npm run dev)
console.log("=== CSP CONFIG LOADED ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("isDev:", isDev);

const csp = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for hydration scripts
  // Add 'unsafe-eval' for development (Turbopack requires it)
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com"
    : "script-src 'self' 'unsafe-inline' https://accounts.google.com",
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
  // Google OAuth needs framing for popup/redirect
  "frame-src 'self' https://accounts.google.com",
  // No plugins
  "object-src 'none'",
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
