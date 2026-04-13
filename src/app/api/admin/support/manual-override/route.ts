import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";
import crypto from "crypto";
import { z } from "zod";

const overrideSchema = z.object({
  voter_id: z.uuid(),
  election_id: z.uuid(),
  student_id: z.string().min(1),
  reason: z.string().min(5).max(500),
});

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = overrideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { voter_id, election_id, student_id, reason } = parsed.data;

  const { data: voter } = await supabaseServer
    .from("voter_eligibility")
    .select("has_voted, full_name")
    .eq("id", voter_id)
    .eq("election_id", election_id)
    .single();

  if (!voter) {
    return NextResponse.json({ error: "Voter not found." }, { status: 404 });
  }

  if (voter.has_voted) {
    return NextResponse.json(
      { error: "This voter has already voted." },
      { status: 409 },
    );
  }

  const bypass_code = crypto.randomBytes(4).toString("hex").toUpperCase();
  const now = new Date().toISOString();

  // Create a ballot_submission record so vote totals stay accurate
  const { data: submission, error: submissionError } = await supabaseServer
    .from("ballot_submissions")
    .insert({
      election_id,
      student_id,
      submission_token: `override-${bypass_code}`,
      confirmation_code: bypass_code,
      submitted_at: now,
      client_ip_hash: "admin-override",
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    return NextResponse.json(
      { error: "Failed to create ballot record." },
      { status: 500 },
    );
  }

  // Mark as voted
  const { error } = await supabaseServer
    .from("voter_eligibility")
    .update({ has_voted: true, voted_at: now })
    .eq("id", voter_id)
    .eq("election_id", election_id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to process override." },
      { status: 500 },
    );
  }

  await supabaseServer.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: session.admin_id,
    action: "MANUAL_VOTE_OVERRIDE",
    target_type: "voter_eligibility",
    target_id: voter_id,
    metadata: {
      student_id,
      election_id,
      reason: reason.trim(),
      bypass_code,
      submission_id: submission.id,
      overridden_at: now,
      admin_id: session.admin_id,
    },
    ip_hash: "admin-override",
  });

  return NextResponse.json({ success: true, bypass_code });
}
