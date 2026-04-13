import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";
import { z } from "zod";

const resetSchema = z
  .object({
    election_id: z.string().uuid(),
    student_id: z.string().optional(),
    school_email: z.string().email().optional(),
    reason: z.string().min(5).max(500),
  })
  .refine((data) => data.student_id || data.school_email, {
    message: "Either student_id or school_email is required",
  });

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Only super_admin can reset eligibility checks
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Missing required fields." },
      { status: 400 },
    );
  }

  const { election_id, student_id, school_email, reason } = parsed.data;

  let query = supabaseServer
    .from("eligibility_checks")
    .select("id, student_id, school_email, full_name, result")
    .eq("election_id", election_id);

  if (student_id) {
    query = query.eq("student_id", student_id);
  } else {
    query = query.eq("school_email", school_email!);
  }

  const { data: existingCheck } = await query.single();

  if (!existingCheck) {
    return NextResponse.json(
      { error: "No eligibility check found for this student." },
      { status: 404 },
    );
  }

  const { error: deleteError } = await supabaseServer
    .from("eligibility_checks")
    .delete()
    .eq("id", existingCheck.id);

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to reset eligibility check." },
      { status: 500 },
    );
  }

  await supabaseServer.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: session.admin_id,
    action: "ELIGIBILITY_CHECK_RESET",
    target_type: "voter",
    target_id: existingCheck.id,
    metadata: {
      election_id,
      student_id: existingCheck.student_id,
      previous_result: existingCheck.result,
      reason: reason.trim(),
    },
  });

  return NextResponse.json({
    success: true,
    message: `Eligibility check reset. ${existingCheck.full_name || existingCheck.school_email} can now check again online.`,
  });
}
