import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Build the text to embed for a participant.
 * Combines bio, looking_for, offering, expertise, interests into a rich text blob.
 */
function buildEmbeddingText(participant: any): string {
  const profile = participant.profiles || {};
  const parts: string[] = [];

  if (profile.title) parts.push(`Title: ${profile.title}`);
  if (profile.industry) parts.push(`Industry: ${profile.industry}`);
  if (profile.bio) parts.push(`Bio: ${profile.bio}`);
  if (participant.looking_for) parts.push(`Looking for: ${participant.looking_for}`);
  if (participant.offering) parts.push(`Offering: ${participant.offering}`);
  if (participant.expertise_areas?.length) {
    parts.push(`Expertise: ${(participant.expertise_areas as string[]).join(", ")}`);
  }
  if (participant.interests?.length) {
    parts.push(`Interests: ${(participant.interests as string[]).join(", ")}`);
  }

  return parts.join("\n");
}

/**
 * POST /api/matching/embeddings
 * Generate or refresh OpenAI embeddings for all approved participants in an event.
 * Skips participants whose embedding text hasn't changed.
 */
export async function POST(request: Request) {
  const { eventId, force = false } = await request.json();

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const admin = getAdmin();

  // Fetch all approved non-organizer participants with profiles
  const { data: participants, error: fetchError } = await admin
    .from("participants")
    .select(`
      id, looking_for, offering, expertise_areas, interests,
      profiles(title, industry, bio)
    `)
    .eq("event_id", eventId)
    .eq("status", "approved")
    .neq("role", "organizer");

  if (fetchError || !participants) {
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }

  // Fetch existing embeddings
  const { data: existing } = await admin
    .from("profile_embeddings")
    .select("participant_id, embedding_text")
    .in("participant_id", participants.map((p: any) => p.id));

  const existingMap = new Map<string, string>();
  for (const e of (existing || [])) {
    existingMap.set(e.participant_id, e.embedding_text);
  }

  // Determine which participants need (re)embedding
  const toEmbed: { id: string; text: string }[] = [];
  for (const p of participants) {
    const text = buildEmbeddingText(p);
    if (!text.trim()) continue; // skip if no content to embed
    if (!force && existingMap.get(p.id) === text) continue; // unchanged
    toEmbed.push({ id: p.id, text });
  }

  if (toEmbed.length === 0) {
    return NextResponse.json({
      success: true,
      embedded: 0,
      skipped: participants.length,
      message: "All embeddings up to date",
    });
  }

  // Call OpenAI embeddings API in batches of 20
  const MODEL = "text-embedding-3-small";
  let embedded = 0;
  let errors = 0;

  for (let i = 0; i < toEmbed.length; i += 20) {
    const batch = toEmbed.slice(i, i + 20);

    let embeddingResponse: any;
    try {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          input: batch.map((b) => b.text),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("OpenAI embeddings error:", errText);
        errors += batch.length;
        continue;
      }

      embeddingResponse = await res.json();
    } catch (err) {
      console.error("OpenAI fetch error:", err);
      errors += batch.length;
      continue;
    }

    // Upsert embeddings into profile_embeddings
    const upserts = embeddingResponse.data.map((item: any, idx: number) => ({
      participant_id: batch[idx].id,
      embedding: `[${item.embedding.join(",")}]`, // pgvector format
      embedding_text: batch[idx].text,
      model: MODEL,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await admin
      .from("profile_embeddings")
      .upsert(upserts, { onConflict: "participant_id" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      errors += batch.length;
    } else {
      embedded += batch.length;
    }
  }

  return NextResponse.json({
    success: true,
    total: participants.length,
    embedded,
    skipped: participants.length - toEmbed.length,
    errors,
  });
}
