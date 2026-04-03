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
} from "lucide-react";

interface Election {
  id: string;
  title: string;
  slug: string;
  status: string;
  start_time: string;
  end_time: string;
  results_visibility: string;
  description: string | null;
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
  const [online, setOnline] = useState(
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
  const [mounted, setMounted] = useState(false);

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
    } catch {
      setError("Failed to load election.");
    } finally {
      setLoading(false);
    }
  }

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

  function copyUrl() {
    const url = `${window.location.origin}/election/${election?.slug}/login`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
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
  const startDate = new Date(election.start_time);
  const endDate = new Date(election.end_time);
  const portalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/election/${election.slug}/login`
      : `/election/${election.slug}/login`;

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
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .anim-fade-up { animation: fadeUp 0.4s ease forwards; }
        .anim-fade-in { animation: fadeIn 0.3s ease forwards; }
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
              {startDate.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {" · "}
              {startDate.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" → "}
              {endDate.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
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
              className="flex items-start gap-2.5 rounded-2xl p-4 mb-6 anim-fade-in"
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

          {/* Election controls */}
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
            {/* Voters */}
            <button
              onClick={() => router.push(`/admin/elections/${id}/voters`)}
              className="text-left transition-all active:scale-99 group"
            >
              <div
                className="rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 group-hover:border-opacity-30"
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

            {/* Candidates */}
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

            {/* Live Monitoring */}
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

            {/* Results */}
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
                      View and publish election results
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

          {/* Voter portal URL */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.4s ease 0.4s",
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
