import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/events/[eventId]/slots?recipientId=participantId
 *
 * Returns:
 *  - recipientSlots: availability slots for the recipient participant
 *  - mySlots:        availability slots for the requesting user
 *  - durationMinutes: meeting duration configured for the event
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recipientId = req.nextUrl.searchParams.get("recipientId");
  if (!recipientId) return NextResponse.json({ error: "recipientId required" }, { status: 400 });

  // Get requester's participant record
  const { data: myParticipant } = await supabase
    .from("participants")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  if (!myParticipant) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

  // Get event meeting duration
  const { data: event } = await supabase
    .from("events")
    .select("meeting_duration_minutes, start_date, end_date")
    .eq("id", eventId)
    .single();

  const durationMinutes = event?.meeting_duration_minutes || 30;

  // Fetch both slot sets in parallel
  const [recipientRes, myRes] = await Promise.all([
    admin
      .from("availability_slots")
      .select("id, date, start_time, end_time")
      .eq("participant_id", recipientId)
      .eq("event_id", eventId)
      .eq("is_available", true)
      .order("date")
      .order("start_time"),
    admin
      .from("availability_slots")
      .select("id, date, start_time, end_time")
      .eq("participant_id", myParticipant.id)
      .eq("event_id", eventId)
      .eq("is_available", true)
      .order("date")
      .order("start_time"),
  ]);

  return NextResponse.json({
    recipientSlots: recipientRes.data || [],
    mySlots: myRes.data || [],
    durationMinutes,
  });
}
