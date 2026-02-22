import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPENAI_URL = "https://api.openai.com/v1/embeddings";
const MODEL = "text-embedding-3-small";
const BATCH_SIZE = 100; // OpenAI supports up to 2048 inputs per request

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Build a rich text representation of a participant's profile
 * for embedding generation. The more context, the better the matches.
 */
function buildEmbeddingText(participant: any): string {
  const p = participant.profiles || {};
  const parts: string[] = [];

  if (p.full_name) parts.push(`Name: ${p.full_name}`);
  if (p.title) parts.push(`Title: ${p.title}`);
  if (p.company_name) parts.push(`Company: ${p.company_name}`);
  if (p.industry) parts.push(`Industry: ${p.industry}`);
  if (p.bio) parts.push(`Bio: ${p.bio}`);
  if (participant.intent) parts.push(`Intent: ${participant.intent}`);
  if (participant.role) parts.push(`Role: ${participant.role}`);
  if (participant.looking_for) parts.push(`Looking for: ${participant.looking_for}`);
  if (participant.offering) parts.push(`Offering: ${participant.offering}`);

  const expertise = p.expertise_areas || [];
  if (expertise.length > 0) parts.push(`Expertise: ${expertise.join(", ")}`);

  const interests = p.interests || [];
  if (interests.length > 0) parts.push(`Interests: ${interests.join(", ")}`);

  const tags = participant.tags || [];
  if (tags.length > 0) parts.push(`Tags: ${tags.join(", ")}`);

  return parts.join(". ") || "No profile information";
}

/**
 * Call OpenAI embeddings API for a batch of texts.
 */
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.data
    .sort((a: any, b: any) => a.index - b.index)
    .map((item: any) => item.embedding);
}

/**
 * POST /api/embeddings/generate
 * Generate embeddings for all approved participants in an event.
 */
export async function POST(request: Request) {
  const admin = getAdmin();
  const { eventId } = await request.json();

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  // Fetch all approved participants with profile data
  const { data: participants, error: fetchError } = await admin
    .from("participants")
    .select(`
      id, role, intent, tags, looking_for, offering,
      profiles!inner(full_name, title, company_name, industry, expertise_areas, interests, bio)
    `)
    .eq("event_id", eventId)
    .eq("status", "approved");

  if (fetchError || !participants) {
    return NextResponse.json(
      { error: "Failed to fetch participants", details: fetchError?.message },
      { status: 500 }
    );
  }

  if (participants.length === 0) {
    return NextResponse.json({ error: "No approved participants found" }, { status: 400 });
  }

  // Build embedding texts
  const embeddingInputs = participants.map((p) => ({
    participantId: p.id,
    text: buildEmbeddingText(p),
  }));

  // Generate embeddings in batches
  let totalGenerated = 0;
  const allResults: { participantId: string; embedding: number[]; text: string }[] = [];

  for (let i = 0; i < embeddingInputs.length; i += BATCH_SIZE) {
    const batch = embeddingInputs.slice(i, i + BATCH_SIZE);
    const texts = batch.map((b) => b.text);
    const embeddings = await getEmbeddings(texts);

    for (let j = 0; j < batch.length; j++) {
      allResults.push({
        participantId: batch[j].participantId,
        embedding: embeddings[j],
        text: batch[j].text,
      });
    }
    totalGenerated += batch.length;
  }

  // Upsert embeddings into database
  // Delete existing embeddings for these participants first
  const participantIds = allResults.map((r) => r.participantId);
  await admin
    .from("profile_embeddings")
    .delete()
    .in("participant_id", participantIds);

  // Insert new embeddings in batches
  for (let i = 0; i < allResults.length; i += 100) {
    const batch = allResults.slice(i, i + 100);
    const rows = batch.map((r) => ({
      participant_id: r.participantId,
      embedding: JSON.stringify(r.embedding),
      embedding_text: r.text,
      model: MODEL,
    }));

    const { error: insertError } = await admin
      .from("profile_embeddings")
      .insert(rows);

    if (insertError) {
      console.error("Embedding insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to store embeddings", details: insertError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    generated: totalGenerated,
    model: MODEL,
    dimensions: allResults[0]?.embedding.length || 0,
  });
}
