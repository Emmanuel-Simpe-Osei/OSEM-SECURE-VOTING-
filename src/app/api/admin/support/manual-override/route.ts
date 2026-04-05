import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const { voter_id, election_id, student_id, reason } = body;

  if (!voter_id || !election_id || !reason?.trim()) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  // Check voter hasn't already voted
  const { data: voter } = await supabaseServer
    .from("voter_eligibility")
    .select("has_voted, full_name")
    .eq("id", voter_id)
    .single();

  if (voter?.has_voted) {
    return NextResponse.json(
      { error: "This voter has already voted." },
      { status: 409 },
    );
  }

  // Generate a bypass code for the record
  const bypass_code = crypto.randomBytes(4).toString("hex").toUpperCase();
  const now = new Date().toISOString();

  // Mark as voted
  const { error } = await supabaseServer
    .from("voter_eligibility")
    .update({
      has_voted: true,
      voted_at: now,
    })
    .eq("id", voter_id)
    .eq("election_id", election_id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to process override." },
      { status: 500 },
    );
  }

  // Full audit log
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
      overridden_at: now,
      admin_id: session.admin_id,
    },
    ip_hash: "admin-override",
  });

  return NextResponse.json({ success: true, bypass_code });
}
