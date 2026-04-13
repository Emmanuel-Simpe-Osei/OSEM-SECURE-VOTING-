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

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(electionId)) {
    return NextResponse.json(
      { error: "Invalid election ID." },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0") || 0);
  const limit = Math.min(
    100,
    parseInt(searchParams.get("limit") ?? "100") || 100,
  );
  const offset = page * limit;

  const {
    data: voters,
    error,
    count,
  } = await supabaseServer
    .from("voter_eligibility")
    .select(
      "id, student_id, full_name, school_email, department, level, has_voted",
      { count: "exact" },
    )
    .eq("election_id", electionId)
    .order("full_name")
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch voters." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    voters: voters || [],
    total: count ?? 0,
    page,
    limit,
  });
}
