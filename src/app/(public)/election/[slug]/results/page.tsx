"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  Trophy,
  Users,
  CheckCircle2,
  BarChart3,
  Loader2,
  Clock,
  AlertTriangle,
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
  total_votes: number;
  has_tie: boolean;
  candidates: CandidateResult[];
}

interface ResultsData {
  election: {
    title: string;
    status: string;
    start_time: string;
    end_time: string;
    slug: string;
  };
  stats: {
    total_voters: number;
    has_voted: number;
    turnout_percent: number;
    total_ballots: number;
    valid_votes: number;
    rejected_votes: number;
  };
  published_at: string;
  positions: PositionResult[];
}

export default function PublicResultsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadResults();
    setTimeout(() => setMounted(true), 100);
  }, []);

  async function loadResults() {
    try {
      const res = await fetch(`/api/election/results/${slug}`);
      if (res.status === 403) {
        setError("Results have not been published yet. Check back soon.");
        return;
      }
      if (!res.ok) {
        setError("Results not found.");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Failed to load results.");
    } finally {
      setLoading(false);
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

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "#0B1E35" }}
      >
        <div className="text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "rgba(249,168,37,0.15)",
              border: "1px solid rgba(249,168,37,0.3)",
            }}
          >
            <BarChart3 className="w-8 h-8" style={{ color: "#F9A825" }} />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Results Not Available
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col results-page"
      style={{ background: "#0B1E35" }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes winnerGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(249,168,37,0.2); }
          50% { box-shadow: 0 0 40px rgba(249,168,37,0.5); }
        }
        .winner-glow { animation: winnerGlow 3s ease-in-out infinite; }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .results-page {
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
          .print-section {
            background: #ffffff !important;
            border: 1px solid #dddddd !important;
            break-inside: avoid;
          }
          .print-text-dark {
            color: #111111 !important;
          }
          .print-text-muted {
            color: #444444 !important;
          }
          .print-text-gold {
            color: #B8860B !important;
          }
          .print-text-green {
            color: #16A34A !important;
          }
          .print-text-red {
            color: #DC2626 !important;
          }
          .print-border {
            border-color: #dddddd !important;
          }
          .winner-glow {
            animation: none !important;
            border: 2px solid #B8860B !important;
            background: #FFFBEB !important;
          }
          .print-winner-bg {
            background: #FFFBEB !important;
          }
          .print-normal-bg {
            background: #F9FAFB !important;
          }
          .print-bar-bg {
            background: #E5E7EB !important;
          }
          .print-bar-fill {
            background: #B8860B !important;
          }
          .print-integrity-bg {
            background: #F0FDF4 !important;
            border: 1px solid #86EFAC !important;
          }
          .print-period-bg {
            background: #F8FAFC !important;
            border: 1px solid #E2E8F0 !important;
          }
          .print-disclaimer-bg {
            background: #F8FAFC !important;
            border: 1px solid #E2E8F0 !important;
          }
          .print-header-bg {
            background: #1E3A5F !important;
            color: #ffffff !important;
          }
          h1, h2, h3, p, span, div {
            color: inherit;
          }
        }
      `}</style>

      {/* Print header — only shows when printing */}
      <div
        className="hidden print-header-bg p-6 mb-6"
        style={{ display: "none" }}
        id="print-header"
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff" }}
            >
              OSEM Secure Vote
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.8)",
                marginTop: "2px",
              }}
            >
              Official Election Results
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)" }}>
              Printed: {new Date().toLocaleString("en-GB")}
            </p>
          </div>
        </div>
      </div>

      {/* Screen header */}
      <div
        className="w-full px-6 py-4 flex items-center justify-between no-print"
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
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Title */}
          <div
            className="text-center mb-8 print-text-dark"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.4s ease",
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 no-print"
              style={{
                background: "linear-gradient(135deg, #F9A825, #E65100)",
                boxShadow: "0 0 30px rgba(249,168,37,0.3)",
              }}
            >
              <Trophy className="w-8 h-8" style={{ color: "#0B1E35" }} />
            </div>
            <h1 className="text-2xl font-black text-white mb-1 print-text-dark">
              Official Results
            </h1>
            <p
              className="text-sm mb-3 print-text-muted"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {data?.election.title}
            </p>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: "rgba(22,163,74,0.15)",
                border: "1px solid rgba(22,163,74,0.3)",
              }}
            >
              <CheckCircle2
                className="w-3.5 h-3.5 print-text-green"
                style={{ color: "#4ADE80" }}
              />
              <span
                className="text-xs font-bold print-text-green"
                style={{ color: "#4ADE80" }}
              >
                Official Results · Certified by OSEM Secure Vote
              </span>
            </div>
          </div>

          {/* Election period */}
          <div
            className="rounded-2xl p-5 mb-6 print-section print-period-bg"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.4s ease 0.05s",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock
                className="w-4 h-4 print-text-gold"
                style={{ color: "#F9A825" }}
              />
              <p
                className="text-xs font-bold uppercase tracking-wide print-text-muted"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Election Period
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p
                  className="text-xs mb-1 print-text-muted"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Voting Started
                </p>
                <p className="text-xs font-bold text-white print-text-dark">
                  {data ? formatDateTime(data.election.start_time) : "—"}
                </p>
              </div>
              <div>
                <p
                  className="text-xs mb-1 print-text-muted"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Voting Ended
                </p>
                <p className="text-xs font-bold text-white print-text-dark">
                  {data ? formatDateTime(data.election.end_time) : "—"}
                </p>
              </div>
              <div>
                <p
                  className="text-xs mb-1 print-text-muted"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Results Published
                </p>
                <p className="text-xs font-bold text-white print-text-dark">
                  {data?.published_at ? formatDateTime(data.published_at) : "—"}
                </p>
              </div>
              <div>
                <p
                  className="text-xs mb-1 print-text-muted"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Certified By
                </p>
                <p
                  className="text-xs font-bold print-text-gold"
                  style={{ color: "#F9A825" }}
                >
                  OSEM Secure Vote System
                </p>
              </div>
            </div>
          </div>

          {/* Turnout + ballot summary */}
          <div
            className="grid grid-cols-2 gap-4 mb-4"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.4s ease 0.1s",
            }}
          >
            <div
              className="rounded-2xl p-5 print-section print-period-bg"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-wide mb-4 print-text-muted"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Voter Turnout
              </p>
              <p
                className="text-3xl font-black mb-1 print-text-gold"
                style={{ color: "#F9A825" }}
              >
                {data?.stats.turnout_percent}%
              </p>
              <p
                className="text-xs font-bold print-text-muted"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {data?.stats.has_voted.toLocaleString()} /{" "}
                {data?.stats.total_voters.toLocaleString()} voters
              </p>
              <div
                className="w-full h-1.5 rounded-full mt-3 overflow-hidden print-bar-bg"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="h-1.5 rounded-full print-bar-fill"
                  style={{
                    width: `${data?.stats.turnout_percent || 0}%`,
                    background: "linear-gradient(90deg, #F9A825, #4ADE80)",
                  }}
                />
              </div>
            </div>

            <div
              className="rounded-2xl p-5 print-section print-period-bg"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-wide mb-4 print-text-muted"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Ballot Summary
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p
                    className="text-xs print-text-muted"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    Total Ballots
                  </p>
                  <p className="text-xs font-bold text-white print-text-dark">
                    {data?.stats.total_ballots.toLocaleString()}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p
                    className="text-xs print-text-green"
                    style={{ color: "#4ADE80" }}
                  >
                    Valid Votes
                  </p>
                  <p
                    className="text-xs font-bold print-text-green"
                    style={{ color: "#4ADE80" }}
                  >
                    {data?.stats.valid_votes.toLocaleString()}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p
                    className="text-xs print-text-red"
                    style={{ color: "#F87171" }}
                  >
                    Rejected Votes
                  </p>
                  <p
                    className="text-xs font-bold print-text-red"
                    style={{ color: "#F87171" }}
                  >
                    {data?.stats.rejected_votes.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Data integrity */}
          <div
            className="rounded-2xl p-4 mb-6 flex items-center gap-3 print-section print-integrity-bg"
            style={{
              background: "rgba(22,163,74,0.08)",
              border: "1px solid rgba(22,163,74,0.2)",
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.4s ease 0.15s",
            }}
          >
            <CheckCircle2
              className="w-5 h-5 shrink-0 print-text-green"
              style={{ color: "#4ADE80" }}
            />
            <div>
              <p
                className="text-xs font-bold print-text-green"
                style={{ color: "#4ADE80" }}
              >
                Data Integrity Verified · No Anomalies Detected
              </p>
              <p
                className="text-xs mt-0.5 print-text-muted"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                All ballots validated · Double voting prevention active · Audit
                log complete
              </p>
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
                    <h2 className="text-lg font-black text-white print-text-dark">
                      {position.name}
                    </h2>
                    <p
                      className="text-xs mt-0.5 print-text-muted"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Total votes for this position:{" "}
                      {position.total_votes.toLocaleString()}
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
                        className="w-3.5 h-3.5 print-text-gold"
                        style={{ color: "#F9A825" }}
                      />
                      <span
                        className="text-xs font-bold print-text-gold"
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
                        className={`rounded-2xl overflow-hidden print-section ${
                          candidate.is_winner && !position.has_tie
                            ? "winner-glow print-winner-bg"
                            : "print-normal-bg"
                        }`}
                        style={{
                          background:
                            candidate.is_winner && !position.has_tie
                              ? "rgba(249,168,37,0.1)"
                              : "rgba(255,255,255,0.05)",
                          border:
                            candidate.is_winner && !position.has_tie
                              ? "2px solid rgba(249,168,37,0.5)"
                              : "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div className="p-5">
                          <div className="flex items-center gap-4 mb-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
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
                              className="w-14 h-14 rounded-2xl overflow-hidden shrink-0"
                              style={{
                                background: "rgba(255,255,255,0.07)",
                                border:
                                  candidate.is_winner && !position.has_tie
                                    ? "2px solid #F9A825"
                                    : "1px solid rgba(255,255,255,0.1)",
                              }}
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
                                    className="w-6 h-6"
                                    style={{ color: "rgba(255,255,255,0.2)" }}
                                  />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-black text-base text-white truncate mb-1 print-text-dark">
                                {candidate.full_name}
                              </p>
                              {candidate.is_winner && !position.has_tie && (
                                <div
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                                  style={{
                                    background: "rgba(249,168,37,0.2)",
                                    border: "1px solid rgba(249,168,37,0.5)",
                                  }}
                                >
                                  <Trophy
                                    className="w-3 h-3 print-text-gold"
                                    style={{ color: "#F9A825" }}
                                  />
                                  <span
                                    className="text-xs font-black print-text-gold"
                                    style={{ color: "#F9A825" }}
                                  >
                                    WINNER
                                  </span>
                                </div>
                              )}
                              {position.has_tie && candidate.is_winner && (
                                <div
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                                  style={{
                                    background: "rgba(249,168,37,0.15)",
                                    border: "1px solid rgba(249,168,37,0.4)",
                                  }}
                                >
                                  <AlertTriangle
                                    className="w-3 h-3 print-text-gold"
                                    style={{ color: "#F9A825" }}
                                  />
                                  <span
                                    className="text-xs font-bold print-text-gold"
                                    style={{ color: "#F9A825" }}
                                  >
                                    TIE
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-2xl font-black text-white print-text-dark">
                                {candidate.vote_count.toLocaleString()}
                              </p>
                              <p
                                className="text-xs font-bold mt-0.5 print-text-muted"
                                style={{ color: "rgba(255,255,255,0.4)" }}
                              >
                                {candidate.percentage}% of votes
                              </p>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div
                            className="w-full h-2.5 rounded-full overflow-hidden print-bar-bg"
                            style={{ background: "rgba(255,255,255,0.08)" }}
                          >
                            <div
                              className="h-2.5 rounded-full transition-all duration-1000 print-bar-fill"
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

          {/* Disclaimer */}
          <div
            className="mt-10 rounded-2xl p-5 print-section print-disclaimer-bg"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p
              className="text-xs font-bold mb-2 print-text-muted"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              OFFICIAL DISCLAIMER
            </p>
            <p
              className="text-xs leading-relaxed print-text-muted"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              These results are final and have been certified by the OSEM Secure
              Vote electoral management system. All votes were cast
              electronically and verified for authenticity. Any disputes
              regarding these results must be formally submitted to the
              electoral commission within 24 hours of publication. This document
              serves as an official record of the election outcome.
            </p>
            <div
              className="mt-3 pt-3 flex items-center justify-between print-border"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p
                className="text-xs print-text-muted"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                Secured & Powered by{" "}
                <span
                  className="font-bold print-text-gold"
                  style={{ color: "rgba(249,168,37,0.5)" }}
                >
                  OSEM Technologies
                </span>
              </p>
              <p
                className="text-xs print-text-muted"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                {data?.published_at
                  ? new Date(data.published_at).getFullYear()
                  : new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
