"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  User,
  Upload,
  X,
  ChevronUp,
  ChevronDown,
  WifiOff,
  CheckCircle2,
} from "lucide-react";

interface Candidate {
  id: string;
  full_name: string;
  bio: string | null;
  photo_url: string | null;
  sort_order: number;
}

interface Position {
  id: string;
  name: string;
  description: string | null;
  max_votes: number;
  sort_order: number;
  candidates: Candidate[];
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
  onConfirm: () => void;
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

export default function CandidatesPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const online = useNetwork();

  const [positions, setPositions] = useState<Position[]>([]);
  const [electionTitle, setElectionTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<ConfirmDialog>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Position form
  const [showPositionForm, setShowPositionForm] = useState(false);
  const [positionForm, setPositionForm] = useState({
    name: "",
    description: "",
    max_votes: 1,
  });
  const [savingPosition, setSavingPosition] = useState(false);

  // Candidate form
  const [candidateForm, setCandidateForm] = useState<{
    positionId: string | null;
    full_name: string;
    bio: string;
    photo_file: File | null;
    photo_preview: string;
    photoKey: number;
  }>({
    positionId: null,
    full_name: "",
    bio: "",
    photo_file: null,
    photo_preview: "",
    photoKey: 0,
  });
  const [savingCandidate, setSavingCandidate] = useState(false);

  // ── Toast system ──────────────────────────────────────────────────
  function showToast(type: "success" | "error", message: string) {
    const toastId = Date.now();
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 3500);
  }

  // ── Confirm dialog ────────────────────────────────────────────────
  function showConfirm(title: string, message: string, onConfirm: () => void) {
    setConfirm({ open: true, title, message, onConfirm });
  }

