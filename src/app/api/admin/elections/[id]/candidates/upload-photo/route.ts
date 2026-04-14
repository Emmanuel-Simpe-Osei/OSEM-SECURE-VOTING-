import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";
import { z } from "zod";

const UUID = z.uuid();

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function validateMagicBytes(buffer: Uint8Array, contentType: string): boolean {
  if (contentType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (contentType === "image/png") {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (contentType === "image/webp") {
    return buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  }
  return false;
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

  const contentType = request.headers.get("content-type") ?? "";
  const ext = ALLOWED_TYPES[contentType];
  if (!ext) {
    return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed." }, { status: 400 });
  }

  const arrayBuffer = await request.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  if (buffer.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
  }

  if (!validateMagicBytes(buffer, contentType)) {
    return NextResponse.json({ error: "Invalid image file." }, { status: 400 });
  }

  const fileName = `${electionId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabaseServer.storage
    .from("candidate-photos")
    .upload(fileName, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: "Failed to upload photo." }, { status: 500 });
  }

  const { data: urlData } = supabaseServer.storage
    .from("candidate-photos")
    .getPublicUrl(fileName);

  return NextResponse.json({ url: urlData.publicUrl });
}
