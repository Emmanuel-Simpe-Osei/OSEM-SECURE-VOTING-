"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Mail,
} from "lucide-react";

export default function VerifyOTPPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [studentId, setStudentId] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const hint = sessionStorage.getItem("email_hint") || "";
    const sid = sessionStorage.getItem("student_id") || "";
    setEmailHint(hint);
    setStudentId(sid);
    if (!sid) router.push(`/election/${slug}/login`);
    inputRefs.current[0]?.focus();
  }, [slug, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  function handleOTPChange(index: number, value: string) {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          election_slug: slug,
          otp: code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid or expired code. Please try again.");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      setSuccess(true);
      sessionStorage.removeItem("email_hint");
      sessionStorage.removeItem("student_id");

      setTimeout(() => {
        router.push(data.redirect);
      }, 800);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || !studentId) return;
    setResendLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, election_slug: slug }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not resend code.");
        return;
      }

      setResendCooldown(60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  const otpComplete = otp.every((d) => d !== "");

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#F4F4F4" }}
    >
      {/* Ambient blobs */}
      <div
        className="fixed inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "#00004E" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "#FFB606" }}
        />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
            style={{ background: "#00004E" }}
          >
            <ShieldCheck className="w-7 h-7" style={{ color: "#FFB606" }} />
          </div>
          <p
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "#00004E" }}
          >
            OSEM Technologies
          </p>
          <h1
            className="text-2xl font-bold mt-1 tracking-tight"
            style={{ color: "#1F2937" }}
          >
            Secure Vote
          </h1>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8 shadow-xl"
          style={{ background: "#ffffff", border: "1px solid #e8e8e8" }}
        >
          {/* Back */}
          <button
            onClick={() => router.push(`/election/${slug}/login`)}
            className="flex items-center gap-1.5 text-xs font-medium mb-6 transition-opacity hover:opacity-60"
            style={{ color: "#6B7280" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          <h2 className="text-xl font-bold mb-1" style={{ color: "#1F2937" }}>
            Check your email
          </h2>

          {/* Email hint box */}
          {emailHint && (
            <div
              className="flex items-center gap-2.5 rounded-2xl p-3.5 mt-4 mb-6"
              style={{ background: "#F0F4FF", border: "1px solid #C7D7FF" }}
            >
              <Mail className="w-4 h-4 shrink-0" style={{ color: "#00004E" }} />
              <p className="text-xs" style={{ color: "#1F2937" }}>
                Code sent to <span className="font-semibold">{emailHint}</span>
              </p>
            </div>
          )}

          <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
            Enter the 6-digit code from your email. It expires in 10 minutes.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* OTP boxes */}
            <div className="flex gap-2 justify-between" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOTPChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={loading || success}
                  className="w-11 h-13 text-center text-xl font-bold rounded-2xl outline-none transition-all duration-150 disabled:opacity-40"
                  style={{
                    border: digit ? "2px solid #00004E" : "2px solid #E5E7EB",
                    background: digit ? "#F0F4FF" : "#F9FAFB",
                    color: "#1F2937",
                    height: "52px",
                  }}
                />
              ))}
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-2.5 rounded-2xl p-3.5"
                style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
              >
                <AlertCircle
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: "#DC2626" }}
                />
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "#DC2626" }}
                >
                  {error}
                </p>
              </div>
            )}

            {/* Success state */}
            {success && (
              <div
                className="flex items-center gap-2.5 rounded-2xl p-3.5"
                style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "#16A34A" }}
                >
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p
                  className="text-xs font-semibold"
                  style={{ color: "#16A34A" }}
                >
                  Verified! Taking you to your ballot...
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !otpComplete || success}
              className="w-full py-3.5 px-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#00004E", color: "#ffffff" }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : success ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                "Verify & Continue"
              )}
            </button>
          </form>

          {/* Resend */}
          <div className="text-center mt-5">
            {resendCooldown > 0 ? (
              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                Resend available in{" "}
                <span className="font-semibold" style={{ color: "#1F2937" }}>
                  {resendCooldown}s
                </span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="text-xs font-semibold transition-opacity hover:opacity-60 disabled:opacity-40"
                style={{ color: "#00004E" }}
              >
                {resendLoading
                  ? "Sending..."
                  : "Didn't receive it? Resend code"}
              </button>
            )}
          </div>

          <div className="my-5 h-px" style={{ background: "#F3F4F6" }} />

          <p className="text-xs text-center" style={{ color: "#9CA3AF" }}>
            Issues signing in? Contact your department administrator.
          </p>
        </div>

        {/* Bottom tag */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#16A34A" }}
          />
          <p className="text-xs" style={{ color: "#6B7280" }}>
            End-to-end encrypted · Powered by{" "}
            <span className="font-semibold" style={{ color: "#00004E" }}>
              OSEM Technologies
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
