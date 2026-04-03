import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/db/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session?.admin_id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: electionId } = await params;

  const contentType = request.headers.get("content-type") || "image/jpeg";
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(contentType)) {
    return NextResponse.json(
      { error: "Invalid file type. Only JPG, PNG and WebP allowed." },
      { status: 400 },
    );
  }

  const buffer = await request.arrayBuffer();

  if (buffer.byteLength > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 2MB." },
      { status: 400 },
    );
  }

  const ext = contentType.split("/")[1];
  const fileName = `${electionId}/${Date.now()}.${ext}`;

  const { data, error } = await supabaseServer.storage
    .from("candidate-photos")
    .upload(fileName, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error("[upload-photo]", error);
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
