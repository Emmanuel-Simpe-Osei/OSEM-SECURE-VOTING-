"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  Users,
  UserPlus,
  Play,
  Pause,
  X,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  ChevronRight,
  Loader2,
  Copy,
  WifiOff,
  Headphones,
  ClipboardCheck,
  Layers,
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils/time";

interface Election {
  id: string;
  title: string;
  slug: string;
  status: string;
  start_time: string;
  end_time: string;
  results_visibility: string;
  description: string | null;
  session_verification_enabled: boolean;
  session_verification_message: string;
  eligibility_check_enabled: boolean;
  eligibility_check_open_from: string | null;
}

interface Position {
  id: string;
  name: string;
  max_votes: number;
  sort_order: number;
  candidates: { id: string; full_name: string; status: string }[];
}

interface Stats {
  total_voters: number;
  has_voted: number;
  turnout_percent: number;
}

function useNetwork() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export default function ElectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const online = useNetwork();

  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedResults, setCopiedResults] = useState(false);
  const [copiedEligibility, setCopiedEligibility] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Session verification state
  const [sessionVerification, setSessionVerification] = useState(false);
  const [sessionMessage, setSessionMessage] = useState(
    "Your session could not be verified. Please visit the admin desk with your student ID or proof of registration to complete your verification.",
  );
  const [savingSession, setSavingSession] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

  // Duplicate modal state
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [duplicateTitle, setDuplicateTitle] = useState("");
  const [duplicateSlug, setDuplicateSlug] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");

  // Eligibility check state
  const [eligibilityEnabled, setEligibilityEnabled] = useState(false);
  const [eligibilityOpenFrom, setEligibilityOpenFrom] = useState("");
  const [savingEligibility, setSavingEligibility] = useState(false);
  const [eligibilitySaved, setEligibilitySaved] = useState(false);
  const [eligibilityStats, setEligibilityStats] = useState<{
    total: number;
    eligible: number;
    failed: number;
  } | null>(null);

  useEffect(() => {
    loadElection();
    setTimeout(() => setMounted(true), 50);
  }, []);

  async function loadElection() {
    try {
      const res = await fetch(`/api/admin/elections/${id}`);
      if (res.status === 401) {
        router.replace("/admin/login?error=session_expired");
        return;
      }
      if (res.status === 404) {
        router.replace("/admin/dashboard");
        return;
      }
      const data = await res.json();
      setElection(data.election);
      setPositions(data.positions || []);
      setStats(data.stats);
      setSessionVerification(
        data.election.session_verification_enabled || false,
      );
      setSessionMessage(
        data.election.session_verification_message ||
          "Your session could not be verified. Please visit the admin desk with your student ID or proof of registration to complete your verification.",
      );
      setEligibilityEnabled(data.election.eligibility_check_enabled || false);
      if (data.election.eligibility_check_open_from) {
        const d = new Date(data.election.eligibility_check_open_from);
        const pad = (n: number) => String(n).padStart(2, "0");
        setEligibilityOpenFrom(
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
        );
      }
    } catch {
      setError("Failed to load election.");
    } finally {
      setLoading(false);
    }
  }

  async function loadEligibilityStats() {
    try {
      const res = await fetch(`/api/admin/elections/${id}/eligibility-check`);
      if (res.ok) {
        const data = await res.json();
        setEligibilityStats(data.stats);
      }
    } catch {
      // non-blocking
    }
  }

  useEffect(() => {
    if (mounted) loadEligibilityStats();
  }, [mounted]);

  async function changeStatus(newStatus: string) {
    setActionLoading(newStatus);
    setError("");
    try {
      const res = await fetch(`/api/admin/elections/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update status.");
        return;
      }
      setElection((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading("");
    }
  }

  async function saveSessionVerification() {
    setSavingSession(true);
    try {
      const res = await fetch(
        `/api/admin/elections/${id}/session-verification`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: sessionVerification,
            message: sessionMessage,
            available_sessions: ["Morning", "Evening", "Weekend"],
          }),
        },
      );
      if (res.ok) {
        setSessionSaved(true);
        setTimeout(() => setSessionSaved(false), 2500);
      }
    } catch {
      // non-blocking
    } finally {
      setSavingSession(false);
    }
  }

  async function saveEligibilityCheck() {
    setSavingEligibility(true);
    try {
      const res = await fetch(`/api/admin/elections/${id}/eligibility-check`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: eligibilityEnabled,
          open_from: eligibilityOpenFrom
            ? new Date(eligibilityOpenFrom).toISOString()
            : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEligibilityStats(data.stats);
        setEligibilitySaved(true);
        setTimeout(() => setEligibilitySaved(false), 2500);
      }
    } catch {
      // non-blocking
    } finally {
      setSavingEligibility(false);
    }
  }

  function openDuplicateModal() {
    setDuplicateTitle(`${election?.title} (Copy)`);
    setDuplicateSlug((election?.slug || "") + "-copy");
    setDuplicateError("");
    setShowDuplicate(true);
  }

  async function handleDuplicate() {
    if (!duplicateTitle.trim() || !duplicateSlug.trim()) return;
    setDuplicating(true);
    setDuplicateError("");
    try {
      const res = await fetch(`/api/admin/elections/${id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: duplicateTitle.trim(),
          slug: duplicateSlug.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDuplicateError(data.error || "Failed to duplicate.");
        return;
      }
      setShowDuplicate(false);
      router.push(`/admin/elections/${data.id}`);
    } catch {
      setDuplicateError("Network error. Please try again.");
    } finally {
      setDuplicating(false);
    }
  }

  function copyUrl() {
    const url = `${window.location.origin}/election/${election?.slug}/login`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function copyResultsUrl() {
    const url = `${window.location.origin}/election/${election?.slug}/results`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedResults(true);
      setTimeout(() => setCopiedResults(false), 2500);
    });
  }

  function copyEligibilityUrl() {
    const url = `${window.location.origin}/election/${election?.slug}/eligibility`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedEligibility(true);
      setTimeout(() => setCopiedEligibility(false), 2500);
    });
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case "active":
        return {
          bg: "rgba(22,163,74,0.15)",
          text: "#4ADE80",
          border: "rgba(22,163,74,0.3)",
        };
      case "scheduled":
        return {
          bg: "rgba(249,168,37,0.15)",
          text: "#F9A825",
          border: "rgba(249,168,37,0.3)",
        };
      case "paused":
        return {
          bg: "rgba(249,115,22,0.15)",
          text: "#FB923C",
          border: "rgba(249,115,22,0.3)",
        };
      case "closed":
        return {
          bg: "rgba(239,68,68,0.15)",
          text: "#F87171",
          border: "rgba(239,68,68,0.3)",
        };
      case "draft":
        return {
          bg: "rgba(107,114,128,0.15)",
          text: "#9CA3AF",
          border: "rgba(107,114,128,0.3)",
        };
      default:
        return {
          bg: "rgba(107,114,128,0.15)",
          text: "#9CA3AF",
          border: "rgba(107,114,128,0.3)",
        };
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0B1E35" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #F9A825, #E65100)" }}
          >
            <ShieldCheck className="w-6 h-6" style={{ color: "#0B1E35" }} />
          </div>
          <Loader2
            className="w-5 h-5 animate-spin"
            style={{ color: "#F9A825" }}
          />
        </div>
      </div>
    );
  }

  if (!election) return null;

  const statusStyle = getStatusStyle(election.status);
  const portalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/election/${election.slug}/login`
      : `/election/${election.slug}/login`;
  const resultsUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/election/${election.slug}/results`
      : `/election/${election.slug}/results`;
  const eligibilityUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/election/${election.slug}/eligibility`
      : `/election/${election.slug}/eligibility`;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0B1E35" }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Duplicate modal */}
      {showDuplicate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-4"
            style={{
              background: "#0F2540",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" style={{ color: "#A78BFA" }} />
                <p className="text-sm font-bold text-white">
                  Duplicate Election
                </p>
              </div>
              <button
                onClick={() => setShowDuplicate(false)}
                className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <X
                  className="w-3.5 h-3.5"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                />
              </button>
            </div>

            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Creates a new draft with the same positions and candidates. Voter
              list is not copied.
            </p>

            {duplicateError && (
              <div
                className="rounded-2xl p-3 flex items-start gap-2"
                style={{
                  background: "rgba(220,38,38,0.15)",
                  border: "1px solid rgba(220,38,38,0.3)",
                }}
              >
                <AlertTriangle
                  className="w-3.5 h-3.5 shrink-0 mt-0.5"
                  style={{ color: "#F87171" }}
                />
                <p className="text-xs" style={{ color: "#F87171" }}>
                  {duplicateError}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label
                  className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  New Title
                </label>
                <input
                  type="text"
                  value={duplicateTitle}
                  onChange={(e) => {
                    setDuplicateTitle(e.target.value);
                    const slug = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9\s-]/g, "")
                      .replace(/\s+/g, "-")
                      .replace(/-+/g, "-")
                      .trim();
                    setDuplicateSlug(slug);
                  }}
                  className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#ffffff",
                  }}
                  autoFocus
                />
              </div>
              <div>
                <label
                  className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  URL Slug
                </label>
                <input
                  type="text"
                  value={duplicateSlug}
                  onChange={(e) =>
                    setDuplicateSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    )
                  }
                  className="w-full px-3.5 py-3 rounded-xl text-sm outline-none font-mono"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#F9A825",
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDuplicate(false)}
                className="px-4 py-3 rounded-2xl text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicate}
                disabled={
                  duplicating || !duplicateTitle.trim() || !duplicateSlug.trim()
                }
                className="flex-1 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: "rgba(167,139,250,0.2)",
                  color: "#A78BFA",
                  border: "1px solid rgba(167,139,250,0.3)",
                }}
              >
                {duplicating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Duplicating...
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5" />
                    Duplicate Election
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Network banner */}
      {mounted && !online && (
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
        className="w-full px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{
          background: "#0B1E35",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-60"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
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

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Election header */}
          <div
            className="mb-8"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.4s ease",
            }}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="text-2xl font-bold text-white leading-tight">
                {election.title}
              </h1>
              <span
                className="px-3 py-1.5 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5"
                style={{
                  background: statusStyle.bg,
                  color: statusStyle.text,
                  border: `1px solid ${statusStyle.border}`,
                }}
              >
                {election.status === "active" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                )}
                {election.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              {formatDate(election.start_time)}
              {" · "}
              {formatTime(election.start_time)}
              {" → "}
              {formatTime(election.end_time)}
            </p>
            {election.description && (
              <p
                className="text-sm mt-2"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {election.description}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2.5 rounded-2xl p-4 mb-6"
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
                {error}
              </p>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div
              className="grid grid-cols-3 gap-4 mb-6"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(12px)",
                transition: "all 0.4s ease 0.1s",
              }}
            >
              {[
                {
                  label: "Total Voters",
                  value: stats.total_voters.toLocaleString(),
                  color: "#60A5FA",
                },
                {
                  label: "Voted",
                  value: stats.has_voted.toLocaleString(),
                  color: "#4ADE80",
                },
                {
                  label: "Turnout",
                  value: `${stats.turnout_percent}%`,
                  color: "#F9A825",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl p-5 text-center"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p
                    className="text-2xl font-bold mb-1"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Turnout bar */}
          {stats && stats.total_voters > 0 && (
            <div
              className="rounded-2xl p-5 mb-6"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p
                  className="text-xs font-bold"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  TURNOUT PROGRESS
                </p>
                <p className="text-xs font-bold" style={{ color: "#F9A825" }}>
                  {stats.turnout_percent}%
                </p>
              </div>
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="h-2 rounded-full transition-all duration-1000"
                  style={{
                    width: mounted ? `${stats.turnout_percent}%` : "0%",
                    background: "linear-gradient(90deg, #F9A825, #4ADE80)",
                  }}
                />
              </div>
              <p
                className="text-xs mt-2"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {stats.has_voted} of {stats.total_voters} voters have cast their
                ballot
              </p>
            </div>
          )}

          {/* Controls */}
          <div
            className="rounded-2xl p-6 mb-4"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.4s ease 0.2s",
            }}
          >
            <h2 className="text-sm font-bold text-white mb-4">
              Election Controls
            </h2>
            <div className="flex flex-wrap gap-3">
              {election.status === "draft" && (
                <button
                  onClick={() => changeStatus("scheduled")}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                  style={{
                    background: "rgba(249,168,37,0.15)",
                    color: "#F9A825",
                    border: "1px solid rgba(249,168,37,0.3)",
                  }}
                >
                  {actionLoading === "scheduled" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  Schedule Election
                </button>
              )}
              {(election.status === "scheduled" ||
                election.status === "draft") && (
                <button
                  onClick={() => changeStatus("active")}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                  style={{
                    background: "rgba(22,163,74,0.15)",
                    color: "#4ADE80",
                    border: "1px solid rgba(22,163,74,0.3)",
                  }}
                >
                  {actionLoading === "active" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  Open Voting
                </button>
              )}
              {election.status === "active" && (
                <>
                  <button
                    onClick={() => changeStatus("paused")}
                    disabled={!!actionLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      background: "rgba(249,115,22,0.15)",
                      color: "#FB923C",
                      border: "1px solid rgba(249,115,22,0.3)",
                    }}
                  >
                    {actionLoading === "paused" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Pause className="w-3.5 h-3.5" />
                    )}
                    Pause Election
                  </button>
                  <button
                    onClick={() => changeStatus("closed")}
                    disabled={!!actionLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      background: "rgba(239,68,68,0.15)",
                      color: "#F87171",
                      border: "1px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    {actionLoading === "closed" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    Close Election
                  </button>
                </>
              )}
              {election.status === "paused" && (
                <>
                  <button
                    onClick={() => changeStatus("active")}
                    disabled={!!actionLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      background: "rgba(22,163,74,0.15)",
                      color: "#4ADE80",
                      border: "1px solid rgba(22,163,74,0.3)",
                    }}
                  >
                    {actionLoading === "active" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    Resume Election
                  </button>
                  <button
                    onClick={() => changeStatus("closed")}
                    disabled={!!actionLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      background: "rgba(239,68,68,0.15)",
                      color: "#F87171",
                      border: "1px solid rgba(239,68,68,0.3)",
                    }}
                  >
                    {actionLoading === "closed" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    Close Election
                  </button>
                </>
              )}
              {election.status === "closed" && (
                <button
                  onClick={() => router.push(`/admin/elections/${id}/results`)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{
                    background: "rgba(249,168,37,0.15)",
                    color: "#F9A825",
                    border: "1px solid rgba(249,168,37,0.3)",
                  }}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  View & Publish Results
                </button>
              )}
              {election.status === "draft" && (
                <p
                  className="text-xs self-center"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Add candidates and voters before opening voting.
                </p>
              )}

              {/* Duplicate — available on any status */}
              <button
                onClick={openDuplicateModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{
                  background: "rgba(167,139,250,0.12)",
                  color: "#A78BFA",
                  border: "1px solid rgba(167,139,250,0.25)",
                }}
              >
                <Layers className="w-3.5 h-3.5" />
                Duplicate
              </button>
            </div>
          </div>

          {/* Management sections */}
          <div
            className="grid grid-cols-1 gap-3 mb-4"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.4s ease 0.3s",
            }}
          >
            {/* Voter Register */}
            <button
              onClick={() => router.push(`/admin/elections/${id}/voters`)}
              className="text-left transition-all active:scale-99 group"
            >
              <div
                className="rounded-2xl p-5 flex items-center gap-4 transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(96,165,250,0.15)",
                    border: "1px solid rgba(96,165,250,0.3)",
                  }}
                >
                  <Users className="w-5 h-5" style={{ color: "#60A5FA" }} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-white">Voter Register</p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {stats?.total_voters
                      ? `${stats.total_voters.toLocaleString()} voters registered`
                      : "Upload voter list CSV"}
                  </p>
                </div>
                <ChevronRight
                  className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                />
              </div>
            </button>

            {/* Candidates & Positions */}
            <button
              onClick={() => router.push(`/admin/elections/${id}/candidates`)}
              className="text-left transition-all active:scale-99 group"
            >
              <div
                className="rounded-2xl p-5 flex items-center gap-4 transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(167,139,250,0.15)",
                    border: "1px solid rgba(167,139,250,0.3)",
                  }}
                >
                  <UserPlus className="w-5 h-5" style={{ color: "#A78BFA" }} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-white">
                    Candidates & Positions
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {positions.length > 0
                      ? `${positions.length} positions · ${positions.reduce((acc, p) => acc + p.candidates.length, 0)} candidates`
                      : "Add positions and candidates"}
                  </p>
                </div>
                <ChevronRight
                  className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                />
              </div>
            </button>

            {/* Pre-Election Checklist — draft/scheduled only */}
            {(election.status === "draft" ||
              election.status === "scheduled") && (
              <button
                onClick={() => router.push(`/admin/elections/${id}/checklist`)}
                className="text-left transition-all active:scale-99 group"
              >
                <div
                  className="rounded-2xl p-5 flex items-center gap-4"
                  style={{
                    background: "rgba(249,168,37,0.06)",
                    border: "1px solid rgba(249,168,37,0.2)",
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(249,168,37,0.15)",
                      border: "1px solid rgba(249,168,37,0.3)",
                    }}
                  >
                    <CheckCircle2
                      className="w-5 h-5"
                      style={{ color: "#F9A825" }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-white">
                      Pre-Election Checklist
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Verify everything is ready before opening voting
                    </p>
                  </div>
                  <ChevronRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  />
                </div>
              </button>
            )}

            {/* Live Monitoring — active/paused only */}
            {(election.status === "active" || election.status === "paused") && (
              <button
                onClick={() => router.push(`/admin/elections/${id}/monitoring`)}
                className="text-left transition-all active:scale-99 group"
              >
                <div
                  className="rounded-2xl p-5 flex items-center gap-4"
                  style={{
                    background: "rgba(249,168,37,0.08)",
                    border: "1px solid rgba(249,168,37,0.2)",
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(249,168,37,0.15)",
                      border: "1px solid rgba(249,168,37,0.3)",
                    }}
                  >
                    <Activity
                      className="w-5 h-5"
                      style={{ color: "#F9A825" }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-white">
                        Live Monitoring
                      </p>
                      <div
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ background: "#4ADE80" }}
                      />
                    </div>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Real-time turnout and activity
                    </p>
                  </div>
                  <ChevronRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  />
                </div>
              </button>
            )}

            {/* Voter Support — active/paused only */}
            {(election.status === "active" || election.status === "paused") && (
              <button
                onClick={() => router.push(`/admin/elections/${id}/support`)}
                className="text-left transition-all active:scale-99 group"
              >
                <div
                  className="rounded-2xl p-5 flex items-center gap-4"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(96,165,250,0.15)",
                      border: "1px solid rgba(96,165,250,0.3)",
                    }}
                  >
                    <Headphones
                      className="w-5 h-5"
                      style={{ color: "#60A5FA" }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-white">
                      Voter Support
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Fix voter issues · Manual override
                    </p>
                  </div>
                  <ChevronRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  />
                </div>
              </button>
            )}

            {/* Results — closed/archived only */}
            {(election.status === "closed" ||
              election.status === "archived") && (
              <button
                onClick={() => router.push(`/admin/elections/${id}/results`)}
                className="text-left transition-all active:scale-99 group"
              >
                <div
                  className="rounded-2xl p-5 flex items-center gap-4"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(74,222,128,0.15)",
                      border: "1px solid rgba(74,222,128,0.3)",
                    }}
                  >
                    <BarChart3
                      className="w-5 h-5"
                      style={{ color: "#4ADE80" }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-white">Results</p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      {election.results_visibility === "public_after_close"
                        ? "Published — students can see results"
                        : "View and publish election results"}
                    </p>
                  </div>
                  <ChevronRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  />
                </div>
              </button>
            )}
          </div>

          {/* Session Verification Toggle */}
          <div
            className="rounded-2xl p-5 mb-4"
            style={{
              background: sessionVerification
                ? "rgba(249,168,37,0.06)"
                : "rgba(255,255,255,0.03)",
              border: sessionVerification
                ? "1px solid rgba(249,168,37,0.25)"
                : "1px solid rgba(255,255,255,0.06)",
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.4s ease 0.38s",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-white">
                  Session Verification
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Require students to confirm their session before voting
                </p>
              </div>
              <button
                onClick={() => setSessionVerification((v) => !v)}
                className="relative w-12 h-6 rounded-full transition-all shrink-0"
                style={{
                  background: sessionVerification
                    ? "rgba(249,168,37,0.8)"
                    : "rgba(255,255,255,0.1)",
                }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                  style={{
                    background: "#ffffff",
                    left: sessionVerification ? "calc(100% - 22px)" : "2px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                  }}
                />
              </button>
            </div>

            {sessionVerification && (
              <div className="mt-2 space-y-3">
                <div>
                  <label
                    className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    Message shown to blocked students
                  </label>
                  <textarea
                    value={sessionMessage}
                    onChange={(e) => setSessionMessage(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#ffffff",
                    }}
                    placeholder="Your session could not be verified. Please visit Room 6 with your student ID or proof of registration."
                  />
                  <p
                    className="text-xs mt-1.5"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    Tip: Include the room number and what to bring (student ID
                    or proof of registration for Level 100)
                  </p>
                </div>
                <div>
                  <p
                    className="text-xs font-bold mb-2 uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    Available Sessions
                  </p>
                  <div className="flex gap-2">
                    {["Morning", "Evening", "Weekend"].map((s) => (
                      <span
                        key={s}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold"
                        style={{
                          background: "rgba(249,168,37,0.1)",
                          color: "#F9A825",
                          border: "1px solid rgba(249,168,37,0.2)",
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={saveSessionVerification}
              disabled={savingSession}
              className="w-full mt-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: sessionSaved
                  ? "rgba(22,163,74,0.2)"
                  : "rgba(249,168,37,0.15)",
                color: sessionSaved ? "#4ADE80" : "#F9A825",
                border: sessionSaved
                  ? "1px solid rgba(22,163,74,0.3)"
                  : "1px solid rgba(249,168,37,0.3)",
              }}
            >
              {savingSession ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : sessionSaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved!
                </>
              ) : (
                "Save Settings"
              )}
            </button>
          </div>

          {/* Eligibility Check Toggle */}
          <div
            className="rounded-2xl p-5 mb-4"
            style={{
              background: eligibilityEnabled
                ? "rgba(96,165,250,0.06)"
                : "rgba(255,255,255,0.03)",
              border: eligibilityEnabled
                ? "1px solid rgba(96,165,250,0.25)"
                : "1px solid rgba(255,255,255,0.06)",
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.4s ease 0.42s",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-white">
                  Pre-Election Eligibility Check
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Let students verify they can vote before election day
                </p>
              </div>
              <button
                onClick={() => setEligibilityEnabled((v) => !v)}
                className="relative w-12 h-6 rounded-full transition-all shrink-0"
                style={{
                  background: eligibilityEnabled
                    ? "rgba(96,165,250,0.8)"
                    : "rgba(255,255,255,0.1)",
                }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                  style={{
                    background: "#ffffff",
                    left: eligibilityEnabled ? "calc(100% - 22px)" : "2px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                  }}
                />
              </button>
            </div>

            {eligibilityEnabled && (
              <div className="mt-2 space-y-4">
                <div>
                  <label
                    className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    Open from (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={eligibilityOpenFrom}
                    onChange={(e) => setEligibilityOpenFrom(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#ffffff",
                      colorScheme: "dark",
                    }}
                  />
                  <p
                    className="text-xs mt-1.5"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    Leave blank to open immediately. Eligibility check closes
                    automatically when the election goes active.
                  </p>
                </div>

                {eligibilityStats && eligibilityStats.total > 0 && (
                  <div
                    className="rounded-2xl p-4"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <p
                      className="text-xs font-bold mb-3 uppercase tracking-wide"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Check Results So Far
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: "Total Checked",
                          value: eligibilityStats.total,
                          color: "#60A5FA",
                        },
                        {
                          label: "Eligible",
                          value: eligibilityStats.eligible,
                          color: "#4ADE80",
                        },
                        {
                          label: "Issues Found",
                          value: eligibilityStats.failed,
                          color: "#F87171",
                        },
                      ].map((s) => (
                        <div key={s.label} className="text-center">
                          <p
                            className="text-xl font-bold"
                            style={{ color: s.color }}
                          >
                            {s.value}
                          </p>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "rgba(255,255,255,0.35)" }}
                          >
                            {s.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p
                    className="text-xs font-bold mb-2 uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    Eligibility Check URL
                  </p>
                  <div className="flex items-center gap-3">
                    <p
                      className="text-xs font-mono flex-1 break-all leading-relaxed"
                      style={{ color: "#60A5FA" }}
                    >
                      {eligibilityUrl}
                    </p>
                    <button
                      onClick={copyEligibilityUrl}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95"
                      style={{
                        background: copiedEligibility
                          ? "rgba(22,163,74,0.2)"
                          : "rgba(96,165,250,0.15)",
                        color: copiedEligibility ? "#4ADE80" : "#60A5FA",
                        border: copiedEligibility
                          ? "1px solid rgba(22,163,74,0.3)"
                          : "1px solid rgba(96,165,250,0.3)",
                      }}
                    >
                      {copiedEligibility ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy URL
                        </>
                      )}
                    </button>
                  </div>
                  <p
                    className="text-xs mt-2"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    Share this with students 2–3 days before election day. Each
                    student gets one attempt only.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={saveEligibilityCheck}
              disabled={savingEligibility}
              className="w-full mt-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: eligibilitySaved
                  ? "rgba(22,163,74,0.2)"
                  : "rgba(96,165,250,0.15)",
                color: eligibilitySaved ? "#4ADE80" : "#60A5FA",
                border: eligibilitySaved
                  ? "1px solid rgba(22,163,74,0.3)"
                  : "1px solid rgba(96,165,250,0.3)",
              }}
            >
              {savingEligibility ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : eligibilitySaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved!
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Save Eligibility Settings
                </>
              )}
            </button>
          </div>

          {/* Voter portal URL */}
          <div
            className="rounded-2xl p-5 mb-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.4s ease 0.44s",
            }}
          >
            <p
              className="text-xs font-bold mb-3"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              VOTER PORTAL URL
            </p>
            <div className="flex items-center gap-3">
              <p
                className="text-xs font-mono flex-1 break-all leading-relaxed"
                style={{ color: "#F9A825" }}
              >
                {portalUrl}
              </p>
              <button
                onClick={copyUrl}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95"
                style={{
                  background: copied
                    ? "rgba(22,163,74,0.2)"
                    : "rgba(249,168,37,0.15)",
                  color: copied ? "#4ADE80" : "#F9A825",
                  border: copied
                    ? "1px solid rgba(22,163,74,0.3)"
                    : "1px solid rgba(249,168,37,0.3)",
                }}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy URL
                  </>
                )}
              </button>
            </div>
            <p
              className="text-xs mt-3"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              Share this URL with eligible voters on election day.
            </p>
          </div>

          {/* Public results URL */}
          {(election.status === "closed" || election.status === "archived") && (
            <div
              className="rounded-2xl p-5"
              style={{
                background:
                  election.results_visibility === "public_after_close"
                    ? "rgba(22,163,74,0.06)"
                    : "rgba(255,255,255,0.03)",
                border:
                  election.results_visibility === "public_after_close"
                    ? "1px solid rgba(22,163,74,0.2)"
                    : "1px solid rgba(255,255,255,0.06)",
                opacity: mounted ? 1 : 0,
                transition: "opacity 0.4s ease 0.5s",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p
                  className="text-xs font-bold"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  PUBLIC RESULTS URL
                </p>
                {election.results_visibility === "public_after_close" ? (
                  <span
                    className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(22,163,74,0.15)",
                      color: "#4ADE80",
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Published
                  </span>
                ) : (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    Not published
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <p
                  className="text-xs font-mono flex-1 break-all leading-relaxed"
                  style={{
                    color:
                      election.results_visibility === "public_after_close"
                        ? "#4ADE80"
                        : "rgba(255,255,255,0.25)",
                  }}
                >
                  {resultsUrl}
                </p>
                {election.results_visibility === "public_after_close" ? (
                  <button
                    onClick={copyResultsUrl}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95"
                    style={{
                      background: copiedResults
                        ? "rgba(22,163,74,0.3)"
                        : "rgba(22,163,74,0.15)",
                      color: "#4ADE80",
                      border: "1px solid rgba(22,163,74,0.3)",
                    }}
                  >
                    {copiedResults ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy URL
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      router.push(`/admin/elections/${id}/results`)
                    }
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95"
                    style={{
                      background: "rgba(249,168,37,0.15)",
                      color: "#F9A825",
                      border: "1px solid rgba(249,168,37,0.3)",
                    }}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Publish
                  </button>
                )}
              </div>
              <p
                className="text-xs mt-3"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                {election.results_visibility === "public_after_close"
                  ? "Share this URL with students and the public to view official results."
                  : "Publish results first to activate this URL."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="w-full px-6 py-4 flex items-center justify-between"
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
