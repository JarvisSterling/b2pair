import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isEventOrganizer } from "@/lib/sponsors-helpers";

type Params = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/sponsor-tiers
 * List tiers (public for live events, all for organizers)
 */
export async function GET(request: Request, { params }: Params) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sponsor_tiers")
    .select("*")
    .eq("event_id", eventId)
    .order("rank", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tiers: data });
}

/**
 * POST /api/events/[eventId]/sponsor-tiers
 * Create a new tier (organizer only)
 */
export async function POST(request: Request, { params }: Params) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isOrganizer = await isEventOrganizer(supabase, eventId, user.id);
  if (!isOrganizer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, rank, color, perks, seat_limit } = body;

  if (!name || rank == null) {
    return NextResponse.json({ error: "name and rank required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sponsor_tiers")
    .insert({
      event_id: eventId,
      name,
      rank,
      color: color || "#6366f1",
      perks: perks || {},
      seat_limit: seat_limit || 5,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tier: data }, { status: 201 });
}

/**
 * PATCH /api/events/[eventId]/sponsor-tiers
 * Update a tier or reorder tiers
 * Body: { id, ...updates } OR { reorder: [{ id, rank }] }
 */
export async function PATCH(request: Request, { params }: Params) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isOrganizer = await isEventOrganizer(supabase, eventId, user.id);
  if (!isOrganizer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();

  // Reorder mode
  if (body.reorder) {
    for (const item of body.reorder) {
      await supabase
        .from("sponsor_tiers")
        .update({ rank: item.rank })
        .eq("id", item.id)
        .eq("event_id", eventId);
    }
    return NextResponse.json({ success: true });
  }

  // Single update
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  delete updates.event_id;
  delete updates.created_at;

  const { error } = await supabase
    .from("sponsor_tiers")
    .update(updates)
    .eq("id", id)
    .eq("event_id", eventId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/events/[eventId]/sponsor-tiers
 * Delete a tier. Body: { id }
 */
export async function DELETE(request: Request, { params }: Params) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isOrganizer = await isEventOrganizer(supabase, eventId, user.id);
  if (!isOrganizer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("sponsor_tiers")
    .delete()
    .eq("id", id)
    .eq("event_id", eventId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
