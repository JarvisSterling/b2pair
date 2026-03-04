import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/messages/send
 * Send a message in a conversation and notify the other participant.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId, content, senderId } = await request.json();
  if (!conversationId || !content?.trim() || !senderId) {
    return NextResponse.json({ error: "conversationId, content, and senderId required" }, { status: 400 });
  }

  // Insert the message
  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
      content_type: "text",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update conversation timestamp
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  // Find the other participant to notify
  const { data: conversation } = await admin
    .from("conversations")
    .select("participant_a_id, participant_b_id, event_id")
    .eq("id", conversationId)
    .single();

  if (conversation) {
    const otherParticipantId =
      conversation.participant_a_id === senderId
        ? conversation.participant_b_id
        : conversation.participant_a_id;

    const { data: otherParticipant } = await admin
      .from("participants")
      .select("user_id")
      .eq("id", otherParticipantId)
      .single();

    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (otherParticipant) {
      const eventId = conversation.event_id;
      await createNotification(supabase, {
        userId: otherParticipant.user_id,
        eventId,
        type: "new_message",
        title: `New message from ${senderProfile?.full_name || "Someone"}`,
        body: content.trim().slice(0, 80),
        link: eventId
          ? `/dashboard/events/${eventId}/messages`
          : `/dashboard/messages`,
      });
    }
  }

  return NextResponse.json({ success: true, messageId: message.id });
}
