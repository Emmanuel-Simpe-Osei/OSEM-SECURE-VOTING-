"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
} from "lucide-react";
import { useSession, signIn } from "next-auth/react";

function EligibilityInner() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { data: googleSession, status } = useSession();

  const [step, setStep] = useState<"landing" | "session-pick" | "result">(
    "landing",
  );
  const [election, setElection] = useState<{
    title: string;
    id: string;
    session_verification_enabled: boolean;
    available_sessions: string[];
    not_eligible_message: string;
  } | null>(null);
  const [voter, setVoter] = useState<{
    full_name: string;
    student_id: string;
    level: string | null;
    programme: string | null;
    programme_session: string | null;
  } | null>(null);
  const [result, setResult] = useState<
    | "eligible"
    | "not_found"
    | "session_mismatch"
    | "already_checked"
    | "already_voted"
    | null
  >(null);
  const [selectedSession, setSelectedSession] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [mounted, setMounted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  // Countdown timer for success
  useEffect(() => {
    if (result === "eligible") {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.replace("/");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [result]);

  // When Google session is ready load election info
  useEffect(() => {
    if (status === "authenticated" && step === "landing") {
      loadElectionInfo();
    }
  }, [status]);

  async function loadElectionInfo() {
    setLoading(true);
    try {
      const res = await fetch(`/api/election/eligibility/${slug}`);
      if (!res.ok) {
        const data = await res.json();
        setErrorMessage(data.error || "Election not found.");
        return;
      }
      const data = await res.json();
      setElection(data.election);
      setVoter(data.voter);

      // If already checked — show result directly
      if (data.already_checked) {
        setResult(data.previous_result);
        setStep("result");
        return;
      }

      // If session verification enabled → go to session pick
      if (data.election.session_verification_enabled) {
        setStep("session-pick");
      } else {
        // No session check needed — submit check directly
        await submitCheck(null);
      }
    } catch {
      setErrorMessage("Failed to load election. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitCheck(session: string | null) {
    setChecking(true);
    try {
      const res = await fetch(`/api/election/eligibility/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_session: session }),
      });
      const data = await res.json();
      setResult(data.result);
      setErrorMessage(data.message || "");
      setStep("result");
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  function handleGoogleSignIn() {
    signIn("google", {
      callbackUrl: `/election/${slug}/eligibility`,
    });
  }

  if (loading) {
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
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            Checking your eligibility...
          </p>
        </div>
      </div>
    );
  }

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
        @keyframes countdown-ring {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: 283; }
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
            background: "rgba(96,165,250,0.1)",
            color: "#60A5FA",
            border: "1px solid rgba(96,165,250,0.2)",
          }}
        >
          Eligibility Check
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="w-full max-w-sm"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.5s ease",
          }}
        >
          {/* ── Step: Landing / Sign In ── */}
          {step === "landing" && (
            <>
              <div className="text-center mb-8">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: "linear-gradient(135deg, #F9A825, #E65100)",
                  }}
                >
                  <User className="w-8 h-8" style={{ color: "#000913" }} />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Eligibility Check
                </h1>
                <p
                  className="text-sm"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Verify your details before election day
                </p>
              </div>

              <div
                className="rounded-3xl p-6 mb-4"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {errorMessage ? (
                  <div
                    className="flex items-start gap-2.5 rounded-2xl p-3.5 mb-4"
                    style={{
                      background: "rgba(220,38,38,0.15)",
                      border: "1px solid rgba(220,38,38,0.3)",
                    }}
                  >
                    <AlertTriangle
                      className="w-4 h-4 shrink-0 mt-0.5"
                      style={{ color: "#FCA5A5" }}
                    />
                    <p className="text-xs" style={{ color: "#FCA5A5" }}>
                      {errorMessage}
                    </p>
                  </div>
                ) : null}

                <p className="text-sm font-bold text-white mb-2">
                  What this does
                </p>
                <div className="space-y-2 mb-6">
                  {[
                    "Confirms your name and student ID are in the system",
                    "Verifies your session matches our records",
                    "Tells you if you can vote on election day",
                    "Helps fix any issues before it's too late",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2
                        className="w-3.5 h-3.5 shrink-0 mt-0.5"
                        style={{ color: "#4ADE80" }}
                      />
                      <p
                        className="text-xs"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      >
                        {item}
                      </p>
                    </div>
                  ))}
                </div>

                {status === "authenticated" ? (
                  <button
                    onClick={loadElectionInfo}
                    disabled={loading}
                    className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, #F9A825, #E65100)",
                      color: "#000913",
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Check My Eligibility
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleGoogleSignIn}
                    className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 transition-all active:scale-95"
                    style={{
                      background: "#ffffff",
                      color: "#1f1f1f",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
                    }}
                  >
                    {/* Google icon */}
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
                    Sign in with Google to Check
                  </button>
                )}
              </div>

              <p
                className="text-center text-xs"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                This is not voting. No vote will be cast.
              </p>
            </>
          )}

          {/* ── Step: Session Picker ── */}
          {step === "session-pick" && (
            <>
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
                  Hi, {voter?.full_name?.split(" ")[0]}
                </h1>
                {voter?.level && (
                  <p
                    className="text-sm"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    Level {voter.level}
                    {voter.programme ? ` · ${voter.programme}` : ""}
                  </p>
                )}
              </div>

              <div
                className="rounded-3xl p-6"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-sm font-bold text-white mb-1">
                  Select Your Session
                </p>
                <p
                  className="text-xs mb-4"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  You only get one attempt. Choose carefully.
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
                  <p
                    className="text-xs"
                    style={{ color: "rgba(249,168,37,0.8)" }}
                  >
                    An incorrect selection will block further online checks.
                    Visit the admin desk to resolve issues.
                  </p>
                </div>

                {/* Sessions */}
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
                      className="w-full p-4 rounded-2xl text-left transition-all"
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

                <button
                  onClick={() => submitCheck(selectedSession)}
                  disabled={!selectedSession || checking}
                  className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, #F9A825, #E65100)",
                    color: "#000913",
                  }}
                >
                  {checking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm & Check
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── Step: Result ── */}
          {step === "result" && (
            <>
              {/* ELIGIBLE */}
              {result === "eligible" && (
                <>
                  <div className="text-center mb-6">
                    {/* Countdown ring */}
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      <svg
                        className="w-24 h-24 -rotate-90"
                        viewBox="0 0 100 100"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="rgba(74,222,128,0.15)"
                          strokeWidth="6"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="#4ADE80"
                          strokeWidth="6"
                          strokeDasharray="283"
                          strokeDashoffset={283 - (283 * countdown) / 10}
                          strokeLinecap="round"
                          style={{ transition: "stroke-dashoffset 1s linear" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CheckCircle2
                          className="w-10 h-10"
                          style={{ color: "#4ADE80" }}
                        />
                      </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                      You are Eligible! 🎉
                    </h1>
                    <p
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Page closes in {countdown} second
                      {countdown !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div
                    className="rounded-3xl p-6 mb-4"
                    style={{
                      background: "rgba(22,163,74,0.08)",
                      border: "1px solid rgba(22,163,74,0.25)",
                    }}
                  >
                    <p
                      className="text-xs font-bold mb-3 uppercase tracking-wide"
                      style={{ color: "#4ADE80" }}
                    >
                      Your Confirmed Details
                    </p>
                    <div className="space-y-2">
                      {[
                        { label: "Name", value: voter?.full_name },
                        { label: "Student ID", value: voter?.student_id },
                        { label: "Level", value: voter?.level },
                        { label: "Programme", value: voter?.programme },
                        { label: "Session", value: voter?.programme_session },
                        { label: "Election", value: election?.title },
                      ]
                        .filter((f) => f.value)
                        .map(({ label, value }) => (
                          <div
                            key={label}
                            className="flex items-start justify-between gap-4"
                          >
                            <span
                              className="text-xs shrink-0"
                              style={{ color: "rgba(255,255,255,0.4)" }}
                            >
                              {label}
                            </span>
                            <span className="text-xs font-semibold text-right text-white">
                              {value}
                            </span>
                          </div>
                        ))}
                    </div>

                    <div
                      className="mt-4 pt-4"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <p
                        className="text-xs text-center font-semibold"
                        style={{ color: "#4ADE80" }}
                      >
                        ✅ Your information is accurate. You can vote on
                        election day.
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div
                    className="w-full h-1 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width: `${countdown * 10}%`,
                        background: "#4ADE80",
                        transition: "width 1s linear",
                      }}
                    />
                  </div>
                  <p
                    className="text-center text-xs mt-2"
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  >
                    Redirecting to home in {countdown}s...
                  </p>
                </>
              )}

              {/* NOT FOUND */}
              {result === "not_found" && (
                <>
                  <div className="text-center mb-6">
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
                      Not Found
                    </h1>
                    <p
                      className="text-sm"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      {election?.title}
                    </p>
                  </div>
                  <div
                    className="rounded-3xl p-6 mb-4"
                    style={{
                      background: "rgba(220,38,38,0.08)",
                      border: "1px solid rgba(220,38,38,0.2)",
                    }}
                  >
                    <p className="text-sm leading-relaxed text-white mb-4">
                      {errorMessage}
                    </p>
                    <div
                      className="pt-4"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <p
                        className="text-xs font-bold mb-1"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        Your Email
                      </p>
                      <p
                        className="text-sm font-mono"
                        style={{ color: "#F9A825" }}
                      >
                        {googleSession?.user?.email}
                      </p>
                    </div>
                  </div>
                  <div
                    className="rounded-2xl p-4 text-center"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <p
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      This attempt has been logged. Please visit the admin desk
                      for assistance.
                    </p>
                  </div>
                </>
              )}

              {/* SESSION MISMATCH */}
              {result === "session_mismatch" && (
                <>
                  <div className="text-center mb-6">
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
                      Session Mismatch
                    </h1>
                    <p
                      className="text-sm"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      {election?.title}
                    </p>
                  </div>
                  <div
                    className="rounded-3xl p-6 mb-4"
                    style={{
                      background: "rgba(220,38,38,0.08)",
                      border: "1px solid rgba(220,38,38,0.2)",
                    }}
                  >
                    <p className="text-sm leading-relaxed text-white mb-4">
                      {errorMessage}
                    </p>
                    {voter && (
                      <div
                        className="pt-4"
                        style={{
                          borderTop: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <p
                          className="text-xs font-bold mb-2"
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
                      </div>
                    )}
                  </div>
                  <div
                    className="rounded-2xl p-4 text-center"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <p
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      This attempt has been logged. Please visit the admin desk
                      for assistance.
                    </p>
                  </div>
                </>
              )}

              {/* ALREADY CHECKED */}
              {result === "already_checked" && (
                <>
                  <div className="text-center mb-6">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{
                        background: "rgba(249,168,37,0.15)",
                        border: "1px solid rgba(249,168,37,0.3)",
                      }}
                    >
                      <Clock className="w-8 h-8" style={{ color: "#F9A825" }} />
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">
                      Already Checked
                    </h1>
                    <p
                      className="text-sm"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      {election?.title}
                    </p>
                  </div>
                  <div
                    className="rounded-3xl p-6"
                    style={{
                      background: "rgba(249,168,37,0.08)",
                      border: "1px solid rgba(249,168,37,0.2)",
                    }}
                  >
                    <p className="text-sm text-white leading-relaxed">
                      You have already completed your eligibility check. Each
                      student is allowed one check only.
                    </p>
                    <p
                      className="text-xs mt-3"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      If you believe there is an error with your details, please
                      visit the admin desk with your student ID or proof of
                      registration.
                    </p>
                  </div>
                </>
              )}

              {/* ALREADY VOTED */}
              {result === "already_voted" && (
                <>
                  <div className="text-center mb-6">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{
                        background: "rgba(22,163,74,0.15)",
                        border: "1px solid rgba(22,163,74,0.3)",
                      }}
                    >
                      <CheckCircle2
                        className="w-8 h-8"
                        style={{ color: "#4ADE80" }}
                      />
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">
                      Already Voted
                    </h1>
                  </div>
                  <div
                    className="rounded-3xl p-6"
                    style={{
                      background: "rgba(22,163,74,0.08)",
                      border: "1px solid rgba(22,163,74,0.2)",
                    }}
                  >
                    <p className="text-sm text-white">
                      You have already cast your vote in this election. Thank
                      you for participating.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EligibilityPage() {
  return (
    <Suspense>
      <EligibilityInner />
    </Suspense>
  );
}
