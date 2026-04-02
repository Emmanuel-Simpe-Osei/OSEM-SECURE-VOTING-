"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ShieldCheck, AlertCircle, Loader2, WifiOff } from "lucide-react";

function useNetwork() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function LoginPageInner() {
  const params = useParams();
  const slug = params.slug as string;
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    const err = searchParams.get("error");
    if (err === "auth_failed")
      return "Authentication failed. Please try again.";
    if (err === "not_eligible")
      return "You are not eligible to vote in this election.";
    if (err === "election_not_active")
      return "This election is not currently active.";
    if (err === "invalid_domain")
      return "Only @upsamail.edu.gh accounts are accepted.";
    if (err === "OAuthCallback")
      return "Sign-in was interrupted. Please try again.";
    if (err === "already_voted")
      return "You have already voted in this election.";
    return "";
  });
  const [mounted, setMounted] = useState(false);
  const online = useNetwork();

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  async function handleGoogleSignIn() {
    if (!online) return;
    setLoading(true);
    setError("");
    try {
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
      className="min-h-screen flex flex-col"
      style={{ background: "#0B1E35" }}
    >
      {/* Network banner */}
      {!online && (
        <div
          className="w-full py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-semibold"
          style={{ background: "#DC2626", color: "#ffffff" }}
        >
          <WifiOff className="w-3.5 h-3.5" />
          No internet connection — please check your network
        </div>
      )}

      {/* Header */}
      <div
        className="w-full px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(249,168,37,0.15)",
              border: "1px solid rgba(249,168,37,0.3)",
            }}
          >
            <ShieldCheck className="w-4 h-4" style={{ color: "#F9A825" }} />
          </div>
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: "#F9A825" }}
          >
            OSEM Secure Vote
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: online ? "#16A34A" : "#DC2626" }}
          />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            {online ? "Secured" : "Offline"}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="w-full max-w-sm transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
          }}
        >
          {/* Logo */}
          <div className="text-center mb-10">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-2xl"
              style={{
                background: "linear-gradient(135deg, #F9A825, #E65100)",
                boxShadow: "0 20px 40px rgba(249,168,37,0.3)",
              }}
            >
              <ShieldCheck className="w-8 h-8" style={{ color: "#0B1E35" }} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
              Secure Vote
            </h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              OSEM Technologies
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-3xl p-8"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(20px)",
            }}
          >
            <h2 className="text-xl font-bold text-white mb-1">Voter sign-in</h2>
            <p
              className="text-sm mb-8"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Sign in with your university Google account to access your ballot.
            </p>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-2.5 rounded-2xl p-3.5 mb-5"
                style={{
                  background: "rgba(220,38,38,0.15)",
                  border: "1px solid rgba(220,38,38,0.3)",
                }}
              >
                <AlertCircle
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: "#FCA5A5" }}
                />
                <p className="text-xs" style={{ color: "#FCA5A5" }}>
                  {error}
                </p>
              </div>
            )}

            {/* Google button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading || !online}
              className="w-full py-4 px-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              style={{ background: "#ffffff", color: "#1F2937" }}
            >
              {loading ? (
                <>
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    style={{ color: "#6B7280" }}
                  />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                  <span>Sign in with Google</span>
                </>
              )}
            </button>

            {/* Domain notice */}
            <div
              className="mt-4 rounded-2xl p-3.5 text-center"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Only{" "}
                <span
                  className="font-bold"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                >
                  @upsamail.edu.gh
                </span>{" "}
                accounts accepted
              </p>
            </div>
          </div>

          <p
            className="text-center text-xs mt-6"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            Issues signing in? Contact your department administrator.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div
        className="w-full px-6 py-4 flex items-center justify-center gap-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "#16A34A" }}
        />
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          End-to-end secured · Powered by{" "}
          <span
            className="font-semibold"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            OSEM Technologies
          </span>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
