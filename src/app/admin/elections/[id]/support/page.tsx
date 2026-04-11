"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  WifiOff,
  User,
  AlertTriangle,
  Key,
  Edit3,
  X,
  RefreshCw,
  ClipboardX,
} from "lucide-react";

interface Voter {
  id: string;
  student_id: string;
  full_name: string;
  school_email: string;
  department: string | null;
  level: string | null;
  has_voted: boolean;
  eligible: boolean;
}

interface EligibilityCheck {
  result: string;
  checked_at: string;
}

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

interface ConfirmDialog {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmStyle: "danger" | "warning";
  onConfirm: () => void;
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

export default function SupportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const online = useNetwork();

  const [electionTitle, setElectionTitle] = useState("");
  const [electionStatus, setElectionStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Voter[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit email
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // Manual override
  const [overrideReason, setOverrideReason] = useState("");
  const [overridingVoter, setOverridingVoter] = useState<string | null>(null);
  const [processingOverride, setProcessingOverride] = useState(false);

  // Eligibility reset
  const [eligibilityChecks, setEligibilityChecks] = useState<
    Record<string, EligibilityCheck | null>
  >({});
  const [resetEligibilityVoter, setResetEligibilityVoter] = useState<
    string | null
  >(null);
  const [resetEligibilityReason, setResetEligibilityReason] = useState("");
  const [processingEligibilityReset, setProcessingEligibilityReset] =
    useState(false);

  // Confirm dialog
  const [confirm, setConfirm] = useState<ConfirmDialog>({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    confirmStyle: "danger",
    onConfirm: () => {},
  });

  useEffect(() => {
    loadElection();
    setTimeout(() => setMounted(true), 50);
  }, []);

  async function loadElection() {
    try {
      const res = await fetch(`/api/admin/elections/${id}`);
      if (!res.ok) {
        router.replace("/admin/dashboard");
        return;
      }
      const data = await res.json();
      setElectionTitle(data.election.title);
      setElectionStatus(data.election.status);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  }

  function showToast(type: "success" | "error", message: string) {
    const toastId = Date.now();
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== toastId)),
      3500,
    );
  }

  function showConfirm(
    title: string,
    message: string,
    confirmLabel: string,
    confirmStyle: "danger" | "warning",
    onConfirm: () => void,
  ) {
    setConfirm({
      open: true,
      title,
      message,
      confirmLabel,
      confirmStyle,
      onConfirm,
    });
  }

