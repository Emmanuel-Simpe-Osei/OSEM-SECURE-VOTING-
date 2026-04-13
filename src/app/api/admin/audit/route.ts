import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

function escapeLike(str: string): string {
  return str.replace(/[%_\\]/g, "\\$&");
}

function safeInt(
  value: string | null,
  defaultVal: number,
  max?: number,
): number {
  const parsed = parseInt(value ?? String(defaultVal));
  if (isNaN(parsed) || parsed < 0) return defaultVal;
  if (max !== undefined) return Math.min(parsed, max);
  return parsed;
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = safeInt(searchParams.get("limit"), 50, 100);
  const offset = safeInt(searchParams.get("offset"), 0, 10000); // max 10k offset
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
    const safeQ = escapeLike(q.slice(0, 100));
    query = query.or(
      `actor_id.ilike.%${safeQ}%,action.ilike.%${safeQ}%,target_id.ilike.%${safeQ}%`,
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
