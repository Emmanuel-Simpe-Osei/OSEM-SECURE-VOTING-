import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Get election
  const { data: election } = await supabaseServer
    .from("elections")
    .select("id, title, status, start_time, end_time, results_visibility")
    .eq("slug", slug)
    .single();

  if (!election) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canShowResults =
    election.status === "active" ||
    election.status === "paused" ||
    (election.status === "closed" &&
      election.results_visibility === "public_after_close");

  if (!canShowResults) {
    return NextResponse.json(
      { error: "Display not available." },
      { status: 403 },
    );
  }

  // Call the database function that does all the heavy lifting
  const { data: result, error } = await supabaseServer.rpc(
    "get_display_results",
    { election_id_param: election.id },
  );

  if (error || !result) {
    console.error("RPC error:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 },
    );
  }

  return NextResponse.json(result);
}
