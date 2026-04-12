import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const action = searchParams.get("action") ?? "";
  const q = searchParams.get("q") ?? "";

  let query = supabaseServer
    .from("audit_logs")
    .select(
      "id, actor_type, actor_id, action, target_type, target_id, metadata, ip_hash, created_at",
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) {
    query = query.eq("action", action);
  }

  if (q) {
    query = query.or(
      `actor_id.ilike.%${q}%,action.ilike.%${q}%,target_id.ilike.%${q}%`,
    );
  }

  const { data: logs, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to load logs." },
      { status: 500 },
    );
  }

  return NextResponse.json({ logs: logs ?? [] });
}
