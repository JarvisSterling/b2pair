import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/meetings
 * Create a new meeting request.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { eventId, recipientParticipantId, startTime, endTime, agendaNote, meetingType } = body;

  if (!eventId || !recipientParticipantId) {
    return NextResponse.json({ error: "eventId and recipientParticipantId required" }, { status: 400 });
  }

  // Get requester's participant record
  const { data: requester } = await supabase
    .from("participants")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  if (!requester) {
    return NextResponse.json({ error: "You are not a participant in this event" }, { status: 403 });
  }

  // Get event settings for duration
  const { data: event } = await supabase
    .from("events")
    .select("meeting_duration_minutes")
    .eq("id", eventId)
    .single();

  const duration = event?.meeting_duration_minutes || 30;

  // Create meeting
  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      event_id: eventId,
      requester_id: requester.id,
      recipient_id: recipientParticipantId,
      status: "pending",
      start_time: startTime || null,
      end_time: endTime || null,
      duration_minutes: duration,
      meeting_type: meetingType || "in-person",
      agenda_note: agendaNote || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create notification for recipient
  const { data: recipientParticipant } = await supabase
    .from("participants")
    .select("user_id")
    .eq("id", recipientParticipantId)
    .single();

  if (recipientParticipant) {
    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    await supabase.from("notifications").insert({
      user_id: recipientParticipant.user_id,
      event_id: eventId,
      type: "meeting_request",
      title: "New meeting request",
      body: `${requesterProfile?.full_name || "Someone"} wants to meet with you`,
      link: `/dashboard/meetings`,
    });
  }

  return NextResponse.json({ success: true, meetingId: meeting.id });
}

/**
 * PATCH /api/meetings
 * Update meeting status (accept, decline, cancel).
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { meetingId, status, declineReason, rating, feedback } = body;

  if (!meetingId) {
    return NextResponse.json({ error: "meetingId required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (status) updates.status = status;
  if (declineReason) updates.decline_reason = declineReason;

  // Handle ratings
  if (rating !== undefined) {
    // Determine if user is requester or recipient
    const { data: meeting } = await supabase
      .from("meetings")
      .select("requester_id, recipient_id")
      .eq("id", meetingId)
      .single();

    if (meeting) {
      const { data: myParticipants } = await supabase
        .from("participants")
        .select("id")
        .eq("user_id", user.id);

      const myIds = (myParticipants || []).map((p) => p.id);

      if (myIds.includes(meeting.requester_id)) {
        updates.requester_rating = rating;
        if (feedback) updates.requester_feedback = feedback;
      } else if (myIds.includes(meeting.recipient_id)) {
        updates.recipient_rating = rating;
        if (feedback) updates.recipient_feedback = feedback;
      }
    }
  }

  const { error } = await supabase
    .from("meetings")
    .update(updates)
    .eq("id", meetingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
