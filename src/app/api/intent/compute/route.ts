import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computeParticipantVector, type IntentKey } from "@/lib/intent-engine";

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
 * Incorporates explicit intents, profile signals, and behavioral data.
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
      id, intent, intents, looking_for, offering, ai_intent_classification,
      profiles!inner(title, bio, company_name)
    `)
    .eq("event_id", eventId)
    .eq("status", "approved");

  if (fetchError || !participants) {
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }

  // Check if behavioral intent is enabled
  const { data: rules } = await admin
    .from("matching_rules")
    .select("use_behavioral_intent")
    .eq("event_id", eventId)
    .single();

  const useBehavioral = rules?.use_behavioral_intent !== false; // default true

  // Load all behavioral activity for this event (last 30 days)
  let activityMap = new Map<string, any[]>();
  let targetIntentsMap = new Map<string, IntentKey[]>();

  if (useBehavioral) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activities } = await admin
      .from("participant_activity")
      .select("participant_id, action_type, target_participant_id, metadata, created_at")
      .eq("event_id", eventId)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false });

    if (activities) {
      for (const a of activities) {
        const list = activityMap.get(a.participant_id) || [];
        list.push(a);
        activityMap.set(a.participant_id, list);
      }
    }

    // Build target intents map (for inferring from who they viewed)
    for (const p of participants) {
      const intents = (p.intents as string[]) || (p.intent ? [p.intent] : []);
      if (intents.length > 0) {
        targetIntentsMap.set(p.id, intents as IntentKey[]);
      }
    }
  }

  let updated = 0;

  for (const participant of participants) {
    const activities = useBehavioral ? activityMap.get(participant.id) : undefined;
    const { vector, confidence } = computeParticipantVector(
      participant as any,
      activities,
      targetIntentsMap.size > 0 ? targetIntentsMap : undefined
    );

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
    behavioralEnabled: useBehavioral,
    activitiesProcessed: [...activityMap.values()].reduce((sum, a) => sum + a.length, 0),
  });
}
