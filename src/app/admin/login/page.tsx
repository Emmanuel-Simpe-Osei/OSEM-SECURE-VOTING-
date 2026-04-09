"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldCheck, AlertCircle, Loader2, WifiOff, Lock } from "lucide-react";

function useNetwork() {
  const [online, setOnline] = useState(() => navigator.onLine);
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AdminLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const online = useNetwork();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [error, setError] = useState(() => {
    const err = searchParams.get("error");
    if (err === "unauthorized")
      return "You are not authorised to access the admin panel.";
    if (err === "session_expired")
      return "Your session has expired. Please sign in again.";
    if (err === "not_admin")
      return "This Google account is not registered as an admin.";
    if (err === "google_failed")
      return "Google sign in failed. Please try again.";
    return "";
  });

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  async function handleGoogleLogin() {
    if (!online) return;
    setGoogleLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth/google-url");
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      setError("Google sign in failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!online) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }
      router.replace("/admin/dashboard");
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0B1E35" }}
    >
      <style>{`
        @keyframes breathe {
          0%, 100% { box-shadow: 0 20px 40px rgba(249,168,37,0.3); }
          50% { box-shadow: 0 20px 60px rgba(249,168,37,0.5); }
        }
        .logo-breathe { animation: breathe 3s ease-in-out infinite; }
      `}</style>

      {/* Network banner */}
      {!online && (
        <div
          className="w-full py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-semibold"
          style={{ background: "#DC2626", color: "#ffffff" }}
        >
          <WifiOff className="w-3.5 h-3.5" />
          No internet connection
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
        <div
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{
            background: "rgba(249,168,37,0.1)",
            color: "#F9A825",
            border: "1px solid rgba(249,168,37,0.2)",
          }}
        >
          Admin Portal
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="w-full max-w-sm"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.6s ease",
          }}
        >
          {/* Logo */}
          <div className="text-center mb-10">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 logo-breathe"
              style={{
                background: "linear-gradient(135deg, #F9A825, #E65100)",
              }}
            >
              <Lock className="w-7 h-7" style={{ color: "#0B1E35" }} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
              Admin Login
            </h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              OSEM Technologies · Restricted Access
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-3xl p-8"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-2.5 rounded-2xl p-3.5 mb-6"
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

            {/* Google Sign In — PRIMARY */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || !online}
              className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed mb-4"
              style={{
                background: "#ffffff",
                color: "#1f1f1f",
                boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
              }}
            >
              {googleLoading ? (
                <Loader2
                  className="w-4 h-4 animate-spin"
                  style={{ color: "#1f1f1f" }}
                />
              ) : (
                <GoogleIcon />
              )}
              {googleLoading
                ? "Redirecting to Google..."
                : "Sign in with Google"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex-1 h-px"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                or
              </span>
              <div
                className="flex-1 h-px"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
            </div>

            {/* Password login */}
            {!showPasswordForm ? (
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                Sign in with Email & Password
              </button>
            ) : (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label
                    className="block text-xs font-bold mb-2 uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@osemtech.com"
                    required
                    disabled={loading}
                    autoFocus
                    className="w-full px-4 py-3.5 rounded-2xl text-sm font-medium outline-none transition-all disabled:opacity-50"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#ffffff",
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-bold mb-2 uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm font-medium outline-none transition-all disabled:opacity-50"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#ffffff",
                    }}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setEmail("");
                      setPassword("");
                      setError("");
                    }}
                    className="px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !online || !email || !password}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                    style={{
                      background: "linear-gradient(135deg, #F9A825, #E65100)",
                      color: "#0B1E35",
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Sign In
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          <p
            className="text-center text-xs mt-6"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            Unauthorised access attempts are logged and reported.
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
          Secured · Powered by{" "}
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

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginInner />
    </Suspense>
  );
}
