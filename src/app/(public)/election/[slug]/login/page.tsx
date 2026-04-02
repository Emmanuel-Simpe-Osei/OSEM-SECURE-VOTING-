"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleSignIn() {
    setLoading(true);
    setError("");

    try {
      // Store slug in sessionStorage so verify-eligibility can use it
      sessionStorage.setItem("election_slug", slug);

      await signIn("google", {
        callbackUrl: `/election/${slug}/verify-eligibility`,
      });
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#F4F4F4" }}
    >
      {/* Ambient blobs */}
      <div
        className="fixed inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "#00004E" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "#FFB606" }}
        />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
            style={{ background: "#00004E" }}
          >
            <ShieldCheck className="w-7 h-7" style={{ color: "#FFB606" }} />
          </div>
          <p
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "#00004E" }}
          >
            OSEM Technologies
          </p>
          <h1
            className="text-2xl font-bold mt-1 tracking-tight"
            style={{ color: "#1F2937" }}
          >
            Secure Vote
          </h1>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8 shadow-xl"
          style={{ background: "#ffffff", border: "1px solid #e8e8e8" }}
        >
          <h2 className="text-xl font-bold mb-1" style={{ color: "#1F2937" }}>
            Voter sign-in
          </h2>
          <p className="text-sm mb-8" style={{ color: "#6B7280" }}>
            Sign in with your university Google account to access your ballot.
          </p>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2.5 rounded-2xl p-3.5 mb-4"
              style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
            >
              <AlertCircle
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: "#DC2626" }}
              />
              <p className="text-xs" style={{ color: "#DC2626" }}>
                {error}
              </p>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "#ffffff",
              border: "2px solid #E5E7EB",
              color: "#1F2937",
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                {/* Google Icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          {/* Domain restriction notice */}
          <div
            className="mt-4 rounded-2xl p-3.5"
            style={{ background: "#F0F4FF", border: "1px solid #C7D7FF" }}
          >
            <p className="text-xs text-center" style={{ color: "#1F2937" }}>
              Only <span className="font-semibold">@upsamail.edu.gh</span>{" "}
              accounts are accepted
            </p>
          </div>

          <div className="my-5 h-px" style={{ background: "#F3F4F6" }} />

          <p className="text-xs text-center" style={{ color: "#9CA3AF" }}>
            Issues signing in? Contact your department administrator.
          </p>
        </div>

        {/* Bottom tag */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#16A34A" }}
          />
          <p className="text-xs" style={{ color: "#6B7280" }}>
            Secured with encryption · Powered by{" "}
            <span className="font-semibold" style={{ color: "#00004E" }}>
              OSEM Technologies
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
