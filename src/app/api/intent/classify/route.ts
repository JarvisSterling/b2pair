import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { type IntentKey, INTENT_KEYS } from "@/lib/intent-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SYSTEM_PROMPT = `You are an intent classification engine for a B2B event matchmaking platform.

Given a participant's text (bio, messages, meeting notes), classify their intent into these categories with probability scores (0.0-1.0):

- buying: Looking to purchase products, services, or solutions
- selling: Promoting/offering products, services, or solutions
- investing: Looking to invest capital or find investment opportunities
- partnering: Seeking strategic partnerships, alliances, distribution deals
- learning: Wanting to gain knowledge, explore trends, attend workshops
- networking: Building connections, expanding professional network

Rules:
- Output ONLY valid JSON: {"buying":0.0,"selling":0.0,"investing":0.0,"partnering":0.0,"learning":0.0,"networking":0.0}
- Scores should roughly sum to 1.0
- Base your classification on explicit and implicit signals in the text
- If text is ambiguous, distribute scores more evenly
- Never output anything besides the JSON object`;

/**
 * POST /api/intent/classify
 * Use AI to classify intent from participant text (bios, messages).
 * Processes all participants in an event.
 */
export async function POST(req: NextRequest) {
  const { eventId } = await req.json();

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  const admin = getAdmin();

  // Fetch participants with profile text
  const { data: participants, error } = await admin
    .from("participants")
    .select(`
      id, intent, intents, looking_for, offering,
      profiles!inner(full_name, title, bio, company_name, industry)
    `)
    .eq("event_id", eventId)
    .eq("status", "approved");

  if (error || !participants) {
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }

  // Fetch recent messages per participant (last 30 days, max 10 per person)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: allConversations } = await admin
    .from("conversations")
    .select("id, participant_a_id, participant_b_id")
    .eq("event_id", eventId);

  // Build participant → conversation IDs map
  const participantConvoMap = new Map<string, string[]>();
  if (allConversations) {
    for (const c of allConversations) {
      for (const pid of [c.participant_a_id, c.participant_b_id]) {
        const list = participantConvoMap.get(pid) || [];
        list.push(c.id);
        participantConvoMap.set(pid, list);
      }
    }
  }

  let classified = 0;
  let skipped = 0;

  for (const participant of participants) {
    const profile = (participant as any).profiles;

    // Build text to classify
    const textParts: string[] = [];

    if (profile.bio) textParts.push(`Bio: ${profile.bio}`);
    if (profile.title) textParts.push(`Title: ${profile.title}`);
    if (profile.company_name) textParts.push(`Company: ${profile.company_name}`);
    if (profile.industry) textParts.push(`Industry: ${profile.industry}`);
    if (participant.looking_for) textParts.push(`Looking for: ${participant.looking_for}`);
    if (participant.offering) textParts.push(`Offering: ${participant.offering}`);

    // Fetch their sent messages
    const convoIds = participantConvoMap.get(participant.id) || [];
    if (convoIds.length > 0) {
      const { data: messages } = await admin
        .from("messages")
        .select("content")
        .eq("sender_id", participant.id)
        .in("conversation_id", convoIds)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(10);

      if (messages && messages.length > 0) {
        const msgText = messages.map((m: any) => m.content).join(" | ");
        textParts.push(`Recent messages: ${msgText}`);
      }
    }

    // Fetch their meeting agenda notes
    const { data: meetings } = await admin
      .from("meetings")
      .select("agenda_note")
      .eq("event_id", eventId)
      .eq("requester_id", participant.id)
      .not("agenda_note", "is", null)
      .limit(5);

    if (meetings && meetings.length > 0) {
      const notes = meetings.map((m: any) => m.agenda_note).join(" | ");
      textParts.push(`Meeting notes: ${notes}`);
    }

    const fullText = textParts.join("\n");

    // Skip if very little text
    if (fullText.length < 20) {
      skipped++;
      continue;
    }

    // Classify with OpenAI
    try {
      const response = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: fullText },
          ],
          temperature: 0.1,
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        console.error("OpenAI error:", await response.text());
        skipped++;
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        skipped++;
        continue;
      }

      // Parse the JSON response
      const parsed = JSON.parse(content) as Record<string, number>;

      // Validate it has all keys
      const aiVector: Record<string, number> = {};
      let valid = true;
      for (const key of INTENT_KEYS) {
        const val = parsed[key];
        if (typeof val !== "number" || val < 0 || val > 1) {
          valid = false;
          break;
        }
        aiVector[key] = val;
      }

      if (!valid) {
        skipped++;
        continue;
      }

      // Normalize
      const total = Object.values(aiVector).reduce((s, v) => s + v, 0);
      if (total > 0) {
        for (const key of INTENT_KEYS) {
          aiVector[key] = Math.round((aiVector[key] / total) * 1000) / 1000;
        }
      }

      // Store as AI classification in metadata
      // We store separately so the merge happens in compute
      await admin
        .from("participants")
        .update({
          ai_intent_classification: aiVector,
        })
        .eq("id", participant.id);

      classified++;
    } catch (err) {
      console.error(`Classification failed for ${participant.id}:`, err);
      skipped++;
    }
  }

  return NextResponse.json({
    success: true,
    total: participants.length,
    classified,
    skipped,
  });
}
