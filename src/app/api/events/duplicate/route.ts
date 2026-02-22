import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { eventId } = await request.json();

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch original event
  const { data: original, error: fetchError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (fetchError || !original) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Verify ownership
  if (original.organizer_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Create duplicate with adjusted dates (shift by the same duration into the future)
  const originalStart = new Date(original.start_date);
  const originalEnd = new Date(original.end_date);
  const duration = originalEnd.getTime() - originalStart.getTime();
  const now = new Date();
  const newStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
  const newEnd = new Date(newStart.getTime() + duration);

  const {
    id: _id,
    created_at: _created,
    updated_at: _updated,
    ...eventData
  } = original;

  const { data: newEvent, error: createError } = await supabase
    .from("events")
    .insert({
      ...eventData,
      name: `${original.name} (Copy)`,
      status: "draft",
      start_date: newStart.toISOString(),
      end_date: newEnd.toISOString(),
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Duplicate matching rules if they exist
  const { data: rules } = await supabase
    .from("matching_rules")
    .select("*")
    .eq("event_id", eventId)
    .single();

  if (rules) {
    const { id: _rId, created_at: _rC, updated_at: _rU, event_id: _eId, ...rulesData } = rules;
    await supabase.from("matching_rules").insert({
      ...rulesData,
      event_id: newEvent.id,
    });
  }

  return NextResponse.json({ event: newEvent });
}
