"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  User,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";

interface Candidate {
  id: string;
  full_name: string;
  bio: string | null;
  photo_url: string | null;
  sort_order: number;
  is_no_vote: boolean;
}

interface Position {
  id: string;
  name: string;
  description: string | null;
  max_votes: number;
  sort_order: number;
  candidates: Candidate[];
}

export default function BallotPreviewPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [positions, setPositions] = useState<Position[]>([]);
  const [electionTitle, setElectionTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    fetch(`/api/election/preview/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setElectionTitle(data.election?.title || "");
        setPositions(
          (data.positions || []).sort(
            (a: Position, b: Position) => a.sort_order - b.sort_order,
          ),
        );
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const totalPositions = positions.length;
  const currentPosition = positions[currentStep];

  function navigate(dir: "forward" | "back") {
    setAnimKey((k) => k + 1);
    setCurrentStep((s) =>
      dir === "forward"
        ? Math.min(s + 1, totalPositions - 1)
        : Math.max(s - 1, 0),
    );
  }

  function selectCandidate(positionId: string, candidateId: string) {
    setSelected((prev) => ({ ...prev, [positionId]: candidateId }));
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0B1E35" }}
      >
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "#F9A825" }}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0B1E35" }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-slide { animation: slideUp 0.3s ease forwards; }
      `}</style>

      {/* Preview banner */}
      <div
        className="w-full py-2 px-4 text-center text-xs font-bold"
        style={{
          background: "rgba(249,168,37,0.15)",
          color: "#F9A825",
          borderBottom: "1px solid rgba(249,168,37,0.3)",
        }}
      >
        PREVIEW MODE — This is how the ballot will look to students
      </div>

      {/* Header */}
      <div
        className="w-full px-5 py-4 flex items-center justify-between shrink-0"
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
          <div>
            <p className="text-xs font-bold" style={{ color: "#F9A825" }}>
              OSEM Secure Vote
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              {electionTitle}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-white">Student Name</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            Position {currentStep + 1} of {totalPositions}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-0.5"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-0.5 transition-all duration-500"
          style={{
            background: "linear-gradient(90deg, #F9A825, #FFD54F)",
            width: `${(currentStep / totalPositions) * 100}%`,
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {currentPosition && (
            <div key={animKey} className="anim-slide">
              {/* Position header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                      background: "rgba(249,168,37,0.15)",
                      color: "#F9A825",
                      border: "1px solid rgba(249,168,37,0.3)",
                    }}
                  >
                    {currentStep + 1} of {totalPositions}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
                  {currentPosition.name}
                </h1>
                {(() => {
                  const real = currentPosition.candidates.filter(
                    (c) => !c.is_no_vote,
                  );
                  return (
                    <p
                      className="text-sm"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      {real.length === 1
                        ? "Vote yes or no for this candidate"
                        : currentPosition.max_votes === 1
                          ? "Select one candidate"
                          : `Select up to ${currentPosition.max_votes} candidates`}
                    </p>
                  );
                })()}
              </div>

              {(() => {
                const realCandidates = currentPosition.candidates.filter(
                  (c) => !c.is_no_vote,
                );
                const isUncontested = realCandidates.length === 1;

                if (isUncontested) {
                  const c = realCandidates[0];
                  const isYes = selected[currentPosition.id] === "yes";
                  const isNo = selected[currentPosition.id] === "no";
                  return (
                    <div className="mb-8">
                      <div
                        className="rounded-2xl overflow-hidden mb-6"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {c.photo_url && (
                          <div
                            className="w-full overflow-hidden"
                            style={{ maxHeight: "320px" }}
                          >
                            <img
                              src={c.photo_url}
                              alt={c.full_name}
                              className="w-full object-cover object-top"
                            />
                          </div>
                        )}
                        <div className="p-5 text-center">
                          <p className="text-xl font-bold text-white mb-1">
                            {c.full_name}
                          </p>
                          {c.bio && (
                            <p
                              className="text-sm"
                              style={{ color: "rgba(255,255,255,0.4)" }}
                            >
                              {c.bio}
                            </p>
                          )}
                        </div>
                      </div>
                      <p
                        className="text-center text-sm font-semibold mb-5"
                        style={{ color: "rgba(255,255,255,0.6)" }}
                      >
                        Do you support{" "}
                        <span className="text-white font-bold">
                          {c.full_name}
                        </span>{" "}
                        as your{" "}
                        <span className="text-white font-bold">
                          {currentPosition.name}
                        </span>
                        ?
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() =>
                            selectCandidate(currentPosition.id, "yes")
                          }
                          className="py-5 rounded-2xl flex flex-col items-center gap-2 transition-all duration-200 active:scale-95"
                          style={{
                            background: isYes
                              ? "rgba(22,163,74,0.2)"
                              : "rgba(255,255,255,0.05)",
                            border: isYes
                              ? "2px solid #4ADE80"
                              : "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <span style={{ fontSize: "32px" }}>✅</span>
                          <span
                            className="text-base font-bold"
                            style={{
                              color: isYes
                                ? "#4ADE80"
                                : "rgba(255,255,255,0.7)",
                            }}
                          >
                            YES
                          </span>
                          <span
                            className="text-xs"
                            style={{
                              color: isYes
                                ? "rgba(74,222,128,0.7)"
                                : "rgba(255,255,255,0.3)",
                            }}
                          >
                            I Support
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            selectCandidate(currentPosition.id, "no")
                          }
                          className="py-5 rounded-2xl flex flex-col items-center gap-2 transition-all duration-200 active:scale-95"
                          style={{
                            background: isNo
                              ? "rgba(220,38,38,0.2)"
                              : "rgba(255,255,255,0.05)",
                            border: isNo
                              ? "2px solid #F87171"
                              : "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <span style={{ fontSize: "32px" }}>❌</span>
                          <span
                            className="text-base font-bold"
                            style={{
                              color: isNo ? "#F87171" : "rgba(255,255,255,0.7)",
                            }}
                          >
                            NO
                          </span>
                          <span
                            className="text-xs"
                            style={{
                              color: isNo
                                ? "rgba(248,113,113,0.7)"
                                : "rgba(255,255,255,0.3)",
                            }}
                          >
                            I Don&apos;t Support
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {realCandidates
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((candidate) => {
                        const isSelected =
                          selected[currentPosition.id] === candidate.id;
                        return (
                          <button
                            key={candidate.id}
                            onClick={() =>
                              selectCandidate(currentPosition.id, candidate.id)
                            }
                            className="text-left transition-all duration-200 active:scale-95"
                          >
                            <div
                              className="rounded-2xl overflow-hidden transition-all duration-300"
                              style={{
                                background: isSelected
                                  ? "rgba(249,168,37,0.12)"
                                  : "rgba(255,255,255,0.05)",
                                border: isSelected
                                  ? "2px solid #F9A825"
                                  : "1px solid rgba(255,255,255,0.08)",
                                boxShadow: isSelected
                                  ? "0 8px 32px rgba(249,168,37,0.2)"
                                  : "none",
                              }}
                            >
                              <div
                                className="w-full relative overflow-hidden"
                                style={{ aspectRatio: "1/1" }}
                              >
                                {candidate.photo_url ? (
                                  <img
                                    src={candidate.photo_url}
                                    alt={candidate.full_name}
                                    className="w-full h-full object-cover"
                                    style={{
                                      objectPosition: "top",
                                      transform: isSelected
                                        ? "scale(1.03)"
                                        : "scale(1)",
                                      transition: "transform 0.3s",
                                    }}
                                  />
                                ) : (
                                  <div
                                    className="w-full h-full flex items-center justify-center"
                                    style={{
                                      background: "rgba(255,255,255,0.03)",
                                    }}
                                  >
                                    <User
                                      className="w-14 h-14"
                                      style={{
                                        color: isSelected
                                          ? "#F9A825"
                                          : "rgba(255,255,255,0.15)",
                                      }}
                                    />
                                  </div>
                                )}
                                {isSelected && (
                                  <div
                                    className="absolute inset-0 flex items-end justify-end p-3"
                                    style={{
                                      background:
                                        "linear-gradient(to top, rgba(249,168,37,0.4), transparent)",
                                    }}
                                  >
                                    <div
                                      className="w-8 h-8 rounded-full flex items-center justify-center"
                                      style={{ background: "#F9A825" }}
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="#0B1E35"
                                        strokeWidth={3}
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="p-4">
                                <p
                                  className="font-bold text-sm leading-tight"
                                  style={{
                                    color: isSelected
                                      ? "#F9A825"
                                      : "rgba(255,255,255,0.9)",
                                  }}
                                >
                                  {candidate.full_name}
                                </p>
                                <p
                                  className="text-xs mt-1.5 font-medium"
                                  style={{
                                    color: isSelected
                                      ? "rgba(249,168,37,0.7)"
                                      : "rgba(255,255,255,0.25)",
                                  }}
                                >
                                  {isSelected ? "✓ Selected" : "Tap to select"}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                );
              })()}

              {/* Navigation */}
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <button
                    onClick={() => navigate("back")}
                    className="flex items-center gap-2 px-5 py-4 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                )}
                {currentStep < totalPositions - 1 ? (
                  <button
                    onClick={() => navigate("forward")}
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, #F9A825, #E65100)",
                      color: "#0B1E35",
                    }}
                  >
                    Next Position
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    End of Ballot Preview
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="w-full px-6 py-4 flex items-center justify-between shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#F9A825" }}
          />
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            Preview Only — No votes are recorded
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
