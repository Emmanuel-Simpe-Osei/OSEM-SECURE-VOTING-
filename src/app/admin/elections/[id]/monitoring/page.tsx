"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  WifiOff,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  Activity,
} from "lucide-react";

interface VoterActivity {
  student_id: string;
  full_name: string;
  voted_at: string;
}

interface MonitoringData {
  election: {
    id: string;
    title: string;
    slug: string;
    status: string;
    start_time: string;
    end_time: string;
  };
  stats: {
    total_voters: number;
    has_voted: number;
    turnout_percent: number;
    remaining: number;
  };
  recent_activity: VoterActivity[];
}

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

export default function AdminMonitoringPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const online = useNetwork();

  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    setTimeout(() => setMounted(true), 50);

    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          loadData(true);
          return 30;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/elections/${id}/monitoring`);
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getTimeLeft() {
    if (!data) return "—";
    const end = new Date(data.election.end_time);
    const now = new Date();
    const diff = Math.max(0, end.getTime() - now.getTime());
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function openDisplayScreen() {
    if (!data?.election.slug) return;
    window.open(`/election/${data.election.slug}/display`, "_blank");
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
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const turnout = data?.stats.turnout_percent || 0;
  const voted = data?.stats.has_voted || 0;
  const total = data?.stats.total_voters || 0;
  const remaining = data?.stats.remaining || 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0B1E35" }}
    >
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }
        .pulse-dot { animation: pulse-dot 1.5s ease-in-out infinite; }
      `}</style>

      {/* Network banner */}
      {!online && (
        <div
          className="w-full py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-semibold"
          style={{ background: "#DC2626", color: "#ffffff" }}
        >
          <WifiOff className="w-3.5 h-3.5" />
          No internet — live data paused
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
          onClick={() => router.push(`/admin/elections/${id}`)}
          className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-60"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          {/* Open display screen button */}
          <button
            onClick={openDisplayScreen}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #F9A825, #E65100)",
              color: "#0B1E35",
            }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Display Screen
          </button>

          {/* Live indicator */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(22,163,74,0.15)",
              border: "1px solid rgba(22,163,74,0.3)",
            }}
          >
            <div
              className="w-2 h-2 rounded-full pulse-dot"
              style={{ background: "#4ADE80" }}
            />
            <span className="text-xs font-bold" style={{ color: "#4ADE80" }}>
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-2">
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
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Title + refresh */}
          <div
            className="flex items-start justify-between mb-6"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.4s ease",
            }}
          >
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                Admin Monitoring
              </h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                {data?.election.title}
              </p>
            </div>
            <button
              onClick={() => {
                setCountdown(30);
                loadData(true);
              }}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh · {countdown}s
            </button>
          </div>

          {/* Display screen banner */}
          <div
            className="rounded-2xl p-4 mb-6 flex items-center gap-4 cursor-pointer transition-all hover:opacity-90 active:scale-99"
            style={{
              background: "rgba(249,168,37,0.08)",
              border: "1px solid rgba(249,168,37,0.25)",
            }}
            onClick={openDisplayScreen}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(249,168,37,0.2)" }}
            >
              <Activity className="w-5 h-5" style={{ color: "#F9A825" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: "#F9A825" }}>
                Public Display Screen
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Click to open the wall display in a new tab — project this on
                the screen for the audience
              </p>
            </div>
            <ExternalLink
              className="w-4 h-4 shrink-0"
              style={{ color: "#F9A825" }}
            />
          </div>

          {/* Stats grid */}
          <div
            className="grid grid-cols-2 gap-4 mb-6"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.4s ease 0.1s",
            }}
          >
            {[
              {
                label: "Total Voters",
                value: total.toLocaleString(),
                color: "#60A5FA",
                icon: Users,
              },
              {
                label: "Votes Cast",
                value: voted.toLocaleString(),
                color: "#4ADE80",
                icon: CheckCircle2,
              },
              {
                label: "Turnout",
                value: `${turnout}%`,
                color: "#F9A825",
                icon: TrendingUp,
              },
              {
                label: "Yet to Vote",
                value: remaining.toLocaleString(),
                color: "#FB923C",
                icon: AlertTriangle,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <stat.icon
                    className="w-4 h-4"
                    style={{ color: stat.color }}
                  />
                  <p
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {stat.label}
                  </p>
                </div>
                <p
                  className="text-3xl font-black"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Turnout bar */}
          <div
            className="rounded-2xl p-5 mb-6"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <p
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Turnout Progress
              </p>
              <p className="text-lg font-black" style={{ color: "#F9A825" }}>
                {turnout}%
              </p>
            </div>
            <div
              className="w-full h-3 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-3 rounded-full transition-all duration-1000"
                style={{
                  width: mounted ? `${turnout}%` : "0%",
                  background: "linear-gradient(90deg, #F9A825, #4ADE80)",
                }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                {voted.toLocaleString()} voted
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                {remaining.toLocaleString()} remaining
              </p>
            </div>
          </div>

          {/* Time remaining */}
          <div
            className="rounded-2xl p-4 mb-6 flex items-center gap-3"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <Clock className="w-5 h-5 shrink-0" style={{ color: "#F87171" }} />
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: "#F87171" }}>
                {getTimeLeft()} remaining
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Closes{" "}
                {new Date(data?.election.end_time || "").toLocaleString(
                  "en-GB",
                  {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </p>
            </div>
          </div>

          {/* Recent activity */}
          {data?.recent_activity && data.recent_activity.length > 0 && (
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(12px)",
                transition: "all 0.4s ease 0.2s",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white">Recent Votes</h2>
                <p
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Updates in {countdown}s
                </p>
              </div>

              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {data.recent_activity.map((activity, idx) => (
                  <div
                    key={idx}
                    className="px-5 py-4 flex items-center gap-4"
                    style={{
                      borderBottom:
                        idx < data.recent_activity.length - 1
                          ? "1px solid rgba(255,255,255,0.04)"
                          : "none",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{
                        background: "rgba(22,163,74,0.15)",
                        color: "#4ADE80",
                        border: "1px solid rgba(22,163,74,0.2)",
                      }}
                    >
                      {activity.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {activity.full_name}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        {activity.student_id}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="text-xs font-bold"
                        style={{ color: "#4ADE80" }}
                      >
                        ✓ Voted
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        {formatTime(activity.voted_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No activity */}
          {(!data?.recent_activity || data.recent_activity.length === 0) && (
            <div
              className="rounded-2xl p-10 text-center"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px dashed rgba(255,255,255,0.08)",
              }}
            >
              <Activity
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: "rgba(255,255,255,0.2)" }}
              />
              <p
                className="text-sm font-semibold"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                No votes yet
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                Activity will appear here as students vote.
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
            className="w-1.5 h-1.5 rounded-full pulse-dot"
            style={{ background: online ? "#16A34A" : "#DC2626" }}
          />
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            {online ? `Auto-refreshing every 30s` : "Offline"}
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
