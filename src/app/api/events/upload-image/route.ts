import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const IMAGE_CONFIGS: Record<string, { maxWidth: number; quality: number }> = {
  banner: { maxWidth: 1600, quality: 80 },
  logo: { maxWidth: 400, quality: 85 },
  content: { maxWidth: 1200, quality: 80 },
  gallery: { maxWidth: 800, quality: 75 },
};

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const eventId = formData.get("eventId") as string | null;
    const imageType = (formData.get("type") as string) || "content";

    if (!file || !eventId) {
      return NextResponse.json(
        { error: "Missing file or eventId" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max 5MB." },
        { status: 400 }
      );
    }

    // Verify user is org member for this event
    const admin = createAdminClient();
    const { data: event } = await admin
      .from("events")
      .select("id, organization_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { data: membership } = await admin
      .from("organization_members")
      .select("role")
      .eq("organization_id", event.organization_id)
      .eq("user_id", user.id)
      .in("role", ["owner", "admin", "manager"])
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Process image with Sharp
    const buffer = Buffer.from(await file.arrayBuffer());
    const config = IMAGE_CONFIGS[imageType] || IMAGE_CONFIGS.content;

    const processed = await sharp(buffer)
      .resize({ width: config.maxWidth, withoutEnlargement: true })
      .webp({ quality: config.quality })
      .toBuffer();

    // Upload to Supabase Storage
    const fileName = `${eventId}/${imageType}/${randomUUID()}.webp`;
    const { error: uploadError } = await admin.storage
      .from("event-media")
      .upload(fileName, processed, {
        contentType: "image/webp",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Upload failed" },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = admin.storage.from("event-media").getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl, fileName });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
