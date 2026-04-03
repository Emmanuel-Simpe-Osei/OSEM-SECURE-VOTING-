"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldCheck, AlertCircle, Loader2, WifiOff, Lock } from "lucide-react";

function useNetwork() {
  const [online, setOnline] = useState(true);
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

function AdminLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const online = useNetwork();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(() => {
    const err = searchParams.get("error");
    if (err === "unauthorized")
      return "You are not authorised to access the admin panel.";
    if (err === "session_expired")
      return "Your session has expired. Please sign in again.";
    return "";
  });

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  async function handleLogin(e: React.FormEvent) {
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
          className="w-full max-w-sm transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
          }}
        >
          {/* Logo */}
          <div className="text-center mb-10">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{
                background: "linear-gradient(135deg, #F9A825, #E65100)",
                boxShadow: "0 20px 40px rgba(249,168,37,0.3)",
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

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
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
                  className="w-full px-4 py-3.5 rounded-2xl text-sm font-medium outline-none transition-all disabled:opacity-50"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#ffffff",
                  }}
                />
              </div>

              {/* Password */}
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

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !online || !email || !password}
                className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
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
                    Sign In to Admin Panel
                  </>
                )}
              </button>
            </form>
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
