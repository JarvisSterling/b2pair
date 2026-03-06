import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";

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

  // Notify the recipient about the new meeting request
  try {
    const [{ data: recipientParticipant }, { data: myProfile }] = await Promise.all([
      supabase.from("participants").select("user_id").eq("id", recipientParticipantId).single(),
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    ]);
    if (recipientParticipant) {
      await createNotification(supabase, {
        userId: recipientParticipant.user_id,
        eventId,
        type: "meeting_request",
        title: "New meeting request",
        body: `${myProfile?.full_name || "Someone"} wants to meet with you`,
        link: `/dashboard/events/${eventId}/meetings`,
      });
    }
  } catch {
    // Don't fail the main request if notification fails
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
  const { meetingId, status, declineReason, rating, feedback, reschedule } = body;

  if (!meetingId) {
    return NextResponse.json({ error: "meetingId required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (status) updates.status = status;
  if (declineReason) updates.decline_reason = declineReason;

  // Handle reschedule: update time/type and reset to pending so the other party re-confirms
  if (reschedule) {
    const { data: mtg } = await supabase
      .from("meetings")
      .select("requester_id, recipient_id, event_id, status")
      .eq("id", meetingId)
      .single();

    if (!mtg) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

    const { data: myParticipants } = await supabase
      .from("participants")
      .select("id")
      .eq("user_id", user.id);
    const myIds = new Set((myParticipants || []).map((p: any) => p.id));

    if (!myIds.has(mtg.requester_id) && !myIds.has(mtg.recipient_id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    updates.start_time = reschedule.startTime ?? null;
    if (reschedule.meetingType) updates.meeting_type = reschedule.meetingType;
    // Reset to pending so the other party must re-accept
    updates.status = "pending";

    // Notify the other party
    const myPid = myIds.has(mtg.requester_id) ? mtg.requester_id : mtg.recipient_id;
    const otherPid = myPid === mtg.requester_id ? mtg.recipient_id : mtg.requester_id;
    const { data: otherParticipant } = await supabase
      .from("participants")
      .select("user_id")
      .eq("id", otherPid)
      .single();
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    if (otherParticipant) {
      await createNotification(supabase, {
        userId: otherParticipant.user_id,
        eventId: mtg.event_id,
        type: "meeting_rescheduled",
        title: "Meeting rescheduled",
        body: `${myProfile?.full_name || "Someone"} proposed a new time — tap to confirm`,
        link: `/dashboard/events/${mtg.event_id}/meetings`,
      });
    }
  }

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

  // ── Status change notifications + outcome feedback loop ──
  if (status || rating !== undefined) {
    try {
      const { data: meetingData } = await supabase
        .from("meetings")
        .select("event_id, requester_id, recipient_id, status, requester_rating, recipient_rating")
        .eq("id", meetingId)
        .single();

      if (meetingData) {
        const { data: myParticipants } = await supabase
          .from("participants")
          .select("id")
          .eq("user_id", user.id);
        const myIds = new Set((myParticipants || []).map((p) => p.id));
        const amRequester = myIds.has(meetingData.requester_id);
        const myPid = amRequester ? meetingData.requester_id : meetingData.recipient_id;
        const otherPid = amRequester ? meetingData.recipient_id : meetingData.requester_id;

        // ── Fire notifications for accepted / declined / cancelled ──
        const notifyStatuses = ["accepted", "declined", "cancelled"];
        if (status && notifyStatuses.includes(status) && !reschedule) {
          const [{ data: otherParticipant }, { data: myProfile }] = await Promise.all([
            supabase.from("participants").select("user_id").eq("id", otherPid).single(),
            supabase.from("profiles").select("full_name").eq("id", user.id).single(),
          ]);

          const myName = myProfile?.full_name || "Someone";
          const link = `/dashboard/events/${meetingData.event_id}/meetings`;

          if (otherParticipant) {
            if (status === "accepted") {
              await createNotification(supabase, {
                userId: otherParticipant.user_id,
                eventId: meetingData.event_id,
                type: "meeting_accepted",
                title: "Meeting request accepted",
                body: `${myName} accepted your meeting request`,
                link,
              });
            } else if (status === "declined") {
              await createNotification(supabase, {
                userId: otherParticipant.user_id,
                eventId: meetingData.event_id,
                type: "meeting_declined",
                title: "Meeting request declined",
                body: `${myName} couldn't make it work this time`,
                link,
              });
            } else if (status === "cancelled") {
              await createNotification(supabase, {
                userId: otherParticipant.user_id,
                eventId: meetingData.event_id,
                type: "meeting_cancelled",
                title: "Meeting cancelled",
                body: `${myName} cancelled the meeting`,
                link,
              });
            }
          }
        }

        // ── Outcome feedback loop for intent engine ──
        if (status === "accepted") {
          await supabase.from("participant_activity").insert({
            participant_id: myPid,
            event_id: meetingData.event_id,
            action_type: "meeting_accepted",
            target_participant_id: otherPid,
            metadata: {},
          });
        }

        if (rating !== undefined && rating >= 4) {
          await supabase.from("participant_activity").insert({
            participant_id: myPid,
            event_id: meetingData.event_id,
            action_type: "meeting_rated",
            target_participant_id: otherPid,
            metadata: { rating, positive: true },
          });
        }
      }
    } catch {
      // Don't fail the request if tracking/notification fails
    }
  }

  return NextResponse.json({ success: true });
}
