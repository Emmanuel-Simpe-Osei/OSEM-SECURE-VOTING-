"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";

interface CandidateResult {
  id: string;
  full_name: string;
  photo_url: string | null;
  vote_count: number;
  percentage: number;
  is_leading: boolean;
}

interface PositionResult {
  id: string;
  name: string;
  total_votes: number;
  candidates: CandidateResult[];
}

interface DisplayData {
  election: {
    title: string;
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
  positions: PositionResult[];
}

export default function ElectionDisplayPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [data, setData] = useState<DisplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [tick, setTick] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    setTimeout(() => setMounted(true), 100);

    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          loadData(true);
          return 30;
        }
        return c - 1;
      });
    }, 1000);

    // Tick for time remaining
    const tickRef = setInterval(() => setTick((t) => t + 1), 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      clearInterval(tickRef);
    };
  }, []);

  async function loadData(silent = false) {
    try {
      const res = await fetch(`/api/election/display/${slug}`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch {
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function getTimeLeft() {
    if (!data) return "—";
    const end = new Date(data.election.end_time);
    const now = new Date();
    const diff = Math.max(0, end.getTime() - now.getTime());
    if (diff === 0) return "CLOSED";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (hours > 0)
      return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#000000" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #F9A825, #E65100)",
              boxShadow: "0 0 60px rgba(249,168,37,0.4)",
            }}
          >
            <ShieldCheck className="w-10 h-10" style={{ color: "#000000" }} />
          </div>
          <p
            className="text-lg font-bold tracking-widest uppercase"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#000000" }}
      >
        <p className="text-white text-xl">Election not found.</p>
      </div>
    );
  }

  const turnout = data.stats.turnout_percent;
  const voted = data.stats.has_voted;
  const total = data.stats.total_voters;

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{
        background: "#000000",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(0.98); }
        }
        @keyframes breatheGold {
          0%, 100% { box-shadow: 0 0 40px rgba(249,168,37,0.3); }
          50% { box-shadow: 0 0 80px rgba(249,168,37,0.6); }
        }
        @keyframes breatheGreen {
          0%, 100% { box-shadow: 0 0 40px rgba(22,163,74,0.3); }
          50% { box-shadow: 0 0 80px rgba(22,163,74,0.5); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .breathe-gold {
          animation: breathe 3s ease-in-out infinite, breatheGold 3s ease-in-out infinite;
        }
        .breathe-green {
          animation: breathe 3s ease-in-out infinite 0.5s, breatheGreen 3s ease-in-out infinite 0.5s;
        }
        .breathe-slow {
          animation: breathe 4s ease-in-out infinite 1s;
        }
        .fade-up {
          animation: fadeUp 0.6s ease forwards;
        }
        .live-dot::after {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 9999px;
          background: #4ADE80;
          animation: pulse-ring 2s ease-out infinite;
        }
        .gradient-bar {
          background: linear-gradient(90deg, #F9A825, #4ADE80, #F9A825);
          background-size: 200% 100%;
          animation: gradientShift 3s ease infinite;
        }
      `}</style>

      {/* Top header */}
      <div
        className="w-full px-8 py-5 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(249,168,37,0.2)" }}
      >
        {/* Left — branding */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #F9A825, #E65100)" }}
          >
            <ShieldCheck className="w-5 h-5" style={{ color: "#000000" }} />
          </div>
          <div>
            <p
              className="text-xs font-black tracking-widest uppercase"
              style={{ color: "#F9A825" }}
            >
              OSEM Secure Vote
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              Official Election Display
            </p>
          </div>
        </div>

        {/* Center — election title */}
        <div className="text-center flex-1 px-8">
          <h1 className="text-2xl font-black text-white tracking-tight">
            {data.election.title}
          </h1>
        </div>

        {/* Right — live + refresh */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div
                className="w-3 h-3 rounded-full live-dot"
                style={{ background: "#4ADE80", position: "relative" }}
              />
            </div>
            <span
              className="text-sm font-black tracking-widest"
              style={{ color: "#4ADE80" }}
            >
              LIVE
            </span>
          </div>
          <div
            className="px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            Updates in {countdown}s
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 px-8 py-8 overflow-y-auto">
        {/* ── BIG STATS ROW ─────────────────────────────────────── */}
        <div
          className="grid grid-cols-4 gap-5 mb-8"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.6s ease",
          }}
        >
          {/* Total Voters */}
          <div
            className="rounded-3xl p-7 text-center"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Users
              className="w-7 h-7 mx-auto mb-4"
              style={{ color: "#60A5FA" }}
            />
            <p className="text-6xl font-black text-white mb-2 tracking-tight">
              {total.toLocaleString()}
            </p>
            <p
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Registered Voters
            </p>
          </div>

          {/* Votes Cast — breathing green */}
          <div
            className="rounded-3xl p-7 text-center breathe-green"
            style={{
              background: "rgba(22,163,74,0.1)",
              border: "1px solid rgba(22,163,74,0.4)",
            }}
          >
            <CheckCircle2
              className="w-7 h-7 mx-auto mb-4"
              style={{ color: "#4ADE80" }}
            />
            <p
              className="text-6xl font-black mb-2 tracking-tight"
              style={{ color: "#4ADE80" }}
            >
              {voted.toLocaleString()}
            </p>
            <p
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: "rgba(74,222,128,0.5)" }}
            >
              Votes Cast
            </p>
          </div>

          {/* Turnout — breathing gold */}
          <div
            className="rounded-3xl p-7 text-center breathe-gold"
            style={{
              background: "rgba(249,168,37,0.1)",
              border: "1px solid rgba(249,168,37,0.4)",
            }}
          >
            <TrendingUp
              className="w-7 h-7 mx-auto mb-4"
              style={{ color: "#F9A825" }}
            />
            <p
              className="text-6xl font-black mb-2 tracking-tight"
              style={{ color: "#F9A825" }}
            >
              {turnout}%
            </p>
            <p
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: "rgba(249,168,37,0.5)" }}
            >
              Turnout
            </p>
          </div>

          {/* Time Remaining */}
          <div
            className="rounded-3xl p-7 text-center breathe-slow"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <Clock
              className="w-7 h-7 mx-auto mb-4"
              style={{ color: "#F87171" }}
            />
            <p
              className="text-5xl font-black mb-2 tracking-tight font-mono"
              style={{ color: "#F87171" }}
            >
              {getTimeLeft()}
            </p>
            <p
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: "rgba(248,113,113,0.5)" }}
            >
              Time Remaining
            </p>
          </div>
        </div>

        {/* ── TURNOUT BAR ───────────────────────────────────────── */}
        <div
          className="rounded-3xl p-6 mb-8"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.6s ease 0.2s",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <p
              className="text-sm font-black uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Overall Turnout Progress
            </p>
            <p className="text-3xl font-black" style={{ color: "#F9A825" }}>
              {turnout}%
            </p>
          </div>
          <div
            className="w-full h-8 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <div
              className="h-8 rounded-full gradient-bar transition-all duration-1000"
              style={{
                width: mounted ? `${turnout}%` : "0%",
                boxShadow: "0 0 20px rgba(249,168,37,0.5)",
              }}
            />
          </div>
          <div className="flex justify-between mt-3">
            <p
              className="text-sm font-bold"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {voted.toLocaleString()} voted
            </p>
            <p
              className="text-sm font-bold"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {data.stats.remaining.toLocaleString()} yet to vote
            </p>
          </div>
        </div>

        {/* ── PROVISIONAL RESULTS ───────────────────────────────── */}
        {data.positions.length > 0 && (
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.6s ease 0.3s",
            }}
          >
            <div className="flex items-center gap-4 mb-6">
              <p
                className="text-sm font-black uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Provisional Results
              </p>
              <div
                className="px-3 py-1 rounded-full text-xs font-black breathe-slow"
                style={{
                  background: "rgba(249,168,37,0.12)",
                  color: "#F9A825",
                  border: "1px solid rgba(249,168,37,0.3)",
                }}
              >
                UNOFFICIAL · Auto-updates
              </div>
            </div>

            {/* Positions grid — 1 or 2 columns depending on count */}
            <div
              className={`grid gap-5 ${data.positions.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
            >
              {data.positions.map((position, posIdx) => (
                <div
                  key={position.id}
                  className="rounded-3xl p-6"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    animationDelay: `${posIdx * 0.1}s`,
                  }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-black text-white">
                      {position.name}
                    </h3>
                    <p
                      className="text-sm font-bold"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      {position.total_votes} votes
                    </p>
                  </div>

                  <div className="space-y-5">
                    {position.candidates
                      .sort((a, b) => b.vote_count - a.vote_count)
                      .map((candidate, idx) => {
                        const isLeading = idx === 0 && candidate.vote_count > 0;
                        return (
                          <div key={candidate.id}>
                            <div className="flex items-center gap-4 mb-2">
                              {/* Photo */}
                              <div
                                className="w-14 h-14 rounded-2xl overflow-hidden shrink-0"
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                  border: isLeading
                                    ? "2px solid #F9A825"
                                    : "1px solid rgba(255,255,255,0.1)",
                                  boxShadow: isLeading
                                    ? "0 0 16px rgba(249,168,37,0.4)"
                                    : "none",
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
                                    <p
                                      className="text-2xl font-black"
                                      style={{
                                        color: isLeading
                                          ? "#F9A825"
                                          : "rgba(255,255,255,0.2)",
                                      }}
                                    >
                                      {candidate.full_name.charAt(0)}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Name + leading badge */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p
                                    className="text-lg font-black truncate"
                                    style={{
                                      color: isLeading
                                        ? "#F9A825"
                                        : "rgba(255,255,255,0.85)",
                                    }}
                                  >
                                    {candidate.full_name}
                                  </p>
                                  {isLeading && (
                                    <span
                                      className="px-2 py-0.5 rounded-full text-xs font-black breathe-slow shrink-0"
                                      style={{
                                        background: "rgba(249,168,37,0.2)",
                                        color: "#F9A825",
                                        border:
                                          "1px solid rgba(249,168,37,0.4)",
                                      }}
                                    >
                                      LEADING
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Vote count + percentage */}
                              <div className="text-right shrink-0">
                                <p
                                  className="text-3xl font-black"
                                  style={{
                                    color: isLeading
                                      ? "#F9A825"
                                      : "rgba(255,255,255,0.7)",
                                  }}
                                >
                                  {candidate.vote_count}
                                </p>
                                <p
                                  className="text-sm font-bold"
                                  style={{ color: "rgba(255,255,255,0.35)" }}
                                >
                                  {candidate.percentage}%
                                </p>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div
                              className="w-full h-3 rounded-full overflow-hidden"
                              style={{ background: "rgba(255,255,255,0.06)" }}
                            >
                              <div
                                className="h-3 rounded-full transition-all duration-1000"
                                style={{
                                  width: mounted
                                    ? `${candidate.percentage}%`
                                    : "0%",
                                  background: isLeading
                                    ? "linear-gradient(90deg, #F9A825, #FFD54F)"
                                    : "rgba(255,255,255,0.18)",
                                  boxShadow: isLeading
                                    ? "0 0 10px rgba(249,168,37,0.5)"
                                    : "none",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div
        className="w-full px-8 py-4 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(249,168,37,0.15)" }}
      >
        <p
          className="text-xs font-bold"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          Results are provisional and subject to verification · Not official
          until declared
        </p>
        <p
          className="text-xs font-bold"
          style={{ color: "rgba(249,168,37,0.5)" }}
        >
          Powered by OSEM Technologies · Secure Vote Platform
        </p>
      </div>
    </div>
  );
}