  function closeConfirm() {
    setConfirm({
      open: false,
      title: "",
      message: "",
      confirmLabel: "Confirm",
      confirmStyle: "danger",
      onConfirm: () => {},
    });
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setHasSearched(true);
    setEligibilityChecks({});
    try {
      const res = await fetch(
        `/api/admin/support/search?election_id=${id}&q=${encodeURIComponent(searchQuery.trim())}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const voters: Voter[] = data.voters || [];
      setSearchResults(voters);
      if (voters.length > 0) {
        loadEligibilityForVoters(voters);
      }
    } catch {
      showToast("error", "Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  async function loadEligibilityForVoters(voters: Voter[]) {
    const results: Record<string, EligibilityCheck | null> = {};
    await Promise.all(
      voters.map(async (v) => {
        try {
          const res = await fetch(
            `/api/admin/support/search?election_id=${id}&check_eligibility=1&student_id=${encodeURIComponent(v.student_id)}`,
          );
          if (res.ok) {
            const data = await res.json();
            results[v.id] = data.eligibility_check ?? null;
          } else {
            results[v.id] = null;
          }
        } catch {
          results[v.id] = null;
        }
      }),
    );
    setEligibilityChecks(results);
  }

  async function handleEmailUpdate(voterId: string) {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      showToast("error", "Please enter a valid email address.");
      return;
    }
    setSavingEmail(true);
    try {
      const res = await fetch(`/api/admin/support/update-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voter_id: voterId,
          election_id: id,
          new_email: newEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error || "Failed to update email.");
        return;
      }
      showToast("success", "Email updated successfully.");
      setEditingEmail(null);
      setNewEmail("");
      setSearchResults((prev) =>
        prev.map((v) =>
          v.id === voterId ? { ...v, school_email: newEmail.trim() } : v,
        ),
      );
    } catch {
      showToast("error", "Network error. Please try again.");
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleManualOverride(voter: Voter) {
    if (!overrideReason.trim()) {
      showToast("error", "Please enter a reason for the override.");
      return;
    }
    showConfirm(
      "Confirm Manual Override",
      `You are about to manually mark ${voter.full_name} as voted. This action is logged and cannot be undone. Reason: "${overrideReason}"`,
      "Confirm Override",
      "danger",
      async () => {
        closeConfirm();
        setProcessingOverride(true);
        try {
          const res = await fetch(`/api/admin/support/manual-override`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              voter_id: voter.id,
              election_id: id,
              student_id: voter.student_id,
              reason: overrideReason.trim(),
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            showToast("error", data.error || "Override failed.");
            return;
          }
          showToast(
            "success",
            `${voter.full_name} marked as voted. Bypass code: ${data.bypass_code}`,
          );
          setOverridingVoter(null);
          setOverrideReason("");
          setSearchResults((prev) =>
            prev.map((v) =>
              v.id === voter.id ? { ...v, has_voted: true } : v,
            ),
          );
        } catch {
          showToast("error", "Network error. Please try again.");
        } finally {
          setProcessingOverride(false);
        }
      },
    );
  }

  async function handleResetEligibility(voter: Voter) {
    if (!resetEligibilityReason.trim()) {
      showToast("error", "Please enter a reason for the reset.");
      return;
    }
    showConfirm(
      "Reset Eligibility Check",
      `This will allow ${voter.full_name} to complete the eligibility check again online. Reason: "${resetEligibilityReason}"`,
      "Confirm Reset",
      "warning",
      async () => {
        closeConfirm();
        setProcessingEligibilityReset(true);
        try {
          const res = await fetch(`/api/admin/support/reset-eligibility`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              election_id: id,
              student_id: voter.student_id,
              school_email: voter.school_email,
              reason: resetEligibilityReason.trim(),
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            showToast("error", data.error || "Reset failed.");
            return;
          }
          showToast("success", data.message || "Eligibility check reset.");
          setResetEligibilityVoter(null);
          setResetEligibilityReason("");
          setEligibilityChecks((prev) => ({ ...prev, [voter.id]: null }));
        } catch {
          showToast("error", "Network error. Please try again.");
        } finally {
          setProcessingEligibilityReset(false);
        }
      },
    );
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
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
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
              minWidth: "280px",
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

      {/* Confirm dialog */}
      {confirm.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6"
            style={{
              background: "#0F2540",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <h3 className="text-base font-bold text-white mb-2">
              {confirm.title}
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {confirm.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={closeConfirm}
                className="flex-1 py-3 rounded-2xl text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirm.onConfirm}
                className="flex-1 py-3 rounded-2xl text-xs font-bold transition-all active:scale-95"
                style={{
                  background:
                    confirm.confirmStyle === "danger"
                      ? "rgba(220,38,38,0.9)"
                      : "rgba(249,168,37,0.9)",
                  color: "#ffffff",
                }}
              >
                {confirm.confirmLabel}
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
          onClick={() => router.push(`/admin/elections/${id}`)}
          className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-60"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
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
              Voter Support
            </h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              {electionTitle}
            </p>
          </div>

          {/* Warning banner */}
          <div
            className="rounded-2xl p-4 mb-6 flex items-start gap-3"
            style={{
              background: "rgba(249,168,37,0.08)",
              border: "1px solid rgba(249,168,37,0.2)",
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.4s ease 0.1s",
            }}
          >
            <AlertTriangle
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: "#F9A825" }}
            />
            <div>
              <p
                className="text-xs font-bold mb-1"
                style={{ color: "#F9A825" }}
              >
                Admin Override Zone
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                All actions here are logged with your admin ID, timestamp and
                reason. Only use this to assist students with genuine technical
                issues. Misuse is a serious violation.
              </p>
            </div>
          </div>

          {/* Search */}
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
              Find Voter
            </p>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by student ID, name or email..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#ffffff",
                  }}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #F9A825, #E65100)",
                  color: "#0B1E35",
                }}
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Search
              </button>
            </div>
          </div>

