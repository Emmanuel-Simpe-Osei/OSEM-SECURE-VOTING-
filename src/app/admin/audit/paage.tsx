"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  Search,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  WifiOff,
  RefreshCw,
  Filter,
  AlertCircle,
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils/time";

interface AuditLog {
  id: string;
  actor_type: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  ip_hash: string;
  created_at: string;
}

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
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

function getActionStyle(action: string): {
  color: string;
  bg: string;
  border: string;
} {
  if (action.includes("RATE_LIMIT") || action.includes("SUSPICIOUS")) {
    return {
      color: "#F87171",
      bg: "rgba(220,38,38,0.12)",
      border: "rgba(220,38,38,0.25)",
    };
  }
  if (
    action.includes("FAILED") ||
    action.includes("MISMATCH") ||
    action.includes("UNAUTHORIZED") ||
    action.includes("NOT_FOUND")
  ) {
    return {
      color: "#FB923C",
      bg: "rgba(249,115,22,0.12)",
      border: "rgba(249,115,22,0.25)",
    };
  }
  if (
    action.includes("SUCCESS") ||
    action.includes("VERIFIED") ||
    action.includes("eligible")
  ) {
    return {
      color: "#4ADE80",
      bg: "rgba(22,163,74,0.12)",
      border: "rgba(22,163,74,0.25)",
    };
  }
  if (action.includes("RESET") || action.includes("OVERRIDE")) {
    return {
      color: "#F9A825",
      bg: "rgba(249,168,37,0.12)",
      border: "rgba(249,168,37,0.25)",
    };
  }
  return {
    color: "#60A5FA",
    bg: "rgba(96,165,250,0.08)",
    border: "rgba(96,165,250,0.2)",
  };
}

const ACTION_FILTERS = [
  { label: "All", value: "" },
  { label: "🚨 Rate Limited", value: "RATE_LIMIT_EXCEEDED" },
  { label: "❌ Login Failed", value: "ADMIN_LOGIN_FAILED" },
  { label: "✅ Login Success", value: "ADMIN_LOGIN_SUCCESS" },
  { label: "🗳 Session Mismatch", value: "SESSION_MISMATCH" },
  { label: "✅ Session Verified", value: "SESSION_VERIFIED" },
  { label: "🔑 Override", value: "manual_override" },
  { label: "🔄 Eligibility Reset", value: "eligibility_check_reset" },
  { label: "📋 Election Created", value: "ELECTION_CREATED" },
  { label: "📋 Duplicated", value: "election_duplicated" },
];

