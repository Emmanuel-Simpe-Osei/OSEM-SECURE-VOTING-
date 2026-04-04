import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/server";

export async function GET() {
  const now = new Date().toISOString();

  const { data: elections, error } = await supabaseServer
    .from("elections")
    .select(
      `
      id, title, slug, description, start_time, end_time, status,
      positions (
        id,
        candidates (id)
      ),
      voter_eligibility (id)
    `,
    )
    .eq("status", "active")
    .gte("end_time", now)
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ elections: [] });
  }

  const formatted = (elections || []).map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    end_time: e.end_time,
    status: e.status,
    candidate_count:
      e.positions?.reduce(
        (acc: number, p: { candidates: { id: string }[] }) =>
          acc + (p.candidates?.length || 0),
        0,
      ) || 0,
    voter_count: e.voter_eligibility?.length || 0,
  }));

  return NextResponse.json({ elections: formatted });
}
