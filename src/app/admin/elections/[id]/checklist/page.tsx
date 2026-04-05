"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  WifiOff,
  ChevronRight,
  RefreshCw,
  Zap,
} from "lucide-react";

interface CheckItem {
  id: string;
  label: string;
  description: string;
  passed: boolean;
  critical: boolean;
  action: string | null;
  action_path: string | null;
}

interface ChecklistData {
  checks: CheckItem[];
  summary: {
    critical_issues: number;
    warnings: number;
    all_critical_passed: boolean;
    ready_to_open: boolean;
  };
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

export default function ChecklistPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const online = useNetwork();

  const [data, setData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadChecklist();
    setTimeout(() => setMounted(true), 50);
  }, []);

  async function loadChecklist(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/elections/${id}/checklist`);
      if (!res.ok) return;
      setData(await res.json());
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const summary = data?.summary;
  const checks = data?.checks || [];
  const criticalChecks = checks.filter((c) => c.critical);
  const warningChecks = checks.filter((c) => !c.critical);

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
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(74,222,128,0); }
        }
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
          onClick={() => router.push(`/admin/elections/${id}`)}
          className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-60"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadChecklist(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.5)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
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
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Title */}
          <div
            className="mb-8"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.4s ease",
            }}
          >
            <h1 className="text-2xl font-bold text-white mb-1">
              Pre-Election Checklist
            </h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Complete all critical items before opening voting
            </p>
          </div>

          {/* Status banner */}
          {summary && (
            <div
              className="rounded-2xl p-5 mb-8"
              style={{
                background: summary.ready_to_open
                  ? "rgba(22,163,74,0.1)"
                  : "rgba(220,38,38,0.1)",
                border: summary.ready_to_open
                  ? "1px solid rgba(22,163,74,0.3)"
                  : "1px solid rgba(220,38,38,0.3)",
                opacity: mounted ? 1 : 0,
                transition: "opacity 0.4s ease 0.1s",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: summary.ready_to_open
                      ? "rgba(22,163,74,0.2)"
                      : "rgba(220,38,38,0.2)",
                    animation: summary.ready_to_open
                      ? "pulse-green 2s ease infinite"
                      : "none",
                  }}
                >
                  {summary.ready_to_open ? (
                    <Zap className="w-6 h-6" style={{ color: "#4ADE80" }} />
                  ) : (
                    <AlertTriangle
                      className="w-6 h-6"
                      style={{ color: "#F87171" }}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className="text-base font-black"
                    style={{
                      color: summary.ready_to_open ? "#4ADE80" : "#F87171",
                    }}
                  >
                    {summary.ready_to_open
                      ? "Election is ready to open!"
                      : `${summary.critical_issues} critical issue${summary.critical_issues !== 1 ? "s" : ""} must be fixed`}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {summary.ready_to_open
                      ? summary.warnings > 0
                        ? `${summary.warnings} warning${summary.warnings !== 1 ? "s" : ""} — optional but recommended`
                        : "All checks passed. Safe to open voting."
                      : "Fix the critical issues below before opening voting."}
                  </p>
                </div>
              </div>

              {summary.ready_to_open && (
                <button
                  onClick={() => router.push(`/admin/elections/${id}`)}
                  className="w-full mt-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #4ADE80, #16A34A)",
                    color: "#000000",
                  }}
                >
                  Go Back & Open Voting
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Critical checks */}
          <div
            className="mb-6"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.4s ease 0.2s",
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-wide mb-3"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Critical — Must Fix
            </p>
            <div className="space-y-3">
              {criticalChecks.map((check, idx) => (
                <div
                  key={check.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: check.passed
                      ? "rgba(22,163,74,0.08)"
                      : "rgba(220,38,38,0.08)",
                    border: check.passed
                      ? "1px solid rgba(22,163,74,0.2)"
                      : "1px solid rgba(220,38,38,0.25)",
                    animation: `fadeUp 0.4s ease ${0.05 * idx}s forwards`,
                    opacity: 0,
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="shrink-0 mt-0.5">
                      {check.passed ? (
                        <CheckCircle2
                          className="w-5 h-5"
                          style={{ color: "#4ADE80" }}
                        />
                      ) : (
                        <XCircle
                          className="w-5 h-5"
                          style={{ color: "#F87171" }}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-bold"
                        style={{ color: check.passed ? "#4ADE80" : "#F87171" }}
                      >
                        {check.label}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      >
                        {check.description}
                      </p>
                    </div>

                    {/* Action button */}
                    {check.action && check.action_path && (
                      <button
                        onClick={() => router.push(check.action_path!)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95"
                        style={{
                          background: "rgba(220,38,38,0.15)",
                          color: "#F87171",
                          border: "1px solid rgba(220,38,38,0.3)",
                        }}
                      >
                        {check.action}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning checks */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.4s ease 0.3s",
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-wide mb-3"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Warnings — Recommended
            </p>
            <div className="space-y-3">
              {warningChecks.map((check, idx) => (
                <div
                  key={check.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: check.passed
                      ? "rgba(22,163,74,0.08)"
                      : "rgba(249,168,37,0.08)",
                    border: check.passed
                      ? "1px solid rgba(22,163,74,0.2)"
                      : "1px solid rgba(249,168,37,0.2)",
                    animation: `fadeUp 0.4s ease ${0.05 * idx}s forwards`,
                    opacity: 0,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {check.passed ? (
                        <CheckCircle2
                          className="w-5 h-5"
                          style={{ color: "#4ADE80" }}
                        />
                      ) : (
                        <AlertTriangle
                          className="w-5 h-5"
                          style={{ color: "#F9A825" }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-bold"
                        style={{ color: check.passed ? "#4ADE80" : "#F9A825" }}
                      >
                        {check.label}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      >
                        {check.description}
                      </p>
                    </div>
                    {check.action && check.action_path && (
                      <button
                        onClick={() => router.push(check.action_path!)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95"
                        style={{
                          background: "rgba(249,168,37,0.15)",
                          color: "#F9A825",
                          border: "1px solid rgba(249,168,37,0.3)",
                        }}
                      >
                        {check.action}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
