import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/server";
import { checkRateLimit, otpVerifyLimiter } from "@/lib/rate-limit/upstash";
import { getSafeIPHash, getIPRateLimitKey } from "@/lib/utils/ip";
import { generateToken } from "@/lib/security/hash";
import { hashOTP } from "@/lib/security/otp";
import { getStudentSession } from "@/lib/auth/session";
import { z } from "zod";

// ── Input validation ──────────────────────────────────────────────
const verifyOTPSchema = z.object({
  student_id: z
    .string()
    .min(5)
    .max(20)
    .regex(/^[a-zA-Z0-9]+$/),
  election_slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-zA-Z0-9-]+$/),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^[0-9]+$/, "OTP must be numeric"),
});

const GENERIC_ERROR = {
  error: "Invalid or expired code. Please try again.",
};

export async function POST(request: NextRequest) {
  try {
    // ── Step 1: Parse and validate input ───────────────────────────
    const body = await request.json();
    const parsed = verifyOTPSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(GENERIC_ERROR, { status: 400 });
    }

    const { student_id, election_slug, otp } = parsed.data;
    const ipHash = getSafeIPHash(request);

    // ── Step 2: Rate limit by student ID ───────────────────────────
    const studentLimit = await checkRateLimit(
      otpVerifyLimiter,
      `student:${student_id}`,
    );
    if (!studentLimit.allowed) {
      return NextResponse.json(GENERIC_ERROR, { status: 429 });
    }

    // ── Step 3: Rate limit by IP ────────────────────────────────────
    const ipLimit = await checkRateLimit(
      otpVerifyLimiter,
      getIPRateLimitKey(request, "otp_verify"),
    );
    if (!ipLimit.allowed) {
      return NextResponse.json(GENERIC_ERROR, { status: 429 });
    }

    // ── Step 4: Get election ─────────────────────────────────────────
    const { data: election } = await supabaseServer
      .from("elections")
      .select("id, status")
      .eq("slug", election_slug)
      .single();

    if (!election || election.status !== "active") {
      return NextResponse.json(GENERIC_ERROR, { status: 400 });
    }

    // ── Step 5: Hash OTP and call verify RPC ────────────────────────
    // Hash the submitted OTP before passing to RPC
    // The RPC handles: hash comparison, attempt counting, lockout, mark used
    const otpHash = hashOTP(otp);

    const { data: verifyResult, error: verifyError } = await supabaseServer.rpc(
      "verify_otp_attempt",
      {
        p_election_id: election.id,
        p_student_id: student_id,
        p_otp_hash: otpHash,
      },
    );

    if (verifyError) {
      console.error("[verify-otp] RPC error:", verifyError);
      return NextResponse.json(GENERIC_ERROR, { status: 500 });
    }

    // ── Step 6: Handle verification result ──────────────────────────
    if (!verifyResult?.success) {
      await supabaseServer.from("audit_logs").insert({
        actor_type: "student",
        actor_id: student_id,
        action: "OTP_VERIFY_FAILED",
        target_type: "election",
        target_id: election.id,
        metadata: { reason: verifyResult?.reason },
        ip_hash: ipHash,
      });

      return NextResponse.json(GENERIC_ERROR, { status: 400 });
    }

    // ── Step 7: Create student session ──────────────────────────────
    const session = await getStudentSession();
    session.student_id = student_id;
    session.election_id = election.id;
    session.session_id = generateToken(16);
    session.created_at = new Date().toISOString();
    await session.save();

    // ── Step 8: Write audit log ──────────────────────────────────────
    await supabaseServer.from("audit_logs").insert({
      actor_type: "student",
      actor_id: student_id,
      action: "OTP_VERIFIED",
      target_type: "election",
      target_id: election.id,
      metadata: { session_id: session.session_id },
      ip_hash: ipHash,
    });

    // ── Step 9: Return success with redirect path ────────────────────
    return NextResponse.json({
      success: true,
      redirect: `/election/${election_slug}/ballot`,
    });
  } catch (error) {
    console.error("[verify-otp] Unexpected error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
