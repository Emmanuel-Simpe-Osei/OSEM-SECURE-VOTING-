import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";
import { checkRateLimit, voteSubmitLimiter } from "@/lib/rate-limit/upstash";
import { getSafeIPHash, getIPRateLimitKey } from "@/lib/utils/ip";
import { z } from "zod";

const submitSchema = z.object({
  token: z.string().min(10),
  selections: z
    .array(
      z.object({
        position_id: z.string().min(36).max(36),
        candidate_id: z.string().min(36).max(36),
      }),
    )
    .min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Step 1: Verify session
    const session = await getStudentSession();
    if (!session?.student_id) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // Step 2: Rate limit
    const studentLimit = await checkRateLimit(
      voteSubmitLimiter,
      `student:${session.student_id}`,
    );
    if (!studentLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait and try again." },
        { status: 429 },
      );
    }

    const ipLimit = await checkRateLimit(
      voteSubmitLimiter,
      getIPRateLimitKey(request, "vote_submit"),
    );
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait and try again." },
        { status: 429 },
      );
    }

    // Step 3: Parse body and log BEFORE validation
    const body = await request.json();
    console.log("[vote/submit] raw body:", JSON.stringify(body, null, 2));

    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      console.log(
        "[vote/submit] validation errors:",
        JSON.stringify(parsed.error.issues, null, 2),
      );
      return NextResponse.json(
        { error: "Invalid submission data." },
        { status: 400 },
      );
    }

    const { token, selections } = parsed.data;
    const ipHash = getSafeIPHash(request);

    // Step 4: Call the atomic RPC
    const { data, error } = await supabaseServer.rpc("submit_vote_rpc", {
      p_election_id: session.election_id,
      p_student_id: session.student_id,
      p_token: token,
      p_selections: selections,
      p_ip_hash: ipHash,
    });

    if (error) {
      console.error("[vote/submit] RPC error:", error);

      if (error.message.includes("ALREADY_VOTED")) {
        return NextResponse.json(
          { error: "You have already voted in this election." },
          { status: 400 },
        );
      }
      if (error.message.includes("ELECTION_NOT_ACTIVE")) {
        return NextResponse.json(
          { error: "This election is no longer active." },
          { status: 400 },
        );
      }
      if (error.message.includes("INVALID_OR_USED_TOKEN")) {
        return NextResponse.json(
          { error: "Your session has expired. Please log in again." },
          { status: 400 },
        );
      }
      if (error.message.includes("VOTER_NOT_ELIGIBLE")) {
        return NextResponse.json(
          { error: "You are not eligible to vote in this election." },
          { status: 400 },
        );
      }
      if (error.message.includes("INVALID_SELECTION")) {
        return NextResponse.json(
          { error: "One or more of your selections are invalid." },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }

    // Step 5: Destroy session after successful vote
    session.destroy();

    return NextResponse.json({
      success: true,
      confirmation_code: data.confirmation_code,
      submitted_at: data.submitted_at,
    });
  } catch (error) {
    console.error("[vote/submit] Unexpected error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
