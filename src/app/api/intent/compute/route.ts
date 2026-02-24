import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computeParticipantVector } from "@/lib/intent-engine";

export const dynamic = "force-dynamic";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/intent/compute
 * Compute intent vectors for all participants in an event.
 * Called by organizers or automatically after match generation.
 */
export async function POST(req: NextRequest) {
  const { eventId } = await req.json();

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  const admin = getAdmin();

  // Fetch all approved participants with profiles
  const { data: participants, error: fetchError } = await admin
    .from("participants")
    .select(`
      id, intent, intents, looking_for, offering,
      profiles!inner(title, bio, company_name)
    `)
    .eq("event_id", eventId)
    .eq("status", "approved");

  if (fetchError || !participants) {
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }

  let updated = 0;

  for (const participant of participants) {
    const { vector, confidence } = computeParticipantVector(participant as any);

    const { error } = await admin
      .from("participants")
      .update({
        intent_vector: vector,
        intent_confidence: confidence,
      })
      .eq("id", participant.id);

    if (!error) updated++;
  }

  return NextResponse.json({
    success: true,
    total: participants.length,
    updated,
  });
}
