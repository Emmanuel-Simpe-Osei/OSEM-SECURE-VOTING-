import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const electionId = searchParams.get("election_id");
  const q = searchParams.get("q")?.trim();

  if (!electionId || !q) {
    return NextResponse.json({ voters: [] });
  }

  const { data: voters } = await supabaseServer
    .from("voter_eligibility")
    .select(
      "id, student_id, full_name, school_email, department, level, has_voted, eligible",
    )
    .eq("election_id", electionId)
    .or(
      `student_id.ilike.%${q}%,full_name.ilike.%${q}%,school_email.ilike.%${q}%`,
    )
    .limit(10);

  return NextResponse.json({ voters: voters || [] });
}
