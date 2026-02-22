import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { v4 as uuid } from "crypto";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const conversationId = formData.get("conversationId") as string;
  const senderId = formData.get("senderId") as string;

  if (!file || !conversationId || !senderId) {
    return NextResponse.json({ error: "file, conversationId, and senderId required" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  // Upload to storage
  const fileExt = file.name.split(".").pop() || "bin";
  const filePath = `${conversationId}/${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("chat-files")
    .upload(filePath, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get signed URL (valid for 7 days)
  const { data: urlData } = await supabase.storage
    .from("chat-files")
    .createSignedUrl(filePath, 7 * 24 * 60 * 60);

  const fileUrl = urlData?.signedUrl || "";

  // Create message with file attachment
  const isImage = file.type.startsWith("image/");
  const { data: message, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: isImage ? `📷 ${file.name}` : `📎 ${file.name}`,
      content_type: isImage ? "image" : "file",
      file_url: fileUrl,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
    })
    .select()
    .single();

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  return NextResponse.json({ message });
}
