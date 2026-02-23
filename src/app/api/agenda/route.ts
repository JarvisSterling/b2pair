import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/agenda?eventId=xxx
 * Fetch full agenda: tracks, sessions with speakers, rooms
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const supabase = await createClient();

  const [
    { data: tracks },
    { data: sessions },
    { data: speakers },
    { data: rooms },
  ] = await Promise.all([
    supabase.from("agenda_tracks").select("*").eq("event_id", eventId).order("sort_order"),
    supabase
      .from("agenda_sessions")
      .select(`
        *,
        session_speakers(
          id, role, sort_order,
          speaker:speakers(id, full_name, title, company, avatar_url)
        )
      `)
      .eq("event_id", eventId)
      .order("start_time"),
    supabase.from("speakers").select("*").eq("event_id", eventId).order("sort_order"),
    supabase.from("rooms").select("*").eq("event_id", eventId).order("sort_order"),
  ]);

  return NextResponse.json({ tracks, sessions, speakers, rooms });
}

/**
 * POST /api/agenda
 * Create a track, session, speaker, or room
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, ...data } = body;

  if (!type || !data.event_id) {
    return NextResponse.json({ error: "type and event_id required" }, { status: 400 });
  }

  let result;

  switch (type) {
    case "track":
      result = await supabase.from("agenda_tracks").insert(data).select().single();
      break;
    case "session": {
      const { speaker_ids, ...sessionData } = data;
      const { data: session, error } = await supabase
        .from("agenda_sessions")
        .insert(sessionData)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Link speakers
      if (speaker_ids?.length && session) {
        await supabase.from("session_speakers").insert(
          speaker_ids.map((speakerId: string, i: number) => ({
            session_id: session.id,
            speaker_id: speakerId,
            sort_order: i,
          }))
        );
      }

      result = { data: session, error: null };
      break;
    }
    case "speaker":
      result = await supabase.from("speakers").insert(data).select().single();
      break;
    case "room":
      result = await supabase.from("rooms").insert(data).select().single();
      break;
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ success: true, data: result.data });
}

/**
 * PATCH /api/agenda
 * Update a track, session, speaker, or room
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, id, speaker_ids, ...updates } = body;

  if (!type || !id) {
    return NextResponse.json({ error: "type and id required" }, { status: 400 });
  }

  const table = {
    track: "agenda_tracks",
    session: "agenda_sessions",
    speaker: "speakers",
    room: "rooms",
  }[type as string];

  if (!table) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  // Remove event_id from updates (shouldn't be changed)
  delete updates.event_id;

  const { error } = await supabase.from(table).update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update speaker links if provided
  if (type === "session" && speaker_ids !== undefined) {
    await supabase.from("session_speakers").delete().eq("session_id", id);
    if (speaker_ids.length) {
      await supabase.from("session_speakers").insert(
        speaker_ids.map((speakerId: string, i: number) => ({
          session_id: id,
          speaker_id: speakerId,
          sort_order: i,
        }))
      );
    }
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/agenda
 * Delete a track, session, speaker, or room
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!type || !id) {
    return NextResponse.json({ error: "type and id required" }, { status: 400 });
  }

  const table = {
    track: "agenda_tracks",
    session: "agenda_sessions",
    speaker: "speakers",
    room: "rooms",
  }[type];

  if (!table) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
