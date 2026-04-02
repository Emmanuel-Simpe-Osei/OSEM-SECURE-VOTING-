"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";

export default function NewElectionPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    results_visibility: "hidden",
  });

  function handleTitleChange(value: string) {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    setForm((prev) => ({ ...prev, title: value, slug }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (
      !form.title ||
      !form.slug ||
      !form.start_date ||
      !form.start_time ||
      !form.end_date ||
      !form.end_time
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    const startTime = new Date(`${form.start_date}T${form.start_time}`);
    const endTime = new Date(`${form.end_date}T${form.end_time}`);

    if (endTime <= startTime) {
      setError("End time must be after start time.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/elections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          description: form.description,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          results_visibility: form.results_visibility,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create election.");
        setLoading(false);
        return;
      }

      router.push(`/admin/elections/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0B1E35" }}
    >
      {/* Header */}
      <div
        className="w-full px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-60"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
        </div>
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
          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">
              Create Election
            </h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Set up a new election. You can add candidates and voters after
              creating it.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2.5 rounded-2xl p-4 mb-6"
              style={{
                background: "rgba(220,38,38,0.15)",
                border: "1px solid rgba(220,38,38,0.3)",
              }}
            >
              <AlertCircle
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: "#FCA5A5" }}
              />
              <p className="text-xs" style={{ color: "#FCA5A5" }}>
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Election Title */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h2 className="text-sm font-bold text-white mb-4">
                Basic Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    className="block text-xs font-bold mb-2 uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    Election Title *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Business & Commerce SRC Election 2026"
                    required
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#ffffff",
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-bold mb-2 uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    URL Slug *
                  </label>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      /election/
                    </span>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, slug: e.target.value }))
                      }
                      placeholder="bcom-src-2026"
                      required
                      className="flex-1 px-4 py-3.5 rounded-2xl text-sm outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#ffffff",
                      }}
                    />
                  </div>
                  <p
                    className="text-xs mt-1.5"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    Auto-generated from title. This is the URL students will use
                    to vote.
                  </p>
                </div>

                <div>
                  <label
                    className="block text-xs font-bold mb-2 uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Brief description of this election..."
                    rows={3}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none transition-all resize-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#ffffff",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Election Window */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: "#F9A825" }} />
                Voting Window
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-xs font-bold mb-2 uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        start_date: e.target.value,
                      }))
                    }
                    required
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#ffffff",
                      colorScheme: "dark",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-bold mb-2 uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        start_time: e.target.value,
                      }))
                    }
                    required
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#ffffff",
                      colorScheme: "dark",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-bold mb-2 uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, end_date: e.target.value }))
                    }
                    required
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#ffffff",
                      colorScheme: "dark",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-bold mb-2 uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, end_time: e.target.value }))
                    }
                    required
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#ffffff",
                      colorScheme: "dark",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Results Visibility */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4" style={{ color: "#F9A825" }} />
                Results Visibility
              </h2>

              <div className="space-y-3">
                {[
                  {
                    value: "hidden",
                    label: "Hidden",
                    desc: "Results only visible to admins until manually published",
                    icon: EyeOff,
                  },
                  {
                    value: "turnout_only",
                    label: "Turnout Only",
                    desc: "Show voter turnout percentage but not candidate totals",
                    icon: Eye,
                  },
                  {
                    value: "public_after_close",
                    label: "Public After Close",
                    desc: "Full results visible to everyone once election closes",
                    icon: Eye,
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        results_visibility: option.value,
                      }))
                    }
                    className="w-full text-left transition-all active:scale-95"
                  >
                    <div
                      className="rounded-2xl p-4 flex items-center gap-4"
                      style={{
                        background:
                          form.results_visibility === option.value
                            ? "rgba(249,168,37,0.12)"
                            : "rgba(255,255,255,0.03)",
                        border:
                          form.results_visibility === option.value
                            ? "2px solid #F9A825"
                            : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <option.icon
                        className="w-5 h-5 shrink-0"
                        style={{
                          color:
                            form.results_visibility === option.value
                              ? "#F9A825"
                              : "rgba(255,255,255,0.3)",
                        }}
                      />
                      <div className="flex-1">
                        <p
                          className="text-sm font-bold"
                          style={{
                            color:
                              form.results_visibility === option.value
                                ? "#F9A825"
                                : "rgba(255,255,255,0.8)",
                          }}
                        >
                          {option.label}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "rgba(255,255,255,0.3)" }}
                        >
                          {option.desc}
                        </p>
                      </div>
                      {form.results_visibility === option.value && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "#F9A825" }}
                        >
                          <svg
                            className="w-3 h-3"
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
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #F9A825, #E65100)",
                color: "#0B1E35",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Election...
                </>
              ) : (
                "Create Election"
              )}
            </button>
          </form>
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
