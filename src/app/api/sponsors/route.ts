import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/sponsors?eventId=xxx
 * Fetch all sponsor data for an event
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const supabase = await createClient();

  const [
    { data: tiers },
    { data: sponsors },
    { data: booths },
  ] = await Promise.all([
    supabase.from("sponsor_tiers").select("*").eq("event_id", eventId).order("sort_order"),
    supabase.from("sponsors").select("*").eq("event_id", eventId).order("sort_order"),
    supabase.from("exhibitor_booths").select(`
      *,
      booth_products(id, name, description, image_url, price, category, sort_order),
      booth_documents(id, name, file_url, file_type, file_size, download_count, sort_order)
    `).eq("event_id", eventId).order("created_at"),
  ]);

  return NextResponse.json({ tiers, sponsors, booths });
}

/**
 * POST /api/sponsors
 * Create a tier, sponsor, booth, product, or document
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, ...data } = body;

  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

  let result;
  switch (type) {
    case "tier":
      result = await supabase.from("sponsor_tiers").insert(data).select().single();
      break;
    case "sponsor":
      result = await supabase.from("sponsors").insert(data).select().single();
      break;
    case "booth":
      result = await supabase.from("exhibitor_booths").insert(data).select().single();
      break;
    case "product":
      result = await supabase.from("booth_products").insert(data).select().single();
      break;
    case "document":
      result = await supabase.from("booth_documents").insert(data).select().single();
      break;
    case "lead": {
      const { data: participant } = await supabase
        .from("participants")
        .select("id")
        .eq("event_id", data.event_id)
        .eq("user_id", user.id)
        .single();
      result = await supabase.from("leads").insert({
        ...data,
        captured_by: participant?.id || null,
      }).select().single();
      break;
    }
    case "lead_note":
      result = await supabase.from("lead_notes").insert(data).select().single();
      break;
    case "visit": {
      const { data: participant } = await supabase
        .from("participants")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      result = await supabase.from("booth_visits").insert({
        booth_id: data.booth_id,
        visitor_participant_id: participant?.id || null,
      }).select().single();
      break;
    }
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ success: true, data: result.data });
}

/**
 * PATCH /api/sponsors
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, id, ...updates } = body;

  if (!type || !id) return NextResponse.json({ error: "type and id required" }, { status: 400 });

  const table: Record<string, string> = {
    tier: "sponsor_tiers",
    sponsor: "sponsors",
    booth: "exhibitor_booths",
    product: "booth_products",
    document: "booth_documents",
    lead: "leads",
  };

  if (!table[type]) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  delete updates.event_id;
  const { error } = await supabase.from(table[type]).update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/sponsors
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!type || !id) return NextResponse.json({ error: "type and id required" }, { status: 400 });

  const table: Record<string, string> = {
    tier: "sponsor_tiers",
    sponsor: "sponsors",
    booth: "exhibitor_booths",
    product: "booth_products",
    document: "booth_documents",
    lead: "leads",
    lead_note: "lead_notes",
  };

  if (!table[type]) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const { error } = await supabase.from(table[type]).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
