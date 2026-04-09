"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useSession } from "next-auth/react";

function VerifySessionInner() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { data: session, status } = useSession();

  const [election, setElection] = useState<{
    title: string;
    session_verification_message: string;
    available_sessions: string[];
  } | null>(null);
  const [voter, setVoter] = useState<{
    full_name: string;
    student_id: string;
    level: string | null;
    programme: string | null;
  } | null>(null);
  const [selectedSession, setSelectedSession] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/election/${slug}/login`);
      return;
    }
    if (status === "authenticated") {
      loadData();
    }
  }, [status]);

  async function loadData() {
    try {
      const res = await fetch(`/api/election/verify-session/${slug}`);
      if (!res.ok) {
        router.replace(`/election/${slug}/login`);
        return;
      }
      const data = await res.json();

      // If session verification not enabled — skip straight to ballot
      if (!data.session_verification_enabled) {
        router.replace(`/election/${slug}/ballot`);
        return;
      }

      setElection(data.election);
      setVoter(data.voter);
    } catch {
      router.replace(`/election/${slug}/login`);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!selectedSession || verifying) return;
    setVerifying(true);
    try {
      const res = await fetch(`/api/election/verify-session/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_session: selectedSession }),
      });
      const data = await res.json();

      if (data.verified) {
        router.replace(`/election/${slug}/ballot`);
      } else {
        // Blocked — no retry allowed
        setBlocked(true);
        setBlockedMessage(
          data.message ||
            election?.session_verification_message ||
            "Your session could not be verified. Please visit the admin desk with your student ID or proof of registration.",
        );
      }
    } catch {
      setBlocked(true);
      setBlockedMessage(
        election?.session_verification_message ||
          "Your session could not be verified. Please visit the admin desk with your student ID or proof of registration.",
      );
    } finally {
      setVerifying(false);
    }
  }

  if (loading || status === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#000913" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #F9A825, #E65100)" }}
          >
            <ShieldCheck className="w-6 h-6" style={{ color: "#000913" }} />
          </div>
          <Loader2
            className="w-5 h-5 animate-spin"
            style={{ color: "#F9A825" }}
          />
        </div>
      </div>
    );
  }

  // ── Blocked state — NO retry allowed ─────────────────────────────
  if (blocked) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "#000913" }}
      >
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
            <span className="text-xs font-bold" style={{ color: "#F9A825" }}>
              OSEM Secure Vote
            </span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div
            className="w-full max-w-sm"
            style={{
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.4s ease",
            }}
          >
            {/* Icon */}
            <div className="text-center mb-8">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background: "rgba(220,38,38,0.15)",
                  border: "1px solid rgba(220,38,38,0.3)",
                }}
              >
                <AlertTriangle
                  className="w-8 h-8"
                  style={{ color: "#F87171" }}
                />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">
                Verification Failed
              </h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                {election?.title}
              </p>
            </div>

            {/* Admin message */}
            <div
              className="rounded-3xl p-6 mb-4"
              style={{
                background: "rgba(220,38,38,0.08)",
                border: "1px solid rgba(220,38,38,0.2)",
              }}
            >
              <p className="text-sm leading-relaxed text-white">
                {blockedMessage}
              </p>

              {/* Student details for admin reference */}
              {voter && (
                <div
                  className="mt-4 pt-4"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p
                    className="text-xs font-bold mb-2 uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    Your Details
                  </p>
                  <p className="text-sm font-bold text-white">
                    {voter.full_name}
                  </p>
                  <p
                    className="text-xs mt-0.5 font-mono"
                    style={{ color: "#F9A825" }}
                  >
                    ID: {voter.student_id}
                  </p>
                  {voter.level && (
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Level {voter.level}
                      {voter.programme ? ` · ${voter.programme}` : ""}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* No retry notice */}
            <div
              className="rounded-2xl p-4 text-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                This attempt has been logged. Please visit the admin desk for
                assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Session picker ────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#000913" }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

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
          <span className="text-xs font-bold" style={{ color: "#F9A825" }}>
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
          Step 2 of 3
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="w-full max-w-sm"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.5s ease",
          }}
        >
          {/* Welcome */}
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl font-black"
              style={{
                background: "linear-gradient(135deg, #F9A825, #E65100)",
                color: "#000913",
              }}
            >
              {voter?.full_name?.charAt(0) || "?"}
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Welcome, {voter?.full_name?.split(" ")[0]}
            </h1>
            {voter?.level && (
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                Level {voter.level}
                {voter.programme ? ` · ${voter.programme}` : ""}
              </p>
            )}
          </div>

          {/* Card */}
          <div
            className="rounded-3xl p-6"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <p className="text-sm font-bold text-white mb-1">
              Confirm Your Session
            </p>
            <p
              className="text-xs mb-6"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Select the session you are registered under to continue. You only
              get one attempt.
            </p>

            {/* Warning */}
            <div
              className="rounded-2xl p-3 mb-5 flex items-start gap-2"
              style={{
                background: "rgba(249,168,37,0.08)",
                border: "1px solid rgba(249,168,37,0.2)",
              }}
            >
              <AlertTriangle
                className="w-3.5 h-3.5 shrink-0 mt-0.5"
                style={{ color: "#F9A825" }}
              />
              <p className="text-xs" style={{ color: "rgba(249,168,37,0.8)" }}>
                Choose carefully. An incorrect selection will block your access
                and require admin verification.
              </p>
            </div>

            {/* Session options */}
            <div className="space-y-3 mb-6">
              {(
                election?.available_sessions || [
                  "Morning",
                  "Evening",
                  "Weekend",
                ]
              ).map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSession(s)}
                  className="w-full p-4 rounded-2xl text-left transition-all active:scale-98"
                  style={{
                    background:
                      selectedSession === s
                        ? "rgba(249,168,37,0.15)"
                        : "rgba(255,255,255,0.04)",
                    border:
                      selectedSession === s
                        ? "1px solid rgba(249,168,37,0.5)"
                        : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background:
                          selectedSession === s ? "#F9A825" : "transparent",
                        border:
                          selectedSession === s
                            ? "2px solid #F9A825"
                            : "2px solid rgba(255,255,255,0.2)",
                      }}
                    >
                      {selectedSession === s && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: "#000913" }}
                        />
                      )}
                    </div>
                    <span
                      className="text-sm font-semibold"
                      style={{
                        color:
                          selectedSession === s
                            ? "#F9A825"
                            : "rgba(255,255,255,0.7)",
                      }}
                    >
                      {s}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Confirm button */}
            <button
              onClick={handleVerify}
              disabled={!selectedSession || verifying}
              className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #F9A825, #E65100)",
                color: "#000913",
              }}
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Continue
                </>
              )}
            </button>
          </div>

          <p
            className="text-center text-xs mt-6"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            Your selection is logged for security and audit purposes.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifySessionPage() {
  return (
    <Suspense>
      <VerifySessionInner />
    </Suspense>
  );
}
