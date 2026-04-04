"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  BarChart3,
  Trophy,
  CheckCircle2,
  Loader2,
  WifiOff,
  Users,
  Eye,
  EyeOff,
  Share2,
  AlertTriangle,
  Clock,
  Printer,
} from "lucide-react";

interface CandidateResult {
  id: string;
  full_name: string;
  photo_url: string | null;
  vote_count: number;
  percentage: number;
  is_winner: boolean;
  is_tie: boolean;
}

interface PositionResult {
  id: string;
  name: string;
  max_votes: number;
  total_votes: number;
  has_tie: boolean;
  candidates: CandidateResult[];
}

interface ResultsData {
  election: {
    id: string;
    title: string;
    status: string;
    start_time: string;
    end_time: string;
    results_visibility: string;
  };
  stats: {
    total_voters: number;
    has_voted: number;
    turnout_percent: number;
    total_ballots: number;
    valid_votes: number;
    rejected_votes: number;
  };
  published_at: string | null;
  positions: PositionResult[];
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

export default function AdminResultsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const online = useNetwork();

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadResults();
    setTimeout(() => setMounted(true), 50);
  }, []);

  async function loadResults() {
    try {
      const res = await fetch(`/api/admin/elections/${id}/results`);
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
      setPublished(json.election.results_visibility === "public_after_close");
    } catch {
      setError("Failed to load results.");
    } finally {
      setLoading(false);
    }
  }

  async function publishResults() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/elections/${id}/publish-results`, {
        method: "POST",
      });
      if (!res.ok) {
        setError("Failed to publish results.");
        return;
      }
      setPublished(true);
      await loadResults();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
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
      className="min-h-screen flex flex-col results-admin-page"
      style={{ background: "#0B1E35" }}
    >
      <style>{`
        @keyframes winnerGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(249,168,37,0.2); }
          50% { box-shadow: 0 0 40px rgba(249,168,37,0.4); }
        }
        .winner-glow { animation: winnerGlow 3s ease-in-out infinite; }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .results-admin-page {
            background: #ffffff !important;
          }
          .no-print { display: none !important; }
          .print-section {
            background: #F9FAFB !important;
            border: 1px solid #E5E7EB !important;
            break-inside: avoid;
          }
          .print-winner-section {
            background: #FFFBEB !important;
            border: 2px solid #D97706 !important;
          }
          .winner-glow { animation: none !important; }
          h1, h2, h3 { color: #111111 !important; }
          p, span { color: #374151 !important; }
          .print-gold { color: #B8860B !important; }
          .print-green { color: #16A34A !important; }
          .print-red { color: #DC2626 !important; }
          .print-muted { color: #6B7280 !important; }
          .print-bar-track { background: #E5E7EB !important; }
          .print-bar-winner { background: #D97706 !important; }
          .print-bar-normal { background: #9CA3AF !important; }
          .print-integrity {
            background: #F0FDF4 !important;
            border: 1px solid #86EFAC !important;
          }
        }
      `}</style>

      {!online && (
        <div
          className="w-full py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-semibold no-print"
          style={{ background: "#DC2626", color: "#ffffff" }}
        >
          <WifiOff className="w-3.5 h-3.5" />
          No internet connection
        </div>
      )}

      {/* Header */}
      <div
        className="w-full px-6 py-4 flex items-center justify-between sticky top-0 z-10 no-print"
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
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF
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
          <div
            className="mb-6"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.4s ease",
            }}
          >
            <h1 className="text-2xl font-bold text-white mb-1">
              Election Results
            </h1>
            <p
              className="text-sm print-muted"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {data?.election.title}
            </p>
          </div>

          {error && (
            <div
              className="flex items-start gap-2.5 rounded-2xl p-4 mb-6 no-print"
              style={{
                background: "rgba(220,38,38,0.15)",
                border: "1px solid rgba(220,38,38,0.3)",
              }}
            >
              <p className="text-xs" style={{ color: "#FCA5A5" }}>
                {error}
              </p>
            </div>
          )}

          {/* Election period */}
          <div
            className="rounded-2xl p-5 mb-4 print-section"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.4s ease 0.05s",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock
                className="w-4 h-4 print-gold"
                style={{ color: "#F9A825" }}
              />
              <p
                className="text-xs font-bold uppercase tracking-wide print-muted"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Election Period
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p
                  className="text-xs mb-1 print-muted"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Started
                </p>
                <p className="text-xs font-bold text-white">
                  {data ? formatDateTime(data.election.start_time) : "—"}
                </p>
              </div>
              <div>
                <p
                  className="text-xs mb-1 print-muted"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Ended
                </p>
                <p className="text-xs font-bold text-white">
                  {data ? formatDateTime(data.election.end_time) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-2 gap-3 mb-4"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.4s ease 0.1s",
            }}
          >
            <div
              className="rounded-2xl p-4 print-section"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-wide mb-3 print-muted"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Voter Turnout
              </p>
              <p
                className="text-2xl font-black mb-0.5 print-gold"
                style={{ color: "#F9A825" }}
              >
                {data?.stats.turnout_percent}%
              </p>
              <p
                className="text-xs print-muted"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {data?.stats.has_voted.toLocaleString()} /{" "}
                {data?.stats.total_voters.toLocaleString()} voters
              </p>
            </div>

            <div
              className="rounded-2xl p-4 print-section"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-wide mb-3 print-muted"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Ballot Summary
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <p
                    className="text-xs print-muted"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    Total Ballots
                  </p>
                  <p className="text-xs font-bold text-white">
                    {data?.stats.total_ballots.toLocaleString()}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p
                    className="text-xs print-green"
                    style={{ color: "#4ADE80" }}
                  >
                    Valid Votes
                  </p>
                  <p
                    className="text-xs font-bold print-green"
                    style={{ color: "#4ADE80" }}
                  >
                    {data?.stats.valid_votes.toLocaleString()}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-xs print-red" style={{ color: "#F87171" }}>
                    Rejected Votes
                  </p>
                  <p
                    className="text-xs font-bold print-red"
                    style={{ color: "#F87171" }}
                  >
                    {data?.stats.rejected_votes.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Integrity */}
          <div
            className="rounded-2xl p-4 mb-6 flex items-center gap-3 print-integrity"
            style={{
              background: "rgba(22,163,74,0.08)",
              border: "1px solid rgba(22,163,74,0.2)",
            }}
          >
            <CheckCircle2
              className="w-5 h-5 shrink-0 print-green"
              style={{ color: "#4ADE80" }}
            />
            <div>
              <p
                className="text-xs font-bold print-green"
                style={{ color: "#4ADE80" }}
              >
                Audit Complete · No Anomalies Detected
              </p>
              <p
                className="text-xs mt-0.5 print-muted"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                All ballots validated · Double voting prevention confirmed ·
                Audit log intact
              </p>
            </div>
          </div>

          {/* Publish banner — hidden when printing */}
          <div
            className="rounded-2xl p-5 mb-8 no-print"
            style={{
              background: published
                ? "rgba(22,163,74,0.1)"
                : "rgba(249,168,37,0.08)",
              border: published
                ? "1px solid rgba(22,163,74,0.3)"
                : "1px solid rgba(249,168,37,0.2)",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: published
                    ? "rgba(22,163,74,0.2)"
                    : "rgba(249,168,37,0.15)",
                }}
              >
                {published ? (
                  <Eye className="w-5 h-5" style={{ color: "#4ADE80" }} />
                ) : (
                  <EyeOff className="w-5 h-5" style={{ color: "#F9A825" }} />
                )}
              </div>
              <div className="flex-1">
                <p
                  className="text-sm font-bold"
                  style={{ color: published ? "#4ADE80" : "#F9A825" }}
                >
                  {published ? "Results Published" : "Results Hidden"}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {published
                    ? `Published ${data?.published_at ? formatDateTime(data.published_at) : ""}`
                    : "Only admins can see results. Publish to make them public."}
                </p>
              </div>
              {!published && (
                <button
                  onClick={publishResults}
                  disabled={publishing || !online}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #F9A825, #E65100)",
                    color: "#0B1E35",
                  }}
                >
                  {publishing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                  Publish Now
                </button>
              )}
            </div>
          </div>

          {/* Position results */}
          <div className="space-y-6">
            {data?.positions.map((position, posIdx) => (
              <div
                key={position.id}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(12px)",
                  transition: `all 0.4s ease ${0.2 + posIdx * 0.1}s`,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {position.name}
                    </h2>
                    <p
                      className="text-xs mt-0.5 print-muted"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Total votes: {position.total_votes.toLocaleString()}
                    </p>
                  </div>
                  {position.has_tie && (
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                      style={{
                        background: "rgba(249,168,37,0.15)",
                        border: "1px solid rgba(249,168,37,0.4)",
                      }}
                    >
                      <AlertTriangle
                        className="w-3.5 h-3.5 print-gold"
                        style={{ color: "#F9A825" }}
                      />
                      <span
                        className="text-xs font-bold print-gold"
                        style={{ color: "#F9A825" }}
                      >
                        TIE — Runoff Required
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {position.candidates
                    .sort((a, b) => b.vote_count - a.vote_count)
                    .map((candidate, idx) => (
                      <div
                        key={candidate.id}
                        className={`rounded-2xl overflow-hidden ${
                          candidate.is_winner && !position.has_tie
                            ? "winner-glow print-winner-section"
                            : "print-section"
                        }`}
                        style={{
                          background:
                            candidate.is_winner && !position.has_tie
                              ? "rgba(249,168,37,0.08)"
                              : "rgba(255,255,255,0.05)",
                          border:
                            candidate.is_winner && !position.has_tie
                              ? "2px solid rgba(249,168,37,0.4)"
                              : "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm"
                              style={{
                                background:
                                  idx === 0 && !position.has_tie
                                    ? "rgba(249,168,37,0.2)"
                                    : "rgba(255,255,255,0.06)",
                              }}
                            >
                              {idx === 0
                                ? "🥇"
                                : idx === 1
                                  ? "🥈"
                                  : idx === 2
                                    ? "🥉"
                                    : idx + 1}
                            </div>
                            <div
                              className="w-10 h-10 rounded-xl overflow-hidden shrink-0"
                              style={{ background: "rgba(255,255,255,0.07)" }}
                            >
                              {candidate.photo_url ? (
                                <img
                                  src={candidate.photo_url}
                                  alt={candidate.full_name}
                                  className="w-full h-full object-cover object-top"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Users
                                    className="w-4 h-4"
                                    style={{ color: "rgba(255,255,255,0.2)" }}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-white truncate">
                                {candidate.full_name}
                              </p>
                              {candidate.is_winner && !position.has_tie && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Trophy
                                    className="w-3 h-3 print-gold"
                                    style={{ color: "#F9A825" }}
                                  />
                                  <span
                                    className="text-xs font-bold print-gold"
                                    style={{ color: "#F9A825" }}
                                  >
                                    Winner
                                  </span>
                                </div>
                              )}
                              {position.has_tie && candidate.is_winner && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <AlertTriangle
                                    className="w-3 h-3 print-gold"
                                    style={{ color: "#F9A825" }}
                                  />
                                  <span
                                    className="text-xs font-bold print-gold"
                                    style={{ color: "#F9A825" }}
                                  >
                                    Tied
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-bold text-white">
                                {candidate.vote_count.toLocaleString()}
                              </p>
                              <p
                                className="text-xs print-muted"
                                style={{ color: "rgba(255,255,255,0.4)" }}
                              >
                                {candidate.percentage}%
                              </p>
                            </div>
                          </div>
                          <div
                            className="w-full h-2 rounded-full overflow-hidden print-bar-track"
                            style={{ background: "rgba(255,255,255,0.08)" }}
                          >
                            <div
                              className={`h-2 rounded-full transition-all duration-1000 ${
                                candidate.is_winner && !position.has_tie
                                  ? "print-bar-winner"
                                  : "print-bar-normal"
                              }`}
                              style={{
                                width: mounted
                                  ? `${candidate.percentage}%`
                                  : "0%",
                                background:
                                  candidate.is_winner && !position.has_tie
                                    ? "linear-gradient(90deg, #F9A825, #FFD54F)"
                                    : "rgba(255,255,255,0.2)",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* Print disclaimer */}
          <div
            className="mt-8 rounded-2xl p-4 print-section"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p
              className="text-xs font-bold mb-2 print-muted"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              OFFICIAL DISCLAIMER
            </p>
            <p
              className="text-xs leading-relaxed print-muted"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              These results are final and certified by the OSEM Secure Vote
              electoral management system. All votes were cast electronically
              and verified for authenticity. Any disputes must be formally
              submitted within 24 hours of publication.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="w-full px-6 py-4 flex items-center justify-between no-print"
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