  function closeConfirm() {
    setConfirm({ open: false, title: "", message: "", onConfirm: () => {} });
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch(`/api/admin/elections/${id}`);
      if (!res.ok) {
        router.replace("/admin/dashboard");
        return;
      }
      const data = await res.json();
      setElectionTitle(data.election.title);
      setPositions(
        (data.positions || []).sort(
          (a: Position, b: Position) => a.sort_order - b.sort_order,
        ),
      );
    } catch {
      showToast("error", "Failed to load data. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  // ── Reorder positions ─────────────────────────────────────────────
  async function movePosition(positionId: string, direction: "up" | "down") {
    const idx = positions.findIndex((p) => p.id === positionId);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === positions.length - 1) return;

    const newPositions = [...positions];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newPositions[idx], newPositions[swapIdx]] = [
      newPositions[swapIdx],
      newPositions[idx],
    ];
    const updated = newPositions.map((p, i) => ({ ...p, sort_order: i + 1 }));
    setPositions(updated);
    setSaving("reordering");

    try {
      await Promise.all(
        updated.map((p) =>
          fetch(`/api/admin/elections/${id}/candidates`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "position_order",
              position_id: p.id,
              sort_order: p.sort_order,
            }),
          }),
        ),
      );
      showToast("success", "Position order updated.");
    } catch {
      showToast("error", "Failed to save order. Please try again.");
    } finally {
      setSaving("");
    }
  }

  // ── Add position ──────────────────────────────────────────────────
  async function addPosition() {
    if (!positionForm.name.trim()) return;
    setSavingPosition(true);
    try {
      const res = await fetch(`/api/admin/elections/${id}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "position",
          name: positionForm.name.trim(),
          description: positionForm.description.trim() || null,
          max_votes: positionForm.max_votes,
          sort_order: positions.length + 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error || "Failed to add position.");
        return;
      }
      setPositions((prev) => [...prev, { ...data, candidates: [] }]);
      setPositionForm({ name: "", description: "", max_votes: 1 });
      setShowPositionForm(false);
      showToast("success", `Position "${data.name}" added successfully.`);
    } catch {
      showToast("error", "Network error. Please try again.");
    } finally {
      setSavingPosition(false);
    }
  }

  // ── Candidate form helpers ────────────────────────────────────────
  function openCandidateForm(positionId: string) {
    if (candidateForm.photo_preview)
      URL.revokeObjectURL(candidateForm.photo_preview);
    setCandidateForm({
      positionId,
      full_name: "",
      bio: "",
      photo_file: null,
      photo_preview: "",
      photoKey: candidateForm.photoKey + 1,
    });
  }

  function closeCandidateForm() {
    if (candidateForm.photo_preview)
      URL.revokeObjectURL(candidateForm.photo_preview);
    setCandidateForm((prev) => ({
      ...prev,
      positionId: null,
      full_name: "",
      bio: "",
      photo_file: null,
      photo_preview: "",
      photoKey: prev.photoKey + 1,
    }));
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showToast("error", "Only JPG, PNG and WebP images are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("error", "Photo must be under 2MB.");
      return;
    }
    if (candidateForm.photo_preview)
      URL.revokeObjectURL(candidateForm.photo_preview);
    const preview = URL.createObjectURL(file);
    setCandidateForm((prev) => ({
      ...prev,
      photo_file: file,
      photo_preview: preview,
    }));
  }

  // ── Add candidate ─────────────────────────────────────────────────
  async function addCandidate(positionId: string) {
    if (!candidateForm.full_name.trim()) return;
    setSavingCandidate(true);

    try {
      let photo_url = null;

      if (candidateForm.photo_file) {
        const uploadRes = await fetch(
          `/api/admin/elections/${id}/candidates/upload-photo`,
          {
            method: "POST",
            headers: { "Content-Type": candidateForm.photo_file.type },
            body: candidateForm.photo_file,
          },
        );
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          showToast("error", uploadData.error || "Failed to upload photo.");
          setSavingCandidate(false);
          return;
        }
        photo_url = uploadData.url;
      }

      const position = positions.find((p) => p.id === positionId);
      const res = await fetch(`/api/admin/elections/${id}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "candidate",
          position_id: positionId,
          full_name: candidateForm.full_name.trim(),
          bio: candidateForm.bio.trim() || null,
          photo_url,
          sort_order: (position?.candidates.length || 0) + 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error || "Failed to add candidate.");
        return;
      }

      setPositions((prev) =>
        prev.map((p) =>
          p.id === positionId
            ? { ...p, candidates: [...p.candidates, data] }
            : p,
        ),
      );
      closeCandidateForm();
      showToast("success", `${data.full_name} added successfully.`);
    } catch {
      showToast("error", "Network error. Please try again.");
    } finally {
      setSavingCandidate(false);
    }
  }

  // ── Delete candidate ──────────────────────────────────────────────
  function confirmDeleteCandidate(positionId: string, candidate: Candidate) {
    showConfirm(
      "Remove Candidate",
      `Are you sure you want to remove ${candidate.full_name}? This cannot be undone.`,
      async () => {
        closeConfirm();
        try {
          const res = await fetch(`/api/admin/elections/${id}/candidates`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "candidate",
              candidate_id: candidate.id,
            }),
          });
          if (!res.ok) {
            showToast("error", "Failed to remove candidate.");
            return;
          }
          setPositions((prev) =>
            prev.map((p) =>
              p.id === positionId
                ? {
                    ...p,
                    candidates: p.candidates.filter(
                      (c) => c.id !== candidate.id,
                    ),
                  }
                : p,
            ),
          );
          showToast("success", `${candidate.full_name} removed.`);
        } catch {
          showToast("error", "Network error. Please try again.");
        }
      },
    );
  }

  // ── Delete position ───────────────────────────────────────────────
  function confirmDeletePosition(position: Position) {
    showConfirm(
      "Delete Position",
      `Delete "${position.name}" and all ${position.candidates.length} candidate(s)? This cannot be undone.`,
      async () => {
        closeConfirm();
        try {
          const res = await fetch(`/api/admin/elections/${id}/candidates`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "position",
              position_id: position.id,
            }),
          });
          if (!res.ok) {
            showToast("error", "Failed to delete position.");
            return;
          }
          setPositions((prev) =>
            prev
              .filter((p) => p.id !== position.id)
              .map((p, i) => ({ ...p, sort_order: i + 1 })),
          );
          showToast("success", `Position "${position.name}" deleted.`);
        } catch {
          showToast("error", "Network error. Please try again.");
        }
      },
    );
  }

  // ── Loading ───────────────────────────────────────────────────────
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
      {/* Toast notifications */}
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
              border: `1px solid ${toast.type === "success" ? "rgba(74,222,128,0.3)" : "rgba(252,165,165,0.3)"}`,
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
                style={{ background: "rgba(220,38,38,0.9)", color: "#ffffff" }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Network banner */}
      {!online && (
        <div
          className="w-full py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-semibold"
          style={{ background: "#DC2626", color: "#ffffff" }}
        >
          <WifiOff className="w-3.5 h-3.5" />
          No internet connection — changes may not save
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
          {saving && (
            <div className="flex items-center gap-1.5">
              <Loader2
                className="w-3 h-3 animate-spin"
                style={{ color: "#F9A825" }}
              />
              <span
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Saving...
              </span>
            </div>
          )}
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
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-white">
              Candidates & Positions
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {electionTitle}
            </p>
          </div>

          <div
            className="rounded-2xl px-4 py-3 mb-6"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Use{" "}
              <span className="font-bold" style={{ color: "#F9A825" }}>
                ↑ ↓
              </span>{" "}
              to reorder positions. Students see them in this exact order on the
              ballot.
            </p>
          </div>

          {/* Positions */}
          <div className="space-y-5 mb-6">
            {positions.map((position, idx) => (
              <div
                key={position.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Position header */}
                <div
                  className="px-5 py-4 flex items-center gap-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => movePosition(position.id, "up")}
                      disabled={idx === 0 || !!saving}
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-all disabled:opacity-20 hover:opacity-70"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <ChevronUp
                        className="w-3.5 h-3.5"
                        style={{ color: "rgba(255,255,255,0.6)" }}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePosition(position.id, "down")}
                      disabled={idx === positions.length - 1 || !!saving}
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-all disabled:opacity-20 hover:opacity-70"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <ChevronDown
                        className="w-3.5 h-3.5"
                        style={{ color: "rgba(255,255,255,0.6)" }}
                      />
                    </button>
                  </div>

                  {/* Number */}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{
                      background: "rgba(249,168,37,0.15)",
                      color: "#F9A825",
                    }}
                  >
                    {idx + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white">
                      {position.name}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      {position.candidates.length} candidate
                      {position.candidates.length !== 1 ? "s" : ""}
                      {" · "}
                      select{" "}
                      {position.max_votes === 1
                        ? "1"
                        : `up to ${position.max_votes}`}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => confirmDeletePosition(position)}
                    className="p-1.5 rounded-lg transition-all hover:opacity-60 shrink-0"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Candidates grid */}
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {position.candidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="rounded-xl overflow-hidden relative group"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {/* Full photo */}
                        <div
                          className="w-full overflow-hidden"
                          style={{
                            aspectRatio: "3/4",
                            background:
                              "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.06))",
                          }}
                        >
                          {candidate.photo_url ? (
                            <img
                              src={candidate.photo_url}
                              alt={candidate.full_name}
                              className="w-full h-full object-cover object-top"
                              style={{ imageRendering: "auto" }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User
                                className="w-10 h-10"
                                style={{ color: "rgba(255,255,255,0.15)" }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Name */}
                        <div
                          className="px-2 py-2.5"
                          style={{
                            borderTop: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <p
                            className="font-semibold text-white text-center leading-tight"
                            style={{ fontSize: "11px" }}
                          >
                            {candidate.full_name}
                          </p>
                        </div>

                        {/* Delete on hover */}
                        <button
                          type="button"
                          onClick={() =>
                            confirmDeleteCandidate(position.id, candidate)
                          }
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                          style={{
                            background: "rgba(220,38,38,0.9)",
                            backdropFilter: "blur(4px)",
                          }}
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}

                    {/* Add card */}
                    {candidateForm.positionId !== position.id && (
                      <button
                        type="button"
                        onClick={() => openCandidateForm(position.id)}
                        className="rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:opacity-70 active:scale-95"
                        style={{
                          background: "rgba(249,168,37,0.06)",
                          border: "1.5px dashed rgba(249,168,37,0.35)",
                          aspectRatio: "3/4",
                          minHeight: "110px",
                        }}
                      >
                        <Plus
                          className="w-5 h-5"
                          style={{ color: "#F9A825" }}
                        />
                        <span
                          className="font-semibold"
                          style={{ color: "#F9A825", fontSize: "10px" }}
                        >
                          Add Candidate
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Candidate form */}
                  {candidateForm.positionId === position.id && (
                    <div
                      className="rounded-2xl p-4 space-y-3 mt-2"
                      style={{
                        background: "rgba(249,168,37,0.06)",
                        border: "1px solid rgba(249,168,37,0.2)",
                      }}
                    >
                      <p
                        className="text-xs font-bold"
                        style={{ color: "#F9A825" }}
                      >
                        New Candidate — {position.name}
                      </p>

                      {/* Photo */}
                      <div className="flex items-center gap-3">
                        {candidateForm.photo_preview ? (
                          <div className="relative shrink-0">
                            <img
                              src={candidateForm.photo_preview}
                              alt="Preview"
                              className="w-16 h-20 rounded-xl object-cover object-top"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                URL.revokeObjectURL(
                                  candidateForm.photo_preview,
                                );
                                setCandidateForm((prev) => ({
                                  ...prev,
                                  photo_file: null,
                                  photo_preview: "",
                                  photoKey: prev.photoKey + 1,
                                }));
                              }}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ background: "#DC2626" }}
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ) : (
                          <label
                            className="w-16 h-20 rounded-xl flex flex-col items-center justify-center shrink-0 cursor-pointer transition-all hover:opacity-70 gap-1"
                            style={{
                              background: "rgba(255,255,255,0.07)",
                              border: "2px dashed rgba(255,255,255,0.15)",
                            }}
                          >
                            <Upload
                              className="w-4 h-4"
                              style={{ color: "rgba(255,255,255,0.4)" }}
                            />
                            <span
                              className="text-xs"
                              style={{
                                color: "rgba(255,255,255,0.3)",
                                fontSize: "9px",
                              }}
                            >
                              Upload
                            </span>
                            <input
                              key={candidateForm.photoKey}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handlePhotoSelect}
                              className="hidden"
                            />
                          </label>
                        )}
                        <div>
                          <p
                            className="text-xs font-medium"
                            style={{
                              color: candidateForm.photo_preview
                                ? "#4ADE80"
                                : "rgba(255,255,255,0.6)",
                            }}
                          >
                            {candidateForm.photo_preview
                              ? "Photo ready ✓"
                              : "Upload passport photo"}
                          </p>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                          >
                            JPG, PNG, WebP · Max 2MB
                          </p>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={candidateForm.full_name}
                        onChange={(e) =>
                          setCandidateForm((prev) => ({
                            ...prev,
                            full_name: e.target.value,
                          }))
                        }
                        placeholder="Full name *"
                        autoFocus
                        className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#ffffff",
                        }}
                      />

                      <input
                        type="text"
                        value={candidateForm.bio}
                        onChange={(e) =>
                          setCandidateForm((prev) => ({
                            ...prev,
                            bio: e.target.value,
                          }))
                        }
                        placeholder="Short bio (optional)"
                        className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#ffffff",
                        }}
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={closeCandidateForm}
                          className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            color: "rgba(255,255,255,0.5)",
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => addCandidate(position.id)}
                          disabled={
                            savingCandidate || !candidateForm.full_name.trim()
                          }
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-95"
                          style={{
                            background:
                              "linear-gradient(135deg, #F9A825, #E65100)",
                            color: "#0B1E35",
                          }}
                        >
                          {savingCandidate ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            "Add Candidate"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add position form */}
          {showPositionForm ? (
            <div
              className="rounded-2xl p-6 space-y-4"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(249,168,37,0.3)",
              }}
            >
              <h3 className="text-sm font-bold text-white">New Position</h3>
              <input
                type="text"
                value={positionForm.name}
                onChange={(e) =>
                  setPositionForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Position name (e.g. President) *"
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#ffffff",
                }}
              />
              <input
                type="text"
                value={positionForm.description}
                onChange={(e) =>
                  setPositionForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Description (optional)"
                className="w-full px-4 py-3.5 rounded-xl text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#ffffff",
                }}
              />
              <div>
                <label
                  className="block text-xs font-bold mb-2 uppercase tracking-wide"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Max votes per student
                </label>
                <select
                  value={positionForm.max_votes}
                  onChange={(e) =>
                    setPositionForm((prev) => ({
                      ...prev,
                      max_votes: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-4 py-3.5 rounded-xl text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#ffffff",
                    colorScheme: "dark",
                  }}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPositionForm(false);
                    setPositionForm({
                      name: "",
                      description: "",
                      max_votes: 1,
                    });
                  }}
                  className="px-5 py-3 rounded-xl text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addPosition}
                  disabled={savingPosition || !positionForm.name.trim()}
                  className="flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #F9A825, #E65100)",
                    color: "#0B1E35",
                  }}
                >
                  {savingPosition ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : null}
                  Add Position
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPositionForm(true)}
              className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                background: "rgba(249,168,37,0.08)",
                border: "1.5px dashed rgba(249,168,37,0.4)",
                color: "#F9A825",
              }}
            >
              <Plus className="w-4 h-4" />
              Add Position
            </button>
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
