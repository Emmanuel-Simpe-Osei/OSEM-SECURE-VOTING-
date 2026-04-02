"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  AlertCircle,
  User,
  WifiOff,
  Copy,
  Check,
} from "lucide-react";

interface Candidate {
  id: string;
  full_name: string;
  bio: string | null;
  photo_url: string | null;
  sort_order: number;
}

interface Position {
  id: string;
  name: string;
  description: string | null;
  max_votes: number;
  sort_order: number;
  candidates: Candidate[];
}

interface BallotData {
  election: { id: string; title: string; slug: string };
  voter: { full_name: string };
  positions: Position[];
  token: string;
}

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

export default function BallotPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const online = useNetwork();

  const [ballot, setBallot] = useState<BallotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [voteSelections, setVoteSelections] = useState<
    { position: string; candidate: string }[]
  >([]);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [animKey, setAnimKey] = useState(0);

  const totalPositions = ballot?.positions.length || 0;
  const isReviewStep = currentStep === totalPositions;
  const currentPosition = ballot?.positions[currentStep];

  // ── Lock browser back button ──────────────────────────────────────
  useEffect(() => {
    // Push a state so we can intercept back
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      if (submitted) {
        // After voting — back goes to a safe public page
        router.replace(`/election/${slug}/login`);
      } else {
        // During voting — push state again to block back
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [submitted, slug, router]);

  // ── Countdown after voting ────────────────────────────────────────
  useEffect(() => {
    if (!submitted) return;
    if (countdown <= 0) {
      router.replace(`/election/${slug}/login`);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [submitted, countdown, slug, router]);

  useEffect(() => {
    loadBallot();
  }, []);

  async function loadBallot() {
    try {
      const electionRes = await fetch(`/api/election/by-slug/${slug}`);
      const electionData = await electionRes.json();
      if (!electionData?.id) {
        setError("Election not found.");
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/ballot/${electionData.id}`);
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "Already voted") {
          router.replace(`/election/${slug}/already-voted`);
          return;
        }
        setError(data.error || "Failed to load ballot.");
        setLoading(false);
        return;
      }
      setBallot(data);
    } catch {
      setError("Network error. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  function selectCandidate(
    positionId: string,
    candidateId: string,
    maxVotes: number,
  ) {
    setSelections((prev) => {
      const current = prev[positionId] || [];
      if (current.includes(candidateId)) {
        return {
          ...prev,
          [positionId]: current.filter((id) => id !== candidateId),
        };
      }
      if (maxVotes === 1) return { ...prev, [positionId]: [candidateId] };
      if (current.length < maxVotes)
        return { ...prev, [positionId]: [...current, candidateId] };
      return prev;
    });
  }

  function canProceed() {
    if (!currentPosition) return false;
    return (selections[currentPosition.id] || []).length > 0;
  }

  function navigate(dir: "forward" | "back") {
    setAnimKey((k) => k + 1);
    setCurrentStep((s) => (dir === "forward" ? s + 1 : s - 1));
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(confirmationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
    }
  }

  async function handleSubmit() {
    if (!ballot || !online) return;
    setSubmitting(true);
    setError("");
    try {
      const selectionsArray = Object.entries(selections).flatMap(
        ([positionId, candidateIds]) =>
          candidateIds.map((candidateId) => ({
            position_id: positionId,
            candidate_id: candidateId,
          })),
      );

      const res = await fetch("/api/vote/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: ballot.token,
          selections: selectionsArray,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit vote.");
        setSubmitting(false);
        return;
      }

      // Build vote summary for receipt
      const summary = ballot.positions.map((position) => {
        const selectedIds = selections[position.id] || [];
        const selectedCandidates = position.candidates
          .filter((c) => selectedIds.includes(c.id))
          .map((c) => c.full_name);
        return {
          position: position.name,
          candidate: selectedCandidates.join(", "),
        };
      });

      setVoteSelections(summary);
      setConfirmationCode(data.confirmation_code);
      setSubmittedAt(
        new Date().toLocaleString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      );

      // Replace history so back button can't return to ballot
      window.history.replaceState(null, "", `/election/${slug}/ballot`);
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  // ── LOADING ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0B1E35" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #F9A825, #E65100)",
              boxShadow: "0 20px 40px rgba(249,168,37,0.3)",
            }}
          >
            <ShieldCheck className="w-7 h-7" style={{ color: "#0B1E35" }} />
          </div>
          <div className="flex items-center gap-2">
            <Loader2
              className="w-4 h-4 animate-spin"
              style={{ color: "#F9A825" }}
            />
            <p
              className="text-sm font-medium"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Loading your ballot...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────────────
  if (error && !ballot) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "#0B1E35" }}
      >
        <div
          className="w-full max-w-sm rounded-3xl p-8 text-center"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <AlertCircle
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: "#FCA5A5" }}
          />
          <h2 className="text-lg font-bold text-white mb-2">
            Something went wrong
          </h2>
          <p
            className="text-sm mb-6"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            {error}
          </p>
          <button
            onClick={() => router.replace(`/election/${slug}/login`)}
            className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #F9A825, #E65100)",
              color: "#0B1E35",
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── SUCCESS ───────────────────────────────────────────────────────
  if (submitted) {
    // Format code with dots: 2365·7F11·8F65
    const formattedCode =
      confirmationCode.match(/.{1,4}/g)?.join(" · ") || confirmationCode;

    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "#0B1E35" }}
      >
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.8); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>

        {/* Header */}
        <div
          className="w-full px-5 py-4 flex items-center justify-between"
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
            <p className="text-xs font-bold" style={{ color: "#F9A825" }}>
              OSEM Secure Vote
            </p>
          </div>
          {/* Countdown */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "#F9A825" }}
            />
            <p
              className="text-xs font-medium"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Closing in{" "}
              <span className="font-bold text-white">{countdown}s</span>
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div
            className="max-w-sm mx-auto px-4 py-8"
            style={{ animation: "fadeUp 0.5s ease forwards" }}
          >
            {/* Success icon */}
            <div
              className="text-center mb-8"
              style={{ animation: "scaleIn 0.4s ease forwards" }}
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{
                  background: "rgba(22,163,74,0.15)",
                  border: "1px solid rgba(22,163,74,0.3)",
                }}
              >
                <CheckCircle2
                  className="w-10 h-10"
                  style={{ color: "#4ADE80" }}
                />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Vote Submitted!
              </h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                Your vote has been recorded securely.
              </p>
              {submittedAt && (
                <p
                  className="text-xs mt-1"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {submittedAt}
                </p>
              )}
            </div>

            {/* Confirmation code */}
            <div
              className="rounded-2xl p-6 mb-4"
              style={{
                background: "rgba(249,168,37,0.08)",
                border: "1px solid rgba(249,168,37,0.25)",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3 text-center"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Confirmation Code
              </p>
              <p
                className="text-2xl font-bold tracking-widest text-center mb-4"
                style={{ color: "#F9A825", letterSpacing: "0.15em" }}
              >
                {formattedCode}
              </p>
              <button
                onClick={copyCode}
                className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{
                  background: copied
                    ? "rgba(22,163,74,0.2)"
                    : "rgba(249,168,37,0.15)",
                  border: copied
                    ? "1px solid rgba(22,163,74,0.4)"
                    : "1px solid rgba(249,168,37,0.3)",
                  color: copied ? "#4ADE80" : "#F9A825",
                }}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied to clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy code
                  </>
                )}
              </button>
            </div>

            {/* Vote summary */}
            <div
              className="rounded-2xl overflow-hidden mb-4"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="px-5 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Your selections
                </p>
              </div>
              {voteSelections.map((item, idx) => (
                <div
                  key={idx}
                  className="px-5 py-3.5 flex items-center justify-between"
                  style={{
                    borderBottom:
                      idx < voteSelections.length - 1
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "none",
                  }}
                >
                  <p
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {item.position}
                  </p>
                  <p className="text-xs font-bold text-white">
                    {item.candidate}
                  </p>
                </div>
              ))}
            </div>

            {/* Done message */}
            <div
              className="rounded-2xl p-4 text-center"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                You&apos;re done. You may safely close this page.
              </p>
            </div>
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

  // ── BALLOT ────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0B1E35" }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-slide { animation: slideUp 0.3s ease forwards; }
      `}</style>

      {/* Network banner */}
      {!online && (
        <div
          className="w-full py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-semibold"
          style={{ background: "#DC2626", color: "#ffffff" }}
        >
          <WifiOff className="w-3.5 h-3.5" />
          No internet connection — voting is paused until you reconnect
        </div>
      )}

      {/* Header */}
      <div
        className="w-full px-5 py-4 flex items-center justify-between shrink-0"
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
          <div>
            <p className="text-xs font-bold" style={{ color: "#F9A825" }}>
              OSEM Secure Vote
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              {ballot?.election.title}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-white">
            {ballot?.voter.full_name}
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            {isReviewStep
              ? "Review & Submit"
              : `Position ${currentStep + 1} of ${totalPositions}`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-0.5"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-0.5 transition-all duration-500"
          style={{
            background: "linear-gradient(90deg, #F9A825, #FFD54F)",
            width: `${(currentStep / totalPositions) * 100}%`,
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* VOTING STEP */}
          {!isReviewStep && currentPosition && (
            <div key={animKey} className="anim-slide">
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                      background: "rgba(249,168,37,0.15)",
                      color: "#F9A825",
                      border: "1px solid rgba(249,168,37,0.3)",
                    }}
                  >
                    {currentStep + 1} of {totalPositions}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
                  {currentPosition.name}
                </h1>
                <p
                  className="text-sm"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {currentPosition.max_votes === 1
                    ? "Select one candidate"
                    : `Select up to ${currentPosition.max_votes} candidates`}
                </p>
              </div>

              {/* Candidates grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {currentPosition.candidates
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((candidate) => {
                    const isSelected = (
                      selections[currentPosition.id] || []
                    ).includes(candidate.id);
                    return (
                      <button
                        key={candidate.id}
                        onClick={() =>
                          selectCandidate(
                            currentPosition.id,
                            candidate.id,
                            currentPosition.max_votes,
                          )
                        }
                        className="text-left transition-all duration-200 active:scale-95"
                      >
                        <div
                          className="rounded-2xl overflow-hidden transition-all duration-300"
                          style={{
                            background: isSelected
                              ? "rgba(249,168,37,0.12)"
                              : "rgba(255,255,255,0.05)",
                            border: isSelected
                              ? "2px solid #F9A825"
                              : "1px solid rgba(255,255,255,0.08)",
                            boxShadow: isSelected
                              ? "0 8px 32px rgba(249,168,37,0.2)"
                              : "none",
                          }}
                        >
                          {/* Square photo */}
                          <div
                            className="w-full relative overflow-hidden"
                            style={{ aspectRatio: "1/1" }}
                          >
                            {candidate.photo_url ? (
                              <img
                                src={candidate.photo_url}
                                alt={candidate.full_name}
                                className="w-full h-full object-cover transition-transform duration-300"
                                style={{
                                  transform: isSelected
                                    ? "scale(1.03)"
                                    : "scale(1)",
                                }}
                              />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center"
                                style={{
                                  background: isSelected
                                    ? "linear-gradient(135deg, rgba(249,168,37,0.2), rgba(249,168,37,0.05))"
                                    : "rgba(255,255,255,0.03)",
                                }}
                              >
                                <User
                                  className="w-14 h-14"
                                  style={{
                                    color: isSelected
                                      ? "#F9A825"
                                      : "rgba(255,255,255,0.15)",
                                  }}
                                />
                              </div>
                            )}
                            {isSelected && (
                              <div
                                className="absolute inset-0 flex items-end justify-end p-3"
                                style={{
                                  background:
                                    "linear-gradient(to top, rgba(249,168,37,0.4), transparent)",
                                }}
                              >
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center"
                                  style={{
                                    background: "#F9A825",
                                    boxShadow:
                                      "0 4px 12px rgba(249,168,37,0.5)",
                                  }}
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="#0B1E35"
                                    strokeWidth={3}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Name only */}
                          <div className="p-4">
                            <p
                              className="font-bold text-sm leading-tight"
                              style={{
                                color: isSelected
                                  ? "#F9A825"
                                  : "rgba(255,255,255,0.9)",
                              }}
                            >
                              {candidate.full_name}
                            </p>
                            <p
                              className="text-xs mt-1.5 font-medium"
                              style={{
                                color: isSelected
                                  ? "rgba(249,168,37,0.7)"
                                  : "rgba(255,255,255,0.25)",
                              }}
                            >
                              {isSelected ? "✓ Selected" : "Tap to select"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <button
                    onClick={() => navigate("back")}
                    className="flex items-center gap-2 px-5 py-4 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                )}
                <button
                  onClick={() => navigate("forward")}
                  disabled={!canProceed()}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  style={{
                    background: canProceed()
                      ? "linear-gradient(135deg, #F9A825, #E65100)"
                      : "rgba(255,255,255,0.08)",
                    color: canProceed() ? "#0B1E35" : "rgba(255,255,255,0.3)",
                  }}
                >
                  {currentStep === totalPositions - 1
                    ? "Review Selections"
                    : "Next Position"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* REVIEW STEP */}
          {isReviewStep && ballot && (
            <div key={`review-${animKey}`} className="anim-slide">
              <div className="mb-8">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold inline-block mb-3"
                  style={{
                    background: "rgba(249,168,37,0.15)",
                    color: "#F9A825",
                    border: "1px solid rgba(249,168,37,0.3)",
                  }}
                >
                  Final Step
                </span>
                <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
                  Review Your Vote
                </h1>
                <p
                  className="text-sm"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Confirm your selections before submitting.
                </p>
              </div>

              {/* Review cards */}
              <div className="space-y-3 mb-6">
                {ballot.positions.map((position, idx) => {
                  const selectedIds = selections[position.id] || [];
                  const selectedCandidates = position.candidates.filter((c) =>
                    selectedIds.includes(c.id),
                  );
                  return (
                    <div
                      key={position.id}
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        className="px-5 py-3 flex items-center justify-between"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <p
                          className="text-xs font-bold uppercase tracking-wide"
                          style={{ color: "rgba(255,255,255,0.4)" }}
                        >
                          {position.name}
                        </p>
                        <button
                          onClick={() => setCurrentStep(idx)}
                          className="text-xs font-bold px-3 py-1 rounded-full transition-all active:scale-95"
                          style={{
                            background: "rgba(249,168,37,0.15)",
                            color: "#F9A825",
                          }}
                        >
                          Change
                        </button>
                      </div>
                      {selectedCandidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="px-5 py-4 flex items-center gap-4"
                        >
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                            style={{
                              background: "rgba(249,168,37,0.1)",
                              border: "1px solid rgba(249,168,37,0.2)",
                            }}
                          >
                            {candidate.photo_url ? (
                              <img
                                src={candidate.photo_url}
                                alt={candidate.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User
                                className="w-5 h-5"
                                style={{ color: "#F9A825" }}
                              />
                            )}
                          </div>
                          <p className="font-bold text-sm text-white flex-1">
                            {candidate.full_name}
                          </p>
                          <CheckCircle2
                            className="w-5 h-5 shrink-0"
                            style={{ color: "#4ADE80" }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Error */}
              {error && (
                <div
                  className="flex items-start gap-2.5 rounded-2xl p-4 mb-4"
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

              {/* Warning */}
              <div
                className="rounded-2xl p-4 mb-6"
                style={{
                  background: "rgba(249,168,37,0.08)",
                  border: "1px solid rgba(249,168,37,0.2)",
                }}
              >
                <p
                  className="text-xs font-medium"
                  style={{ color: "rgba(249,168,37,0.8)" }}
                >
                  ⚠ Once submitted your vote is final and cannot be changed or
                  reversed.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(totalPositions - 1)}
                  className="flex items-center gap-2 px-5 py-4 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !online}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #F9A825, #E65100)",
                    color: "#0B1E35",
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Submit My Vote
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="w-full px-6 py-4 flex items-center justify-between shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: online ? "#16A34A" : "#DC2626" }}
          />
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            {online ? "Connection secure" : "No connection"}
          </p>
        </div>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          Powered by{" "}
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