          {/* Search results */}
          {hasSearched && (
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transition: "opacity 0.3s ease",
              }}
            >
              {searchResults.length === 0 ? (
                <div
                  className="rounded-2xl p-8 text-center"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <User
                    className="w-10 h-10 mx-auto mb-3"
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  />
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    No voter found
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "rgba(255,255,255,0.2)" }}
                  >
                    Try searching by student ID or full name
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.map((voter) => {
                    const eligCheck = eligibilityChecks[voter.id];
                    const hasFailedEligibility =
                      eligCheck !== undefined &&
                      eligCheck !== null &&
                      eligCheck.result !== "eligible";

                    return (
                      <div
                        key={voter.id}
                        className="rounded-2xl overflow-hidden"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {/* Voter info */}
                        <div className="p-5">
                          <div className="flex items-start gap-4">
                            <div
                              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-base font-black"
                              style={{
                                background: voter.has_voted
                                  ? "rgba(22,163,74,0.15)"
                                  : "rgba(255,255,255,0.08)",
                                color: voter.has_voted
                                  ? "#4ADE80"
                                  : "rgba(255,255,255,0.6)",
                                border: voter.has_voted
                                  ? "1px solid rgba(22,163,74,0.3)"
                                  : "1px solid rgba(255,255,255,0.1)",
                              }}
                            >
                              {voter.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="text-sm font-bold text-white">
                                  {voter.full_name}
                                </p>
                                <span
                                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                                  style={{
                                    background: voter.has_voted
                                      ? "rgba(22,163,74,0.15)"
                                      : "rgba(255,255,255,0.08)",
                                    color: voter.has_voted
                                      ? "#4ADE80"
                                      : "rgba(255,255,255,0.4)",
                                  }}
                                >
                                  {voter.has_voted ? "✓ Voted" : "Not voted"}
                                </span>
                                {hasFailedEligibility && (
                                  <span
                                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                                    style={{
                                      background: "rgba(220,38,38,0.15)",
                                      color: "#F87171",
                                      border: "1px solid rgba(220,38,38,0.2)",
                                    }}
                                  >
                                    Eligibility failed
                                  </span>
                                )}
                              </div>
                              <p
                                className="text-xs font-mono"
                                style={{ color: "rgba(255,255,255,0.5)" }}
                              >
                                {voter.student_id}
                              </p>
                              <p
                                className="text-xs mt-0.5"
                                style={{ color: "rgba(255,255,255,0.4)" }}
                              >
                                {voter.school_email}
                              </p>
                              {voter.department && (
                                <p
                                  className="text-xs mt-0.5"
                                  style={{ color: "rgba(255,255,255,0.3)" }}
                                >
                                  {voter.department}
                                  {voter.level ? ` · Level ${voter.level}` : ""}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ── Actions block ── */}
                        <div
                          style={{
                            borderTop: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          {/* Eligibility reset — always show if student has a failed check */}
                          {hasFailedEligibility && (
                            <div
                              className="p-4"
                              style={{
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.04)",
                              }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <ClipboardX
                                    className="w-3.5 h-3.5"
                                    style={{ color: "#F87171" }}
                                  />
                                  <p
                                    className="text-xs font-bold"
                                    style={{ color: "#F87171" }}
                                  >
                                    Eligibility Check Failed
                                  </p>
                                </div>
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full font-bold capitalize"
                                  style={{
                                    background: "rgba(220,38,38,0.12)",
                                    color: "#F87171",
                                    border: "1px solid rgba(220,38,38,0.2)",
                                  }}
                                >
                                  {eligCheck!.result.replace(/_/g, " ")}
                                </span>
                              </div>

                              {resetEligibilityVoter === voter.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={resetEligibilityReason}
                                    onChange={(e) =>
                                      setResetEligibilityReason(e.target.value)
                                    }
                                    placeholder="Reason for reset (required)..."
                                    autoFocus
                                    className="w-full px-3 py-2.5 rounded-xl text-xs outline-none"
                                    style={{
                                      background: "rgba(255,255,255,0.07)",
                                      border: "1px solid rgba(248,113,113,0.3)",
                                      color: "#ffffff",
                                    }}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        setResetEligibilityVoter(null);
                                        setResetEligibilityReason("");
                                      }}
                                      className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                                      style={{
                                        background: "rgba(255,255,255,0.05)",
                                        color: "rgba(255,255,255,0.5)",
                                      }}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleResetEligibility(voter)
                                      }
                                      disabled={
                                        processingEligibilityReset ||
                                        !resetEligibilityReason.trim()
                                      }
                                      className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                                      style={{
                                        background: "rgba(248,113,113,0.15)",
                                        color: "#F87171",
                                        border:
                                          "1px solid rgba(248,113,113,0.3)",
                                      }}
                                    >
                                      {processingEligibilityReset ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <RefreshCw className="w-3.5 h-3.5" />
                                      )}
                                      Confirm Reset
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() =>
                                    setResetEligibilityVoter(voter.id)
                                  }
                                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                                  style={{
                                    background: "rgba(248,113,113,0.1)",
                                    color: "#F87171",
                                    border: "1px solid rgba(248,113,113,0.2)",
                                  }}
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Reset Eligibility Check
                                </button>
                              )}
                            </div>
                          )}

                          {/* Election active actions */}
                          {!voter.has_voted && electionStatus === "active" && (
                            <>
                              {/* Fix email */}
                              <div
                                className="p-4"
                                style={{
                                  borderBottom:
                                    "1px solid rgba(255,255,255,0.04)",
                                }}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Edit3
                                      className="w-3.5 h-3.5"
                                      style={{ color: "#60A5FA" }}
                                    />
                                    <p
                                      className="text-xs font-bold"
                                      style={{ color: "#60A5FA" }}
                                    >
                                      Fix Email
                                    </p>
                                  </div>
                                  <p
                                    className="text-xs"
                                    style={{
                                      color: "rgba(255,255,255,0.3)",
                                    }}
                                  >
                                    If student&apos;s email is wrong
                                  </p>
                                </div>

                                {editingEmail === voter.id ? (
                                  <div className="flex gap-2">
                                    <input
                                      type="email"
                                      value={newEmail}
                                      onChange={(e) =>
                                        setNewEmail(e.target.value)
                                      }
                                      placeholder="Enter correct email..."
                                      autoFocus
                                      className="flex-1 px-3 py-2.5 rounded-xl text-xs outline-none"
                                      style={{
                                        background: "rgba(255,255,255,0.07)",
                                        border:
                                          "1px solid rgba(255,255,255,0.1)",
                                        color: "#ffffff",
                                      }}
                                    />
                                    <button
                                      onClick={() =>
                                        handleEmailUpdate(voter.id)
                                      }
                                      disabled={savingEmail}
                                      className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
                                      style={{
                                        background: "rgba(96,165,250,0.2)",
                                        color: "#60A5FA",
                                        border:
                                          "1px solid rgba(96,165,250,0.3)",
                                      }}
                                    >
                                      {savingEmail ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        "Save"
                                      )}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingEmail(null);
                                        setNewEmail("");
                                      }}
                                      className="px-3 py-2.5 rounded-xl text-xs transition-all active:scale-95"
                                      style={{
                                        background: "rgba(255,255,255,0.05)",
                                        color: "rgba(255,255,255,0.4)",
                                      }}
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingEmail(voter.id);
                                      setNewEmail(voter.school_email);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                                    style={{
                                      background: "rgba(96,165,250,0.1)",
                                      color: "#60A5FA",
                                      border: "1px solid rgba(96,165,250,0.2)",
                                    }}
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    Edit Email
                                  </button>
                                )}
                              </div>

