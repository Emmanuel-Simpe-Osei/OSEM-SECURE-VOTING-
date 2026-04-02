"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Users,
  Vote,
  BarChart3,
  Plus,
  LogOut,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface Election {
  id: string;
  title: string;
  slug: string;
  status: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

interface DashboardStats {
  total_elections: number;
  active_elections: number;
  total_voters: number;
  total_votes_cast: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [elections, setElections] = useState<Election[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.status === 401) {
        router.replace("/admin/login?error=session_expired");
        return;
      }
      const data = await res.json();
      setElections(data.elections || []);
      setStats(data.stats || null);
      setAdminEmail(data.admin_email || "");
    } catch {
      console.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  function getStatusColor(status: string) {
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
      case "archived":
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
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #F9A825, #E65100)" }}
          >
            <ShieldCheck className="w-7 h-7" style={{ color: "#0B1E35" }} />
          </div>
          <Loader2
            className="w-5 h-5 animate-spin"
            style={{ color: "#F9A825" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0B1E35" }}
    >
      {/* Top nav */}
      <div
        className="w-full px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(249,168,37,0.15)",
              border: "1px solid rgba(249,168,37,0.3)",
            }}
          >
            <ShieldCheck className="w-5 h-5" style={{ color: "#F9A825" }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "#F9A825" }}>
              OSEM Secure Vote
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              Admin Dashboard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-white">{adminEmail}</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              Administrator
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Manage elections, voters, and results
            </p>
          </div>

          {/* Stats grid */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                {
                  label: "Total Elections",
                  value: stats.total_elections,
                  icon: Vote,
                  color: "#F9A825",
                },
                {
                  label: "Active Now",
                  value: stats.active_elections,
                  icon: Activity,
                  color: "#4ADE80",
                },
                {
                  label: "Total Voters",
                  value: stats.total_voters.toLocaleString(),
                  icon: Users,
                  color: "#60A5FA",
                },
                {
                  label: "Votes Cast",
                  value: stats.total_votes_cast.toLocaleString(),
                  icon: BarChart3,
                  color: "#A78BFA",
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
                  <div className="flex items-center justify-between mb-3">
                    <p
                      className="text-xs font-medium"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      {stat.label}
                    </p>
                    <stat.icon
                      className="w-4 h-4"
                      style={{ color: stat.color }}
                    />
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Elections section */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Elections</h2>
            <button
              onClick={() => router.push("/admin/elections/new")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #F9A825, #E65100)",
                color: "#0B1E35",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              New Election
            </button>
          </div>

          {/* Elections list */}
          {elections.length === 0 ? (
            <div
              className="rounded-2xl p-12 text-center"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px dashed rgba(255,255,255,0.1)",
              }}
            >
              <Vote
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: "rgba(255,255,255,0.2)" }}
              />
              <p
                className="text-sm font-semibold"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                No elections yet
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                Create your first election to get started
              </p>
              <button
                onClick={() => router.push("/admin/elections/new")}
                className="mt-4 px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{
                  background: "rgba(249,168,37,0.15)",
                  color: "#F9A825",
                  border: "1px solid rgba(249,168,37,0.3)",
                }}
              >
                Create Election
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {elections.map((election) => {
                const statusStyle = getStatusColor(election.status);
                const startDate = new Date(election.start_time);
                const endDate = new Date(election.end_time);
                return (
                  <button
                    key={election.id}
                    onClick={() =>
                      router.push(`/admin/elections/${election.id}`)
                    }
                    className="w-full text-left transition-all active:scale-99"
                  >
                    <div
                      className="rounded-2xl p-5 flex items-center gap-4 transition-all duration-200"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {/* Status dot */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: statusStyle.bg,
                          border: `1px solid ${statusStyle.border}`,
                        }}
                      >
                        {election.status === "active" ? (
                          <Activity
                            className="w-5 h-5"
                            style={{ color: statusStyle.text }}
                          />
                        ) : election.status === "closed" ||
                          election.status === "archived" ? (
                          <CheckCircle2
                            className="w-5 h-5"
                            style={{ color: statusStyle.text }}
                          />
                        ) : election.status === "paused" ? (
                          <AlertTriangle
                            className="w-5 h-5"
                            style={{ color: statusStyle.text }}
                          />
                        ) : (
                          <Clock
                            className="w-5 h-5"
                            style={{ color: statusStyle.text }}
                          />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-sm text-white truncate">
                            {election.title}
                          </p>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold shrink-0"
                            style={{
                              background: statusStyle.bg,
                              color: statusStyle.text,
                            }}
                          >
                            {election.status}
                          </span>
                        </div>
                        <p
                          className="text-xs"
                          style={{ color: "rgba(255,255,255,0.3)" }}
                        >
                          {startDate.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {" → "}
                          {endDate.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <ChevronRight
                        className="w-4 h-4 shrink-0"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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
