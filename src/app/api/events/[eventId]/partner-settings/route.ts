import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isEventOrganizer } from "@/lib/sponsors-helpers";

type Params = { params: Promise<{ eventId: string }> };

/**
 * PATCH /api/events/[eventId]/partner-settings
 * Save partner settings (auto_publish, sponsors_enabled, exhibitors_enabled)
 * Organizer only.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const organizer = await isEventOrganizer(supabase, eventId, user.id);
  if (!organizer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();

  // Fetch current settings and merge
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("partner_settings")
    .eq("id", eventId)
    .single();

  const current = (event?.partner_settings as Record<string, unknown>) || {};
  const merged = { ...current, ...body };

  const { error } = await admin
    .from("events")
    .update({ partner_settings: merged })
    .eq("id", eventId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, partner_settings: merged });
}
