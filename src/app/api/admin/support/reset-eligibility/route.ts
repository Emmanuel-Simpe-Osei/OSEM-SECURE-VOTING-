import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const { election_id, student_id, school_email, reason } = body;

  if (!election_id || (!student_id && !school_email) || !reason?.trim()) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 },
    );
  }

  let query = supabaseServer
    .from("eligibility_checks")
    .select("id, student_id, school_email, full_name, result")
    .eq("election_id", election_id);

  if (student_id) {
    query = query.eq("student_id", student_id);
  } else {
    query = query.eq("school_email", school_email);
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
    action: "eligibility_check_reset",
    target_type: "voter",
    target_id: existingCheck.id,
    metadata: {
      election_id,
      student_id: existingCheck.student_id,
      school_email: existingCheck.school_email,
      full_name: existingCheck.full_name,
      previous_result: existingCheck.result,
      reason: reason.trim(),
      reset_by_admin: session.email,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Eligibility check reset. ${existingCheck.full_name || existingCheck.school_email} can now check again online.`,
  });
}
