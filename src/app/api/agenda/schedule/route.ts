import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/agenda/schedule?eventId=xxx
 * Get participant's saved sessions
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  if (!participant) return NextResponse.json({ sessionIds: [] });

  const { data } = await supabase
    .from("attendee_schedule")
    .select("session_id")
    .eq("participant_id", participant.id);

  return NextResponse.json({
    sessionIds: (data || []).map((d) => d.session_id),
  });
}

/**
 * POST /api/agenda/schedule
 * Toggle a session in participant's schedule
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId, sessionId } = await request.json();
  if (!eventId || !sessionId) {
    return NextResponse.json({ error: "eventId and sessionId required" }, { status: 400 });
  }

  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Check if already saved
  const { data: existing } = await supabase
    .from("attendee_schedule")
    .select("id")
    .eq("participant_id", participant.id)
    .eq("session_id", sessionId)
    .single();

  if (existing) {
    // Remove
    await supabase.from("attendee_schedule").delete().eq("id", existing.id);
    return NextResponse.json({ saved: false });
  } else {
    // Add
    await supabase.from("attendee_schedule").insert({
      participant_id: participant.id,
      session_id: sessionId,
    });
    return NextResponse.json({ saved: true });
  }
}
