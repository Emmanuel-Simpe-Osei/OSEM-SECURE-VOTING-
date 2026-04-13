import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";
import { z } from "zod";

const UUID = z.uuid();

const patchSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(500).optional(),
  available_sessions: z
    .array(z.string().min(1).max(50))
    .min(1)
    .max(20)
    .optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid election ID." }, { status: 400 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { enabled, message, available_sessions } = parsed.data;

  const { data: election } = await supabaseServer
    .from("elections")
    .select("id, created_by")
    .eq("id", id)
    .single();

  if (!election) {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }

  if (session.role !== "super_admin" && election.created_by !== session.admin_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabaseServer
    .from("elections")
    .update({
      session_verification_enabled: enabled,
      session_verification_message: message ?? null,
      available_sessions: available_sessions ?? ["Morning", "Evening", "Weekend"],
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to update." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
