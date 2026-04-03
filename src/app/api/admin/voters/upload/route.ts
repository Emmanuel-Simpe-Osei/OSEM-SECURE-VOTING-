import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";
import { z } from "zod";

const uploadSchema = z.object({
  election_id: z.string(),
  voters: z
    .array(
      z.object({
        student_id: z.string().min(1),
        school_email: z.string().email(),
        full_name: z.string().min(1),
        department: z.string().nullable().optional(),
        level: z.string().nullable().optional(),
      }),
    )
    .min(1),
});

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = uploadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data." }, { status: 400 });
  }

  const { election_id, voters } = parsed.data;

  // Verify election exists
  const { data: election } = await supabaseServer
    .from("elections")
    .select("id, status")
    .eq("id", election_id)
    .single();

  if (!election) {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }

  if (election.status === "closed" || election.status === "archived") {
    return NextResponse.json(
      { error: "Cannot upload voters to a closed or archived election." },
      { status: 400 },
    );
  }

  // Insert voters with ON CONFLICT DO NOTHING
  const rows = voters.map((v) => ({
    election_id,
    student_id: v.student_id,
    school_email: v.school_email,
    full_name: v.full_name,
    department: v.department || null,
    level: v.level || null,
    eligible: true,
    has_voted: false,
  }));

  // Insert in batches of 500
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { data, error } = await supabaseServer
      .from("voter_eligibility")
      .upsert(batch, {
        onConflict: "election_id,student_id",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      console.error("[voters/upload]", error);
      return NextResponse.json(
        { error: "Failed to upload voters." },
        { status: 500 },
      );
    }

    inserted += data?.length || 0;
    skipped += batch.length - (data?.length || 0);
  }

  // Audit log
  await supabaseServer.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: session.admin_id,
    action: "VOTERS_UPLOADED",
    target_type: "election",
    target_id: election_id,
    metadata: { inserted, skipped, total: voters.length },
    ip_hash: "server-side",
  });

  return NextResponse.json({ success: true, inserted, skipped });
}
