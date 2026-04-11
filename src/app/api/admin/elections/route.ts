import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";
import { z } from "zod";

const createElectionSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  start_time: z.string(),
  end_time: z.string(),
  results_visibility: z.enum(["hidden", "turnout_only", "public_after_close"]),
});

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: elections } = await supabaseServer
    .from("elections")
    .select("id, title, slug, status, start_time, end_time, created_at")
    .order("created_at", { ascending: false });

  return NextResponse.json(elections || []);
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createElectionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid election data." },
      { status: 400 },
    );
  }

  // Check slug is unique
  const { data: existing } = await supabaseServer
    .from("elections")
    .select("id")
    .eq("slug", parsed.data.slug)
    .single();

  if (existing) {
    return NextResponse.json(
      {
        error:
          "This URL slug is already in use. Please choose a different one.",
      },
      { status: 400 },
    );
  }

  const { data: election, error } = await supabaseServer
    .from("elections")
    .insert({
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      results_visibility: parsed.data.results_visibility,
      status: "draft",
      created_by: session.admin_id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[admin/elections POST]", error);
    return NextResponse.json(
      { error: "Failed to create election." },
      { status: 500 },
    );
  }

  // Write audit log
  await supabaseServer.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: session.admin_id,
    action: "ELECTION_CREATED",
    target_type: "election",
    target_id: election.id,
    metadata: { title: parsed.data.title, slug: parsed.data.slug },
    ip_hash: "server-side",
  });

  return NextResponse.json({ id: election.id });
}
