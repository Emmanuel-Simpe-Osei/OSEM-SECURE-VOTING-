import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";
import { getSafeIPHash } from "@/lib/utils/ip";
import { z } from "zod";

const UUID = z.uuid();

// Restrict photo_url to the app's own Supabase Storage bucket only
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const STORAGE_ORIGIN = supabaseUrl ? new URL(supabaseUrl).origin : "";

const photoUrlSchema = z
  .url()
  .refine(
    (url) =>
      !STORAGE_ORIGIN || url.startsWith(`${STORAGE_ORIGIN}/storage/`),
    { message: "Photo must be hosted in app storage." },
  )
  .nullable()
  .optional();

/**
 * Returns the election row if the admin is the creator or a super_admin.
 * Returns null if the election doesn't exist.
 * Returns "forbidden" if the election belongs to a different admin.
 */
async function getOwnedElection(
  electionId: string,
  adminId: string,
  role: string,
) {
  const { data: election } = await supabaseServer
    .from("elections")
    .select("status, created_by")
    .eq("id", electionId)
    .single();

  if (!election) return null;
  if (role !== "super_admin" && election.created_by !== adminId)
    return "forbidden" as const;
  return election;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: electionId } = await params;
  if (!UUID.safeParse(electionId).success) {
    return NextResponse.json({ error: "Invalid election ID." }, { status: 400 });
  }

  const owned = await getOwnedElection(electionId, session.admin_id, session.role);
  if (owned === null) {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }
  if (owned === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  if (body.type === "position") {
    const schema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().nullable().optional(),
      max_votes: z.number().min(1).max(10),
      sort_order: z.number(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid position data." },
        { status: 400 },
      );
    }
    const { data, error } = await supabaseServer
      .from("positions")
      .insert({
        election_id: electionId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        max_votes: parsed.data.max_votes,
        sort_order: parsed.data.sort_order,
      })
      .select("id, name, description, max_votes, sort_order")
      .single();
    if (error) {
      return NextResponse.json(
        { error: "Failed to add position." },
        { status: 500 },
      );
    }
    return NextResponse.json(data);
  }

  if (body.type === "candidate") {
    const schema = z.object({
      position_id: z.uuid(),
      full_name: z.string().min(1).max(200),
      bio: z.string().nullable().optional(),
      photo_url: photoUrlSchema,
      sort_order: z.number(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid candidate data." },
        { status: 400 },
      );
    }
    const { data, error } = await supabaseServer
      .from("candidates")
      .insert({
        election_id: electionId,
        position_id: parsed.data.position_id,
        full_name: parsed.data.full_name,
        bio: parsed.data.bio || null,
        photo_url: parsed.data.photo_url || null,
        sort_order: parsed.data.sort_order,
      })
      .select("id, full_name, bio, photo_url, sort_order")
      .single();
    if (error) {
      return NextResponse.json(
        { error: "Failed to add candidate." },
        { status: 500 },
      );
    }
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Invalid type." }, { status: 400 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: electionId } = await params;
  if (!UUID.safeParse(electionId).success) {
    return NextResponse.json({ error: "Invalid election ID." }, { status: 400 });
  }

  const ipHash = getSafeIPHash(request);
  const body = await request.json();

  if (body.type === "position_order") {
    if (!UUID.safeParse(body.position_id).success) {
      return NextResponse.json(
        { error: "Invalid position ID." },
        { status: 400 },
      );
    }

    // Ownership check: position must belong to this admin's election
    const owned = await getOwnedElection(electionId, session.admin_id, session.role);
    if (owned === null) {
      return NextResponse.json({ error: "Election not found." }, { status: 404 });
    }
    if (owned === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseServer
      .from("positions")
      .update({ sort_order: body.sort_order })
      .eq("id", body.position_id)
      .eq("election_id", electionId);
    if (error) {
      return NextResponse.json(
        { error: "Failed to update order." },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true });
  }

  if (body.type === "candidate_edit") {
    const { data: election } = await supabaseServer
      .from("elections")
      .select("status, created_by")
      .eq("id", electionId)
      .single();

    if (!election) {
      return NextResponse.json(
        { error: "Election not found." },
        { status: 404 },
      );
    }

    if (
      session.role !== "super_admin" &&
      election.created_by !== session.admin_id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const lockedStatuses = ["active", "paused", "closed", "archived"];
    if (lockedStatuses.includes(election.status)) {
      return NextResponse.json(
        { error: "Candidates cannot be edited after voting has started." },
        { status: 403 },
      );
    }

    const schema = z.object({
      candidate_id: z.uuid(),
      full_name: z.string().min(1).max(200),
      bio: z.string().nullable().optional(),
      photo_url: photoUrlSchema,
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid candidate data." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseServer
      .from("candidates")
      .update({
        full_name: parsed.data.full_name,
        bio: parsed.data.bio ?? null,
        photo_url: parsed.data.photo_url ?? null,
      })
      .eq("id", parsed.data.candidate_id)
      .eq("election_id", electionId)
      .select("id, full_name, bio, photo_url, sort_order")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update candidate." },
        { status: 500 },
      );
    }

    await supabaseServer.from("audit_logs").insert({
      actor_type: "admin",
      actor_id: session.admin_id,
      action: "CANDIDATE_EDITED",
      target_type: "candidate",
      target_id: parsed.data.candidate_id,
      metadata: { election_id: electionId, full_name: parsed.data.full_name },
      ip_hash: ipHash,
    });

    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Invalid type." }, { status: 400 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: electionId } = await params;
  if (!UUID.safeParse(electionId).success) {
    return NextResponse.json({ error: "Invalid election ID." }, { status: 400 });
  }

  const ipHash = getSafeIPHash(request);

  const owned = await getOwnedElection(electionId, session.admin_id, session.role);
  if (owned === null) {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }
  if (owned === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  if (body.type === "position") {
    if (!UUID.safeParse(body.position_id).success) {
      return NextResponse.json(
        { error: "Invalid position ID." },
        { status: 400 },
      );
    }
    await supabaseServer
      .from("candidates")
      .delete()
      .eq("position_id", body.position_id)
      .eq("election_id", electionId);
    await supabaseServer
      .from("positions")
      .delete()
      .eq("id", body.position_id)
      .eq("election_id", electionId);

    await supabaseServer.from("audit_logs").insert({
      actor_type: "admin",
      actor_id: session.admin_id,
      action: "POSITION_DELETED",
      target_type: "position",
      target_id: body.position_id,
      metadata: { election_id: electionId },
      ip_hash: ipHash,
    });

    return NextResponse.json({ success: true });
  }

  if (body.type === "candidate") {
    if (!UUID.safeParse(body.candidate_id).success) {
      return NextResponse.json(
        { error: "Invalid candidate ID." },
        { status: 400 },
      );
    }
    await supabaseServer
      .from("candidates")
      .delete()
      .eq("id", body.candidate_id)
      .eq("election_id", electionId);

    await supabaseServer.from("audit_logs").insert({
      actor_type: "admin",
      actor_id: session.admin_id,
      action: "CANDIDATE_DELETED",
      target_type: "candidate",
      target_id: body.candidate_id,
      metadata: { election_id: electionId },
      ip_hash: ipHash,
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid type." }, { status: 400 });
}
