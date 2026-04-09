import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;
  const { enabled, message, available_sessions } = await request.json();

  const { error } = await supabaseServer
    .from("elections")
    .update({
      session_verification_enabled: enabled,
      session_verification_message: message,
      available_sessions: available_sessions || [
        "Morning",
        "Evening",
        "Weekend",
      ],
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to update." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
