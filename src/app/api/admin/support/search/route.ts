import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

// Escape special ILIKE characters to prevent pattern injection
function escapeLike(str: string): string {
  return str.replace(/[%_\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const electionId = searchParams.get("election_id");
  const q = searchParams.get("q")?.trim();

  if (!electionId || !q || q.length < 2) {
    return NextResponse.json({ voters: [] });
  }

  // Sanitize query length and escape ILIKE special chars
  const safeQ = escapeLike(q.slice(0, 100));

  const { data: voters } = await supabaseServer
    .from("voter_eligibility")
    .select(
      "id, student_id, full_name, school_email, department, level, has_voted, eligible",
    )
    .eq("election_id", electionId)
    .or(
      `student_id.ilike.%${safeQ}%,full_name.ilike.%${safeQ}%,school_email.ilike.%${safeQ}%`,
    )
    .limit(10);

  return NextResponse.json({ voters: voters || [] });
}
