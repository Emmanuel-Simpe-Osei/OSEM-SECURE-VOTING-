import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { supabaseServer } from "@/lib/db/server";
import { getStudentSession } from "@/lib/auth/session";
import { generateToken } from "@/lib/security/hash";
import { getSafeIPHash } from "@/lib/utils/ip";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Step 1: Get Google session
  const googleSession = await getServerSession(authOptions);

  if (!googleSession?.user?.email) {
    return NextResponse.redirect(
      new URL(`/election/${slug}/login`, request.url),
    );
  }

  const email = googleSession.user.email;

  // Step 2: Enforce domain restriction
  if (!email.endsWith("@upsamail.edu.gh")) {
    return NextResponse.redirect(
      new URL(`/election/${slug}/login?error=invalid_domain`, request.url),
    );
  }

  // Step 3: Extract student ID from email
  const studentId = email.split("@")[0];

  // Step 4: Get election by slug
  const { data: election } = await supabaseServer
    .from("elections")
    .select("id, title, status, start_time, end_time")
    .eq("slug", slug)
    .single();

  if (!election || election.status !== "active") {
    return NextResponse.redirect(
      new URL(`/election/${slug}/login?error=election_not_active`, request.url),
    );
  }

  // Step 5: Check time window
  const now = new Date();
  if (
    now < new Date(election.start_time) ||
    now > new Date(election.end_time)
  ) {
    return NextResponse.redirect(
      new URL(`/election/${slug}/login?error=election_not_active`, request.url),
    );
  }

  // Step 6: Check voter eligibility
  const { data: voter } = await supabaseServer
    .from("voter_eligibility")
    .select("id, eligible, has_voted")
    .eq("election_id", election.id)
    .eq("school_email", email)
    .single();

  if (!voter || !voter.eligible) {
    return NextResponse.redirect(
      new URL(`/election/${slug}/login?error=not_eligible`, request.url),
    );
  }

  if (voter.has_voted) {
    return NextResponse.redirect(
      new URL(`/election/${slug}/already-voted`, request.url),
    );
  }

  // Step 7: Create iron-session — works here because this is a Route Handler
  const session = await getStudentSession();
  session.student_id = studentId;
  session.election_id = election.id;
  session.session_id = generateToken(16);
  session.created_at = new Date().toISOString();
  await session.save();

  // Step 8: Write audit log
  await supabaseServer.from("audit_logs").insert({
    actor_type: "student",
    actor_id: studentId,
    action: "GOOGLE_AUTH_SUCCESS",
    target_type: "election",
    target_id: election.id,
    metadata: { email, session_id: session.session_id },
    ip_hash: getSafeIPHash(request),
  });

  // Step 9: Redirect to ballot
  return NextResponse.redirect(
    new URL(`/election/${slug}/ballot`, request.url),
  );
}
