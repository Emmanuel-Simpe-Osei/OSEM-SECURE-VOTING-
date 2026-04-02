import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const { data: election } = await supabaseServer
    .from("elections")
    .select("id, title, status")
    .eq("slug", slug)
    .single();

  if (!election) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(election);
}