                              {/* Manual override */}
                              <div className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Key
                                      className="w-3.5 h-3.5"
                                      style={{ color: "#F9A825" }}
                                    />
                                    <p
                                      className="text-xs font-bold"
                                      style={{ color: "#F9A825" }}
                                    >
                                      Manual Override
                                    </p>
                                  </div>
                                  <p
                                    className="text-xs"
                                    style={{
                                      color: "rgba(255,255,255,0.3)",
                                    }}
                                  >
                                    Last resort only
                                  </p>
                                </div>

                                {overridingVoter === voter.id ? (
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={overrideReason}
                                      onChange={(e) =>
                                        setOverrideReason(e.target.value)
                                      }
                                      placeholder="Reason for override (required)..."
                                      autoFocus
                                      className="w-full px-3 py-2.5 rounded-xl text-xs outline-none"
                                      style={{
                                        background: "rgba(255,255,255,0.07)",
                                        border:
                                          "1px solid rgba(249,168,37,0.3)",
                                        color: "#ffffff",
                                      }}
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          setOverridingVoter(null);
                                          setOverrideReason("");
                                        }}
                                        className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                                        style={{
                                          background: "rgba(255,255,255,0.05)",
                                          color: "rgba(255,255,255,0.5)",
                                        }}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleManualOverride(voter)
                                        }
                                        disabled={
                                          processingOverride ||
                                          !overrideReason.trim()
                                        }
                                        className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                                        style={{
                                          background: "rgba(249,168,37,0.2)",
                                          color: "#F9A825",
                                          border:
                                            "1px solid rgba(249,168,37,0.4)",
                                        }}
                                      >
                                        {processingOverride ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Key className="w-3.5 h-3.5" />
                                        )}
                                        Confirm Override
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setOverridingVoter(voter.id)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                                    style={{
                                      background: "rgba(249,168,37,0.1)",
                                      color: "#F9A825",
                                      border: "1px solid rgba(249,168,37,0.2)",
                                    }}
                                  >
                                    <Key className="w-3 h-3" />
                                    Manual Override
                                  </button>
                                )}
                              </div>
                            </>
                          )}

                          {/* Already voted */}
                          {voter.has_voted && (
                            <div className="px-5 py-3">
                              <p
                                className="text-xs"
                                style={{ color: "rgba(22,163,74,0.7)" }}
                              >
                                ✓ This voter has already cast their ballot. No
                                action needed.
                              </p>
                            </div>
                          )}

                          {/* Election not active — no override actions */}
                          {!voter.has_voted &&
                            electionStatus !== "active" &&
                            !hasFailedEligibility && (
                              <div className="px-5 py-3">
                                <p
                                  className="text-xs"
                                  style={{
                                    color: "rgba(255,255,255,0.3)",
                                  }}
                                >
                                  Override actions are only available while the
                                  election is active.
                                </p>
                              </div>
                            )}

                          {/* Election not active but has eligibility issue */}
                          {!voter.has_voted &&
                            electionStatus !== "active" &&
                            hasFailedEligibility && (
                              <div className="px-5 py-3">
                                <p
                                  className="text-xs"
                                  style={{
                                    color: "rgba(255,255,255,0.3)",
                                  }}
                                >
                                  Voting override is only available while the
                                  election is active. Eligibility reset is
                                  available above.
                                </p>
                              </div>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!hasSearched && (
            <div
              className="rounded-2xl p-10 text-center"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px dashed rgba(255,255,255,0.08)",
                opacity: mounted ? 1 : 0,
                transition: "opacity 0.4s ease 0.3s",
              }}
            >
              <Search
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: "rgba(255,255,255,0.2)" }}
              />
              <p
                className="text-sm font-semibold"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Search for a voter
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                Enter student ID, name or email to find a voter
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
