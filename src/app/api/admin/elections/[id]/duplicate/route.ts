import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await getAdminSession();
  if (!session.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const { title, slug, start_time, end_time } = body;

  if (!title?.trim() || !slug?.trim()) {
    return NextResponse.json(
      { error: "Title and slug are required." },
      { status: 400 },
    );
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      {
        error: "Slug must only contain lowercase letters, numbers and hyphens.",
      },
      { status: 400 },
    );
  }

  if (!start_time || !end_time) {
    return NextResponse.json(
      { error: "Start and end time are required." },
      { status: 400 },
    );
  }

  if (new Date(end_time) <= new Date(start_time)) {
    return NextResponse.json(
      { error: "End time must be after start time." },
      { status: 400 },
    );
  }

  // Check slug unique
  const { data: existing } = await supabaseServer
    .from("elections")
    .select("id")
    .eq("slug", slug.trim())
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "This URL slug is already in use. Choose a different one." },
      { status: 400 },
    );
  }

  // Load source election
  const { data: source } = await supabaseServer
    .from("elections")
    .select(
      `
      title, description,
      results_visibility,
      session_verification_enabled,
      session_verification_message,
      available_sessions,
      eligibility_check_enabled
    `,
    )
    .eq("id", id)
    .single();

  if (!source) {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }

  // Create new election as draft with new times
  const { data: newElection, error: electionError } = await supabaseServer
    .from("elections")
    .insert({
      title: title.trim(),
      slug: slug.trim(),
      description: source.description,
      start_time: start_time,
      end_time: end_time,
      results_visibility: source.results_visibility,
      status: "draft",
      session_verification_enabled: source.session_verification_enabled,
      session_verification_message: source.session_verification_message,
      available_sessions: source.available_sessions,
      eligibility_check_enabled: false,
      created_by: session.admin_id,
    })
    .select("id")
    .single();

  if (electionError || !newElection) {
    return NextResponse.json(
      { error: "Failed to create election." },
      { status: 500 },
    );
  }

  // Load source positions with candidates
  const { data: positions } = await supabaseServer
    .from("positions")
    .select(
      `
      id, name, description, max_votes, sort_order,
      candidates (id, full_name, bio, photo_url, sort_order)
    `,
    )
    .eq("election_id", id)
    .order("sort_order");

  if (positions && positions.length > 0) {
    for (const position of positions) {
      const { data: newPosition, error: posError } = await supabaseServer
        .from("positions")
        .insert({
          election_id: newElection.id,
          name: position.name,
          description: position.description ?? null,
          max_votes: position.max_votes,
          sort_order: position.sort_order,
        })
        .select("id")
        .single();

      if (posError || !newPosition) continue;

      const candidates = position.candidates ?? [];
      if (candidates.length > 0) {
        await supabaseServer.from("candidates").insert(
          candidates.map(
            (c: {
              full_name: string;
              bio: string | null;
              photo_url: string | null;
              sort_order: number;
            }) => ({
              election_id: newElection.id,
              position_id: newPosition.id,
              full_name: c.full_name,
              bio: c.bio ?? null,
              photo_url: c.photo_url ?? null,
              sort_order: c.sort_order,
            }),
          ),
        );
      }
    }
  }

  await supabaseServer.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: session.admin_id,
    action: "election_duplicated",
    target_type: "election",
    target_id: newElection.id,
    metadata: {
      source_election_id: id,
      new_title: title.trim(),
      new_slug: slug.trim(),
      new_start_time: start_time,
      new_end_time: end_time,
      positions_copied: positions?.length ?? 0,
    },
  });

  return NextResponse.json({ id: newElection.id });
}
