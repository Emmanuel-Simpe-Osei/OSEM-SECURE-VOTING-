import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const { voter_id, election_id, new_email } = body;

  if (!voter_id || !new_email || !new_email.includes("@")) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  // Update email
  const { error } = await supabaseServer
    .from("voter_eligibility")
    .update({ school_email: new_email.trim() })
    .eq("id", voter_id)
    .eq("election_id", election_id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update email." },
      { status: 500 },
    );
  }

  // Log the action
  await supabaseServer.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: session.admin_id,
    action: "VOTER_EMAIL_UPDATED",
    target_type: "voter_eligibility",
    target_id: voter_id,
    metadata: { new_email, election_id },
    ip_hash: "admin-action",
  });

  return NextResponse.json({ success: true });
}
