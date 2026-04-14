import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/server";
import { z } from "zod";

const UUID = z.uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const { data: election } = await supabaseServer
    .from("elections")
    .select("id, title, slug, status")
    .eq("slug", slug)
    .single();

  if (!election) {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }

  const { data: positions } = await supabaseServer
    .from("positions")
    .select(
      `
      id, name, description, max_votes, sort_order,
      candidates (
        id, full_name, bio, photo_url, sort_order, is_no_vote
      )
    `,
    )
    .eq("election_id", election.id)
    .order("sort_order");

  return NextResponse.json({
    election: {
      title: election.title,
      slug: election.slug,
      status: election.status,
    },
    positions: positions || [],
  });
}
