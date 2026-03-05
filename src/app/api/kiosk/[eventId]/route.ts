import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/kiosk/[eventId]
 * Public — returns minimal event info for the kiosk UI (no auth required).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("events")
    .select("name, status")
    .eq("id", eventId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ eventName: data.name, status: data.status });
}