export default function AuditPage() {
  const router = useRouter();
  const online = useNetwork();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const PAGE_SIZE = 50;

  useEffect(() => {
    loadLogs(true);
    setTimeout(() => setMounted(true), 50);
  }, [actionFilter]);

  function showToast(type: "success" | "error", message: string) {
    const toastId = Date.now();
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== toastId)),
      3500,
    );
  }

  async function loadLogs(reset = false) {
    const currentPage = reset ? 0 : page;
    if (reset) {
      setLoading(true);
      setPage(0);
      setLogs([]);
    }

    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(currentPage * PAGE_SIZE),
      });
      if (actionFilter) params.set("action", actionFilter);
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/admin/audit?${params}`);
      if (res.status === 401) {
        router.replace("/admin/login?error=session_expired");
        return;
      }
      if (res.status === 403) {
        router.replace("/admin/dashboard");
        return;
      }
      const data = await res.json();
      const newLogs: AuditLog[] = data.logs || [];
      setHasMore(newLogs.length === PAGE_SIZE);
      if (reset) {
        setLogs(newLogs);
      } else {
        setLogs((prev) => [...prev, ...newLogs]);
        setPage((p) => p + 1);
      }
    } catch {
      showToast("error", "Failed to load audit logs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await loadLogs(true);
    showToast("success", "Audit logs refreshed.");
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

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0B1E35" }}
    >
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl pointer-events-auto"
            style={{
              background:
                toast.type === "success"
                  ? "rgba(22,163,74,0.95)"
                  : "rgba(220,38,38,0.95)",
              border: `1px solid ${
                toast.type === "success"
                  ? "rgba(74,222,128,0.3)"
                  : "rgba(252,165,165,0.3)"
              }`,
              backdropFilter: "blur(12px)",
              animation: "slideIn 0.2s ease forwards",
              minWidth: "260px",
            }}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-white" />
            )}
            <p className="text-xs font-semibold text-white">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* Log detail modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl p-6 space-y-4 overflow-y-auto"
            style={{
              background: "#0F2540",
              border: "1px solid rgba(255,255,255,0.12)",
              maxHeight: "80vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">Log Detail</p>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <span
                  style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}
                >
                  ✕
                </span>
              </button>
            </div>

            {(() => {
              const style = getActionStyle(selectedLog.action);
              return (
                <span
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: style.bg,
                    color: style.color,
                    border: `1px solid ${style.border}`,
                  }}
                >
                  {selectedLog.action}
                </span>
              );
            })()}

            <div className="space-y-3">
              {[
                { label: "Log ID", value: selectedLog.id },
                {
                  label: "Time",
                  value: `${formatDate(selectedLog.created_at)} ${formatTime(selectedLog.created_at)}`,
                },
                { label: "Actor Type", value: selectedLog.actor_type },
                { label: "Actor ID", value: selectedLog.actor_id },
                { label: "Target Type", value: selectedLog.target_type },
                { label: "Target ID", value: selectedLog.target_id },
                { label: "IP Hash", value: selectedLog.ip_hash },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p
                    className="text-xs font-bold uppercase tracking-wide mb-1"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    {label}
                  </p>
                  <p
                    className="text-xs font-mono break-all"
                    style={{ color: "rgba(255,255,255,0.8)" }}
                  >
                    {value}
                  </p>
                </div>
              ))}

              <div>
                <p
                  className="text-xs font-bold uppercase tracking-wide mb-1"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Metadata
                </p>
                <pre
                  className="text-xs font-mono break-all whitespace-pre-wrap rounded-xl p-3"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
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
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Title */}
          <div
            className="mb-6"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.4s ease",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Audit Log
                </h1>
                <p
                  className="text-sm"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Every action, every admin, every attempt — logged.
                </p>
              </div>
              <button
                onClick={refresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Suspicious activity banner */}
          {logs.some((l) => l.action === "RATE_LIMIT_EXCEEDED") && (
            <div
              className="rounded-2xl p-4 mb-6 flex items-start gap-3"
              style={{
                background: "rgba(220,38,38,0.1)",
                border: "1px solid rgba(220,38,38,0.3)",
                opacity: mounted ? 1 : 0,
                transition: "opacity 0.4s ease 0.1s",
              }}
            >
              <AlertTriangle
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: "#F87171" }}
              />
              <div>
                <p
                  className="text-xs font-bold mb-1"
                  style={{ color: "#F87171" }}
                >
                  Suspicious Activity Detected
                </p>
                <p
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Rate limit violations found in recent logs. Review the flagged
                  entries below.
                </p>
              </div>
            </div>
          )}

          {/* Search + filter */}
          <div
            className="space-y-3 mb-6"
            style={{
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.4s ease 0.15s",
            }}
          >
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadLogs(true)}
                  placeholder="Search by actor ID, action, target..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#ffffff",
                  }}
                />
              </div>
              <button
                onClick={() => loadLogs(true)}
                className="px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #F9A825, #E65100)",
                  color: "#0B1E35",
                }}
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>

            {/* Action filter pills */}
            <div className="flex gap-2 flex-wrap items-center">
              <Filter
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: "rgba(255,255,255,0.3)" }}
              />
              {ACTION_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setActionFilter(f.value)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background:
                      actionFilter === f.value
                        ? "rgba(249,168,37,0.2)"
                        : "rgba(255,255,255,0.06)",
                    color:
                      actionFilter === f.value
                        ? "#F9A825"
                        : "rgba(255,255,255,0.5)",
                    border:
                      actionFilter === f.value
                        ? "1px solid rgba(249,168,37,0.4)"
                        : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Log count */}
          <p
            className="text-xs mb-4"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Showing {logs.length} log{logs.length !== 1 ? "s" : ""}
            {actionFilter ? ` filtered by "${actionFilter}"` : ""}
          </p>

          {/* Logs */}
          {logs.length === 0 ? (
            <div
              className="rounded-2xl p-12 text-center"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px dashed rgba(255,255,255,0.08)",
              }}
            >
              <Search
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: "rgba(255,255,255,0.15)" }}
              />
              <p
                className="text-sm font-semibold"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                No logs found
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const style = getActionStyle(log.action);
                const isAlert =
                  log.action === "RATE_LIMIT_EXCEEDED" ||
                  log.action.includes("FAILED") ||
                  log.action.includes("MISMATCH") ||
                  log.action.includes("UNAUTHORIZED");

                return (
                  <button
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="w-full text-left rounded-2xl p-4 transition-all hover:opacity-80 active:scale-99"
                    style={{
                      background: isAlert
                        ? "rgba(220,38,38,0.06)"
                        : "rgba(255,255,255,0.04)",
                      border: isAlert
                        ? "1px solid rgba(220,38,38,0.2)"
                        : "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="shrink-0 px-2 py-0.5 rounded-lg text-xs font-bold"
                        style={{
                          background: style.bg,
                          color: style.color,
                          border: `1px solid ${style.border}`,
                          fontSize: "10px",
                        }}
                      >
                        {log.action.replace(/_/g, " ")}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs font-semibold truncate"
                            style={{ color: "rgba(255,255,255,0.7)" }}
                          >
                            {log.actor_type}: {log.actor_id.substring(0, 20)}
                            {log.actor_id.length > 20 ? "..." : ""}
                          </span>
                          <span
                            className="text-xs shrink-0"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                          >
                            → {log.target_type}
                          </span>
                        </div>
                        {log.metadata &&
                          Object.keys(log.metadata).length > 0 && (
                            <p
                              className="text-xs mt-0.5 truncate"
                              style={{ color: "rgba(255,255,255,0.3)" }}
                            >
                              {Object.entries(log.metadata)
                                .slice(0, 3)
                                .map(
                                  ([k, v]) =>
                                    `${k}: ${String(v).substring(0, 30)}`,
                                )
                                .join(" · ")}
                            </p>
                          )}
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          className="text-xs"
                          style={{ color: "rgba(255,255,255,0.4)" }}
                        >
                          {formatTime(log.created_at)}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "rgba(255,255,255,0.2)" }}
                        >
                          {formatDate(log.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Load more */}
              {hasMore && (
                <button
                  onClick={() => loadLogs(false)}
                  className="w-full py-4 rounded-2xl text-xs font-bold transition-all active:scale-95 mt-2"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.4)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Load more
                </button>
              )}
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
