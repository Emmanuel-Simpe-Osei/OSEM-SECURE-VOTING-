import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

// Magic bytes for allowed image types
const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF....WEBP
};

function detectMimeType(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  for (const [mimeType, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const sig of signatures) {
      if (sig.every((byte, i) => bytes[i] === byte)) {
        // Extra check for WebP: bytes 8-11 must be "WEBP"
        if (mimeType === "image/webp") {
          const webpMarker = [0x57, 0x45, 0x42, 0x50];
          if (webpMarker.every((byte, i) => bytes[8 + i] === byte)) {
            return mimeType;
          }
          continue;
        }
        return mimeType;
      }
    }
  }
  return null;
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

  const buffer = await request.arrayBuffer();

  if (buffer.byteLength > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 2MB." },
      { status: 400 },
    );
  }

  if (buffer.byteLength < 12) {
    return NextResponse.json({ error: "Invalid file." }, { status: 400 });
  }

  // Detect actual file type from magic bytes — ignore client header
  const detectedMimeType = detectMimeType(buffer);
  if (!detectedMimeType) {
    return NextResponse.json(
      { error: "Invalid file type. Only JPG, PNG and WebP allowed." },
      { status: 400 },
    );
  }

  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const ext = extMap[detectedMimeType];
  const fileName = `${electionId}/${Date.now()}.${ext}`;

  const { data, error } = await supabaseServer.storage
    .from("candidate-photos")
    .upload(fileName, buffer, {
      contentType: detectedMimeType,
      upsert: false,
    });

  if (error) {
    return NextResponse.json(
      { error: "Failed to upload photo." },
      { status: 500 },
    );
  }

  const { data: urlData } = supabaseServer.storage
    .from("candidate-photos")
    .getPublicUrl(data.path);

  return NextResponse.json({ url: urlData.publicUrl });
}
