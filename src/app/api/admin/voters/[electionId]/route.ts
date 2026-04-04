import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ electionId: string }> },
) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { electionId } = await params;

  const { data: voters, error } = await supabaseServer
    .from("voter_eligibility")
    .select(
      "id, student_id, full_name, school_email, department, level, has_voted",
    )
    .eq("election_id", electionId)
    .order("full_name");

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch voters." },
      { status: 500 },
    );
  }

  return NextResponse.json({ voters: voters || [] });
}
