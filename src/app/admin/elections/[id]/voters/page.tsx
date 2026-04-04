"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Download,
  X,
  WifiOff,
  FileText,
  Plus,
} from "lucide-react";

interface VoterRow {
  student_id: string;
  school_email: string;
  full_name: string;
  department: string;
  level: string;
  valid: boolean;
  error?: string;
}

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

interface RegisteredVoter {
  id: string;
  student_id: string;
  full_name: string;
  school_email: string;
  department: string | null;
  level: string | null;
  has_voted: boolean;
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

export default function VotersPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const fileRef = useRef<HTMLInputElement>(null);
  const online = useNetwork();

  const [electionTitle, setElectionTitle] = useState("");
  const [electionStatus, setElectionStatus] = useState("");
  const [registeredVoters, setRegisteredVoters] = useState<RegisteredVoter[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<VoterRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  // Manual add
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    student_id: "",
    school_email: "",
    full_name: "",
    department: "",
    level: "",
  });
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    loadData();
    setTimeout(() => setMounted(true), 50);
  }, []);

  function showToast(type: "success" | "error", message: string) {
    const toastId = Date.now();
    setToasts((prev) => [...prev, { id: toastId, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 3500);
  }

  async function loadData() {
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
      showToast("error", "Failed to load election data.");
    }

    try {
      const res = await fetch(`/api/admin/voters/${id}`);
      if (res.ok) {
        const data = await res.json();
        setRegisteredVoters(data.voters || []);
      }
    } catch {}

    setLoading(false);
  }

  // ── Manual add ────────────────────────────────────────────────────
  async function handleManualAdd() {
    if (
      !manualForm.student_id ||
      !manualForm.school_email ||
      !manualForm.full_name
    ) {
      showToast("error", "Student ID, email and full name are required.");
      return;
    }
    setSavingManual(true);
    try {
      const res = await fetch(`/api/admin/voters/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          election_id: id,
          voters: [
            {
              student_id: manualForm.student_id.trim(),
              school_email: manualForm.school_email.trim(),
              full_name: manualForm.full_name.trim(),
              department: manualForm.department.trim() || null,
              level: manualForm.level.trim() || null,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error || "Failed to add voter.");
        return;
      }
      if (data.skipped > 0) {
        showToast("error", "This voter is already registered.");
      } else {
        showToast("success", `${manualForm.full_name} added successfully.`);
        setManualForm({
          student_id: "",
          school_email: "",
          full_name: "",
          department: "",
          level: "",
        });
        setShowManualForm(false);
        loadData();
      }
    } catch {
      showToast("error", "Network error. Please try again.");
    } finally {
      setSavingManual(false);
    }
  }

  // ── CSV parsing ───────────────────────────────────────────────────
  function parseCSV(text: string): VoterRow[] {
    const lines = text
      .trim()
      .split("\n")
      .filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0]
      .toLowerCase()
      .split(",")
      .map((h) => h.trim().replace(/"/g, "").replace(/\r/g, ""));
    return lines
      .slice(1)
      .map((line) => {
        const values = line
          .split(",")
          .map((v) => v.trim().replace(/"/g, "").replace(/\r/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] || "";
        });
        const student_id =
          row["student_id"] ||
          row["studentid"] ||
          row["id"] ||
          row["student id"] ||
          "";
        const school_email =
          row["school_email"] || row["email"] || row["school email"] || "";
        const full_name =
          row["full_name"] ||
          row["name"] ||
          row["fullname"] ||
          row["full name"] ||
          "";
        const department = row["department"] || row["dept"] || "";
        const level = row["level"] || row["year"] || "";
        let valid = true;
        let error = "";
        if (!student_id) {
          valid = false;
          error = "Missing student ID";
        } else if (!school_email) {
          valid = false;
          error = "Missing email";
        } else if (!full_name) {
          valid = false;
          error = "Missing name";
        } else if (!school_email.includes("@")) {
          valid = false;
          error = "Invalid email";
        } else if (student_id.length < 3) {
          valid = false;
          error = "ID too short";
        }
        return {
          student_id,
          school_email,
          full_name,
          department,
          level,
          valid,
          error,
        };
      })
      .filter((r) => r.student_id || r.school_email);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      showToast("error", "Please upload a CSV file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "File too large. Maximum size is 5MB.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        showToast("error", "No valid data found. Check the format.");
        return;
      }
      setPreview(rows);
    };
    reader.readAsText(file);
  }

  async function handleUpload() {
    const validRows = preview.filter((r) => r.valid);
    if (validRows.length === 0) {
      showToast("error", "No valid rows to upload.");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch(`/api/admin/voters/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          election_id: id,
          voters: validRows.map((r) => ({
            student_id: r.student_id,
            school_email: r.school_email,
            full_name: r.full_name,
            department: r.department || null,
            level: r.level || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error || "Upload failed.");
        return;
      }
      showToast(
        "success",
        `${data.inserted} voters uploaded. ${data.skipped} duplicates skipped.`,
      );
      setPreview([]);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      loadData();
    } catch {
      showToast("error", "Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function downloadTemplate() {
    const csv = [
      "student_id,school_email,full_name,department,level",
      "10305844,10305844@upsamail.edu.gh,John Mensah,Business & Commerce,300",
      "10348270,10348270@upsamail.edu.gh,Abena Asante,Business & Commerce,200",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "voters_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const validCount = preview.filter((r) => r.valid).length;
  const invalidCount = preview.filter((r) => !r.valid).length;
  const filteredVoters = registeredVoters.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.full_name.toLowerCase().includes(q) ||
      v.student_id.toLowerCase().includes(q) ||
      v.school_email.toLowerCase().includes(q)
    );
  });
  const votedCount = registeredVoters.filter((v) => v.has_voted).length;
  const turnout =
    registeredVoters.length > 0
      ? Math.round((votedCount / registeredVoters.length) * 100)
      : 0;

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
              border: `1px solid ${toast.type === "success" ? "rgba(74,222,128,0.3)" : "rgba(252,165,165,0.3)"}`,
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

      {/* Network banner */}
      {!online && (
        <div
          className="w-full py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-semibold"
          style={{ background: "#DC2626", color: "#ffffff" }}
        >
          <WifiOff className="w-3.5 h-3.5" />
          No internet connection — uploads will fail
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
              Voter Register
            </h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              {electionTitle}
            </p>
          </div>

          {/* Stats */}
          {registeredVoters.length > 0 && (
            <div
              className="grid grid-cols-3 gap-3 mb-6"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(12px)",
                transition: "all 0.4s ease 0.1s",
              }}
            >
              {[
                {
                  label: "Registered",
                  value: registeredVoters.length.toLocaleString(),
                  color: "#60A5FA",
                },
                {
                  label: "Voted",
                  value: votedCount.toLocaleString(),
                  color: "#4ADE80",
                },
                { label: "Turnout", value: `${turnout}%`, color: "#F9A825" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl p-4 text-center"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p
                    className="text-xl font-bold mb-0.5"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Upload section */}
          {electionStatus !== "closed" && electionStatus !== "archived" && (
            <div
              className="mb-6"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(12px)",
                transition: "all 0.4s ease 0.2s",
              }}
            >
              {/* Manual add voter */}
              <div className="mb-4">
                {showManualForm ? (
                  <div
                    className="rounded-2xl p-5 space-y-3"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(249,168,37,0.3)",
                    }}
                  >
                    <p className="text-sm font-bold text-white">
                      Add Individual Voter
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={manualForm.student_id}
                        onChange={(e) =>
                          setManualForm((p) => ({
                            ...p,
                            student_id: e.target.value,
                          }))
                        }
                        placeholder="Student ID *"
                        autoFocus
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#ffffff",
                        }}
                      />
                      <input
                        type="email"
                        value={manualForm.school_email}
                        onChange={(e) =>
                          setManualForm((p) => ({
                            ...p,
                            school_email: e.target.value,
                          }))
                        }
                        placeholder="School email *"
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#ffffff",
                        }}
                      />
                      <input
                        type="text"
                        value={manualForm.full_name}
                        onChange={(e) =>
                          setManualForm((p) => ({
                            ...p,
                            full_name: e.target.value,
                          }))
                        }
                        placeholder="Full name *"
                        className="col-span-2 w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#ffffff",
                        }}
                      />
                      <input
                        type="text"
                        value={manualForm.department}
                        onChange={(e) =>
                          setManualForm((p) => ({
                            ...p,
                            department: e.target.value,
                          }))
                        }
                        placeholder="Department (optional)"
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#ffffff",
                        }}
                      />
                      <input
                        type="text"
                        value={manualForm.level}
                        onChange={(e) =>
                          setManualForm((p) => ({
                            ...p,
                            level: e.target.value,
                          }))
                        }
                        placeholder="Level (optional)"
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#ffffff",
                        }}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowManualForm(false);
                          setManualForm({
                            student_id: "",
                            school_email: "",
                            full_name: "",
                            department: "",
                            level: "",
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
                        onClick={handleManualAdd}
                        disabled={
                          savingManual ||
                          !manualForm.student_id ||
                          !manualForm.school_email ||
                          !manualForm.full_name
                        }
                        className="flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-95"
                        style={{
                          background:
                            "linear-gradient(135deg, #F9A825, #E65100)",
                          color: "#0B1E35",
                        }}
                      >
                        {savingManual ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : null}
                        Add Voter
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowManualForm(true)}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 mb-4"
                    style={{
                      background: "rgba(249,168,37,0.08)",
                      border: "1.5px dashed rgba(249,168,37,0.4)",
                      color: "#F9A825",
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Add Individual Voter
                  </button>
                )}
              </div>

              {/* Template download */}
              <div
                className="rounded-2xl p-5 mb-4"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white mb-1">
                      Bulk CSV Upload
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Required: student_id, school_email, full_name
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      Optional: department, level
                    </p>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                    style={{
                      background: "rgba(249,168,37,0.15)",
                      color: "#F9A825",
                      border: "1px solid rgba(249,168,37,0.3)",
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Template
                  </button>
                </div>
              </div>

              {/* Upload area */}
              {preview.length === 0 ? (
                <div
                  className="rounded-2xl p-10 text-center cursor-pointer transition-all hover:opacity-80 active:scale-99"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "2px dashed rgba(255,255,255,0.12)",
                  }}
                  onClick={() => fileRef.current?.click()}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{
                      background: "rgba(249,168,37,0.1)",
                      border: "1px solid rgba(249,168,37,0.2)",
                    }}
                  >
                    <Upload className="w-6 h-6" style={{ color: "#F9A825" }} />
                  </div>
                  <p className="text-sm font-bold text-white mb-1">
                    Click to upload voter list
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    CSV file only · Maximum 5MB
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {/* Preview header */}
                  <div
                    className="px-5 py-4 flex items-center justify-between"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: "rgba(249,168,37,0.15)" }}
                      >
                        <FileText
                          className="w-4 h-4"
                          style={{ color: "#F9A825" }}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {fileName}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "rgba(255,255,255,0.4)" }}
                        >
                          <span style={{ color: "#4ADE80" }}>
                            {validCount} valid
                          </span>
                          {invalidCount > 0 && (
                            <span style={{ color: "#F87171" }}>
                              {" "}
                              · {invalidCount} invalid
                            </span>
                          )}
                          {" · "}
                          {preview.length} total
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setPreview([]);
                        setFileName("");
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="p-1.5 rounded-lg transition-all hover:opacity-60"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          {["Student ID", "Name", "Email", "Status"].map(
                            (h) => (
                              <th
                                key={h}
                                className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide"
                                style={{ color: "rgba(255,255,255,0.4)" }}
                              >
                                {h}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(0, 8).map((row, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.04)",
                            }}
                          >
                            <td className="px-4 py-3">
                              <span
                                className="text-xs font-mono"
                                style={{ color: "rgba(255,255,255,0.7)" }}
                              >
                                {row.student_id}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="text-xs"
                                style={{ color: "rgba(255,255,255,0.7)" }}
                              >
                                {row.full_name}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="text-xs"
                                style={{ color: "rgba(255,255,255,0.4)" }}
                              >
                                {row.school_email}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                  background: row.valid
                                    ? "rgba(22,163,74,0.15)"
                                    : "rgba(220,38,38,0.15)",
                                  color: row.valid ? "#4ADE80" : "#F87171",
                                }}
                              >
                                {row.valid ? "✓ Valid" : row.error}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.length > 8 && (
                      <div
                        className="px-4 py-3 text-center text-xs"
                        style={{
                          color: "rgba(255,255,255,0.3)",
                          borderTop: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        +{preview.length - 8} more rows
                      </div>
                    )}
                  </div>

                  {/* Invalid warning */}
                  {invalidCount > 0 && (
                    <div
                      className="mx-4 mb-4 rounded-xl p-3 flex items-start gap-2"
                      style={{
                        background: "rgba(249,168,37,0.08)",
                        border: "1px solid rgba(249,168,37,0.2)",
                      }}
                    >
                      <AlertCircle
                        className="w-3.5 h-3.5 shrink-0 mt-0.5"
                        style={{ color: "#F9A825" }}
                      />
                      <p
                        className="text-xs"
                        style={{ color: "rgba(249,168,37,0.8)" }}
                      >
                        {invalidCount} row{invalidCount > 1 ? "s" : ""} with
                        errors will be skipped.
                      </p>
                    </div>
                  )}

                  {/* Upload button */}
                  <div className="p-4">
                    <button
                      onClick={handleUpload}
                      disabled={uploading || validCount === 0 || !online}
                      className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                      style={{
                        background: "linear-gradient(135deg, #F9A825, #E65100)",
                        color: "#0B1E35",
                      }}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading {validCount} voters...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload {validCount} Voter{validCount !== 1 ? "s" : ""}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Registered voters */}
          {registeredVoters.length > 0 && (
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(12px)",
                transition: "all 0.4s ease 0.3s",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white">
                  Registered Voters
                  <span
                    className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      background: "rgba(96,165,250,0.15)",
                      color: "#60A5FA",
                    }}
                  >
                    {registeredVoters.length}
                  </span>
                </h2>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, ID or email..."
                  className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#ffffff",
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Voter list */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {filteredVoters.length === 0 ? (
                  <div className="py-10 text-center">
                    <p
                      className="text-sm"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      No voters match your search
                    </p>
                  </div>
                ) : (
                  filteredVoters.slice(0, 50).map((voter, idx) => (
                    <div
                      key={voter.id}
                      className="px-5 py-4 flex items-center gap-4"
                      style={{
                        borderBottom:
                          idx < filteredVoters.length - 1
                            ? "1px solid rgba(255,255,255,0.04)"
                            : "none",
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{
                          background: voter.has_voted
                            ? "rgba(22,163,74,0.15)"
                            : "rgba(255,255,255,0.07)",
                          color: voter.has_voted
                            ? "#4ADE80"
                            : "rgba(255,255,255,0.4)",
                          border: voter.has_voted
                            ? "1px solid rgba(22,163,74,0.3)"
                            : "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {voter.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {voter.full_name}
                        </p>
                        <p
                          className="text-xs mt-0.5 truncate"
                          style={{ color: "rgba(255,255,255,0.4)" }}
                        >
                          {voter.student_id} · {voter.school_email}
                        </p>
                      </div>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                        style={{
                          background: voter.has_voted
                            ? "rgba(22,163,74,0.15)"
                            : "rgba(255,255,255,0.06)",
                          color: voter.has_voted
                            ? "#4ADE80"
                            : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {voter.has_voted ? "✓ Voted" : "Pending"}
                      </span>
                    </div>
                  ))
                )}
                {filteredVoters.length > 50 && (
                  <div
                    className="px-5 py-4 text-center text-xs"
                    style={{
                      color: "rgba(255,255,255,0.3)",
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    Showing 50 of {filteredVoters.length} voters. Use search to
                    find specific voters.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {registeredVoters.length === 0 &&
            preview.length === 0 &&
            !showManualForm && (
              <div
                className="rounded-2xl p-12 text-center"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px dashed rgba(255,255,255,0.08)",
                }}
              >
                <Users
                  className="w-10 h-10 mx-auto mb-3"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                />
                <p
                  className="text-sm font-semibold"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  No voters registered yet
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                >
                  Add voters individually or upload a CSV file.
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
