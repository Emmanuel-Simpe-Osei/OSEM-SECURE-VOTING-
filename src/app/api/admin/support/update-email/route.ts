import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";
import { z } from "zod";

const ALLOWED_EMAIL_DOMAIN =
  process.env.ALLOWED_EMAIL_DOMAIN || "upsamail.edu.gh";

const updateEmailSchema = z.object({
  voter_id: z.string().uuid(),
  election_id: z.string().uuid(),
  new_email: z
    .string()
    .email()
    .refine((email) => email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`), {
      message: `Email must be a @${ALLOWED_EMAIL_DOMAIN} address`,
    }),
});

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Only super_admin can update voter emails
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input." },
      { status: 400 },
    );
  }

  const { voter_id, election_id, new_email } = parsed.data;

  const { error } = await supabaseServer
    .from("voter_eligibility")
    .update({ school_email: new_email.trim().toLowerCase() })
    .eq("id", voter_id)
    .eq("election_id", election_id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update email." },
      { status: 500 },
    );
  }

  await supabaseServer.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: session.admin_id,
    action: "VOTER_EMAIL_UPDATED",
    target_type: "voter_eligibility",
    target_id: voter_id,
    metadata: { election_id },
    ip_hash: "admin-action",
  });

  return NextResponse.json({ success: true });
}
