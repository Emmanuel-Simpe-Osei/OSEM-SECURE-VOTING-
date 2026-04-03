import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";
import { z } from "zod";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: electionId } = await params;
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
      console.error("[candidates POST position]", error);
      return NextResponse.json(
        { error: "Failed to add position." },
        { status: 500 },
      );
    }
    return NextResponse.json(data);
  }

  if (body.type === "candidate") {
    const schema = z.object({
      position_id: z.string(),
      full_name: z.string().min(1).max(200),
      bio: z.string().nullable().optional(),
      photo_url: z.string().nullable().optional(),
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
      console.error("[candidates POST candidate]", error);
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

  const body = await request.json();

  if (body.type === "position_order") {
    const { error } = await supabaseServer
      .from("positions")
      .update({ sort_order: body.sort_order })
      .eq("id", body.position_id);
    if (error) {
      return NextResponse.json(
        { error: "Failed to update order." },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true });
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

  const body = await request.json();

  if (body.type === "position") {
    await supabaseServer
      .from("candidates")
      .delete()
      .eq("position_id", body.position_id);
    await supabaseServer.from("positions").delete().eq("id", body.position_id);
    return NextResponse.json({ success: true });
  }

  if (body.type === "candidate") {
    await supabaseServer
      .from("candidates")
      .delete()
      .eq("id", body.candidate_id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid type." }, { status: 400 });
}
