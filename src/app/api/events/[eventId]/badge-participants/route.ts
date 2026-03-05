import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/events/[eventId]/badge-participants
 * Returns all approved participants with profile + QR token for badge generation.
 * Organizer-only.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Verify event exists
  const { data: event } = await admin
    .from("events")
    .select("id, name, created_by, organization_id")
    .eq("id", eventId)
    .single();

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Optional: filter to a single participant (for print-single-badge)
  const singleParticipantId = req.nextUrl.searchParams.get("participantId");

  // Get approved participants with profile
  let query = admin
    .from("participants")
    .select(`
      id, user_id, status,
      profiles(full_name, email, company_name, title, avatar_url)
    `)
    .eq("event_id", eventId)
    .eq("status", "approved");

  if (singleParticipantId) {
    query = query.eq("id", singleParticipantId);
  }

  const { data: participants, error: partError } = await query;

  if (partError) return NextResponse.json({ error: partError.message, participants: [] });
  if (!participants) return NextResponse.json({ participants: [] });

  // Get QR tokens for these participants
  const participantIds = participants.map((p: any) => p.id);
  const { data: qrTokens } = await admin
    .from("qr_tokens")
    .select("participant_id, token")
    .eq("event_id", eventId)
    .in("participant_id", participantIds);

  const tokenMap: Record<string, string> = {};
  (qrTokens || []).forEach((t: any) => { tokenMap[t.participant_id] = t.token; });

  const result = participants.map((p: any) => ({
    id: p.id,
    full_name: (p.profiles as any)?.full_name || "Attendee",
    company_name: (p.profiles as any)?.company_name || "",
    title: (p.profiles as any)?.title || "",
    email: (p.profiles as any)?.email || "",
    role: "Attendee",
    qr_token: tokenMap[p.id] || p.id,
  }));

  return NextResponse.json({ participants: result });
}
