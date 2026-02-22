import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/meetings/auto-schedule
 * Automatically schedule meetings for accepted matches based on availability overlap.
 * Called by organizers to bulk-schedule an event.
 */
export async function POST(request: Request) {
  const { eventId } = await request.json();

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify organizer
  const { data: event } = await supabase
    .from("events")
    .select("organizer_id, meeting_duration_minutes, break_between_meetings")
    .eq("id", eventId)
    .single();

  if (!event || event.organizer_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const duration = event.meeting_duration_minutes || 30;
  const breakTime = event.break_between_meetings || 5;
  const slotLength = duration + breakTime;

  // Get accepted matches without scheduled meetings
  const { data: matches } = await supabase
    .from("matches")
    .select("id, participant_a_id, participant_b_id, score")
    .eq("event_id", eventId)
    .eq("status", "accepted")
    .order("score", { ascending: false });

  if (!matches?.length) {
    return NextResponse.json({ scheduled: 0, message: "No accepted matches to schedule" });
  }

  // Check which matches already have meetings
  const matchPairs = matches.map((m) => `${m.participant_a_id}-${m.participant_b_id}`);
  const { data: existingMeetings } = await supabase
    .from("meetings")
    .select("requester_id, recipient_id")
    .eq("event_id", eventId)
    .in("status", ["pending", "accepted"]);

  const existingPairs = new Set(
    (existingMeetings || []).map((m) => {
      const ids = [m.requester_id, m.recipient_id].sort();
      return `${ids[0]}-${ids[1]}`;
    })
  );

  const unscheduled = matches.filter((m) => {
    const ids = [m.participant_a_id, m.participant_b_id].sort();
    return !existingPairs.has(`${ids[0]}-${ids[1]}`);
  });

  if (!unscheduled.length) {
    return NextResponse.json({ scheduled: 0, message: "All matches already have meetings" });
  }

  // Get all availability slots for this event
  const { data: allSlots } = await supabase
    .from("availability_slots")
    .select("participant_id, date, start_time, end_time")
    .eq("event_id", eventId)
    .eq("is_available", true)
    .order("date")
    .order("start_time");

  if (!allSlots?.length) {
    return NextResponse.json({ scheduled: 0, message: "No availability slots found" });
  }

  // Build availability map: participant_id -> [{date, start, end}]
  const availMap = new Map<string, { date: string; start: number; end: number }[]>();
  for (const slot of allSlots) {
    const list = availMap.get(slot.participant_id) || [];
    list.push({
      date: slot.date,
      start: timeToMinutes(slot.start_time),
      end: timeToMinutes(slot.end_time),
    });
    availMap.set(slot.participant_id, list);
  }

  // Track booked slots per participant: participant_id -> [{date, start, end}]
  const booked = new Map<string, { date: string; start: number; end: number }[]>();

  function isBooked(pid: string, date: string, start: number, end: number): boolean {
    const slots = booked.get(pid) || [];
    return slots.some((s) => s.date === date && start < s.end && end > s.start);
  }

  function book(pid: string, date: string, start: number, end: number) {
    const slots = booked.get(pid) || [];
    slots.push({ date, start, end });
    booked.set(pid, slots);
  }

  // Schedule meetings greedily (highest score first)
  const scheduled: {
    event_id: string;
    requester_id: string;
    recipient_id: string;
    start_time: string;
    duration_minutes: number;
    meeting_type: string;
    status: string;
  }[] = [];

  for (const match of unscheduled) {
    const aSlots = availMap.get(match.participant_a_id) || [];
    const bSlots = availMap.get(match.participant_b_id) || [];

    let found = false;

    // Find overlapping availability
    for (const aSlot of aSlots) {
      if (found) break;
      for (const bSlot of bSlots) {
        if (found) break;
        if (aSlot.date !== bSlot.date) continue;

        const overlapStart = Math.max(aSlot.start, bSlot.start);
        const overlapEnd = Math.min(aSlot.end, bSlot.end);

        // Try to fit meeting slots within overlap
        let cursor = overlapStart;
        while (cursor + duration <= overlapEnd) {
          const meetEnd = cursor + duration;

          if (
            !isBooked(match.participant_a_id, aSlot.date, cursor, meetEnd + breakTime) &&
            !isBooked(match.participant_b_id, aSlot.date, cursor, meetEnd + breakTime)
          ) {
            // Found a slot
            const startTime = new Date(`${aSlot.date}T${minutesToTime(cursor)}:00`);

            scheduled.push({
              event_id: eventId,
              requester_id: match.participant_a_id,
              recipient_id: match.participant_b_id,
              start_time: startTime.toISOString(),
              duration_minutes: duration,
              meeting_type: "scheduled",
              status: "accepted",
            });

            book(match.participant_a_id, aSlot.date, cursor, meetEnd + breakTime);
            book(match.participant_b_id, aSlot.date, cursor, meetEnd + breakTime);
            found = true;
            break;
          }

          cursor += slotLength;
        }
      }
    }
  }

  // Batch insert
  if (scheduled.length > 0) {
    const { error } = await supabase.from("meetings").insert(scheduled);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    scheduled: scheduled.length,
    unmatched: unscheduled.length - scheduled.length,
    message: `Scheduled ${scheduled.length} meetings, ${unscheduled.length - scheduled.length} could not be scheduled due to availability conflicts.`,
  });
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
