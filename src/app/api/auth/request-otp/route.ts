import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/server";
import { generateOTP } from "@/lib/security/hash";
import { hashOTP } from "@/lib/security/otp";
import { checkRateLimit, otpRequestLimiter } from "@/lib/rate-limit/upstash";
import { getSafeIPHash, getIPRateLimitKey } from "@/lib/utils/ip";
import { sendOTPEmail } from "@/lib/email/resend";
import { z } from "zod";

// ── Input validation schema ───────────────────────────────────────
const requestOTPSchema = z.object({
  student_id: z
    .string()
    .min(5, "Invalid student ID")
    .max(20, "Invalid student ID")
    .regex(/^[a-zA-Z0-9]+$/, "Invalid student ID format"),
  election_slug: z
    .string()
    .min(3, "Invalid election")
    .max(100, "Invalid election")
    .regex(/^[a-zA-Z0-9-]+$/, "Invalid election format"),
});

// ── Generic error — never reveal specific reason ──────────────────
const GENERIC_ERROR = {
  error: "Invalid student ID or election. Please check and try again.",
};

export async function POST(request: NextRequest) {
  try {
    // ── Step 1: Parse and validate input ───────────────────────────
    const body = await request.json();
    const parsed = requestOTPSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(GENERIC_ERROR, { status: 400 });
    }

    const { student_id, election_slug } = parsed.data;
    const ipHash = getSafeIPHash(request);

    // ── Step 2: Rate limit by student ID ───────────────────────────
    const studentLimit = await checkRateLimit(
      otpRequestLimiter,
      `student:${student_id}`,
    );
    if (!studentLimit.allowed) {
      await supabaseServer.from("incident_flags").insert({
        student_id,
        reason: "OTP_REQUEST_RATE_LIMIT_EXCEEDED",
        severity: "medium",
        metadata: { ip_hash: ipHash },
      });
      return NextResponse.json(GENERIC_ERROR, { status: 429 });
    }

    // ── Step 3: Rate limit by IP ────────────────────────────────────
    const ipLimit = await checkRateLimit(
      otpRequestLimiter,
      getIPRateLimitKey(request, "otp_request"),
    );
    if (!ipLimit.allowed) {
      return NextResponse.json(GENERIC_ERROR, { status: 429 });
    }

    // ── Step 4: Get election by slug ────────────────────────────────
    const { data: election, error: electionError } = await supabaseServer
      .from("elections")
      .select("id, title, status, start_time, end_time")
      .eq("slug", election_slug)
      .single();

    if (electionError || !election) {
      return NextResponse.json(GENERIC_ERROR, { status: 400 });
    }

    // ── Step 5: Check election is active ────────────────────────────
    if (election.status !== "active") {
      return NextResponse.json(GENERIC_ERROR, { status: 400 });
    }

    // ── Step 6: Check election time window ──────────────────────────
    const now = new Date();
    if (
      now < new Date(election.start_time) ||
      now > new Date(election.end_time)
    ) {
      return NextResponse.json(GENERIC_ERROR, { status: 400 });
    }

    // ── Step 7: Check student eligibility ───────────────────────────
    const { data: voter, error: voterError } = await supabaseServer
      .from("voter_eligibility")
      .select("id, school_email, full_name, eligible, has_voted")
      .eq("election_id", election.id)
      .eq("student_id", student_id)
      .single();

    if (voterError || !voter) {
      return NextResponse.json(GENERIC_ERROR, { status: 400 });
    }

    if (!voter.eligible || voter.has_voted) {
      return NextResponse.json(GENERIC_ERROR, { status: 400 });
    }

    // ── Step 8: Invalidate any existing unused OTPs ─────────────────
    await supabaseServer
      .from("otp_challenges")
      .update({ used_at: new Date().toISOString() })
      .eq("election_id", election.id)
      .eq("student_id", student_id)
      .is("used_at", null);

    // ── Step 9: Generate OTP and hash it ────────────────────────────
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(
      Date.now() + parseInt(process.env.OTP_EXPIRY_MINUTES || "10") * 60 * 1000,
    );

    // ── Step 10: Store hashed OTP ───────────────────────────────────
    const { error: otpError } = await supabaseServer
      .from("otp_challenges")
      .insert({
        election_id: election.id,
        student_id,
        otp_hash: otpHash,
        expires_at: expiresAt.toISOString(),
        max_attempts: parseInt(process.env.OTP_MAX_ATTEMPTS || "5"),
      });

    if (otpError) {
      console.error("[request-otp] Failed to store OTP:", otpError);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }

    // ── Step 11: Send OTP email ─────────────────────────────────────
    const emailSent = await sendOTPEmail({
      to: voter.school_email,
      studentName: voter.full_name,
      electionTitle: election.title,
      otp,
      expiresInMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || "10"),
    });

    if (!emailSent) {
      // Clean up OTP record if email failed
      await supabaseServer
        .from("otp_challenges")
        .update({ used_at: new Date().toISOString() })
        .eq("election_id", election.id)
        .eq("student_id", student_id)
        .is("used_at", null);

      return NextResponse.json(
        { error: "Failed to send OTP email. Please try again." },
        { status: 500 },
      );
    }

    // ── Step 12: Write audit log ────────────────────────────────────
    await supabaseServer.from("audit_logs").insert({
      actor_type: "student",
      actor_id: student_id,
      action: "OTP_REQUESTED",
      target_type: "election",
      target_id: election.id,
      metadata: { election_slug },
      ip_hash: ipHash,
    });

    // ── Step 13: Return success ─────────────────────────────────────
    return NextResponse.json({
      success: true,
      message: "A verification code has been sent to your school email.",
      email_hint:
        voter.school_email.substring(0, 3) +
        "*****@" +
        voter.school_email.split("@")[1],
    });
  } catch (error) {
    console.error("[request-otp] Unexpected error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
