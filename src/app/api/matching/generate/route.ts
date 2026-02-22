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
 * POST /api/matching/generate
 * Generate AI match scores for all participants in an event.
 * Called by organizers to run/refresh matching.
 */
export async function POST(request: Request) {
  const supabaseAdmin = getAdmin();
  const { eventId } = await request.json();

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  // Fetch all approved participants with profiles
  const { data: participants, error: fetchError } = await getAdmin()
    .from("participants")
    .select(`
      id, role, intent, tags, looking_for, offering,
      profiles!inner(full_name, title, company_name, industry, expertise_areas, interests, bio)
    `)
    .eq("event_id", eventId)
    .eq("status", "approved");

  if (fetchError || !participants) {
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }

  if (participants.length < 2) {
    return NextResponse.json({ error: "Need at least 2 participants to generate matches" }, { status: 400 });
  }

  // Fetch matching rules
  const { data: rules } = await getAdmin()
    .from("matching_rules")
    .select("*")
    .eq("event_id", eventId)
    .single();

  // Fetch embedding similarities (if embeddings exist)
  const { data: embeddingSims } = await getAdmin()
    .rpc("get_embedding_similarities", { p_event_id: eventId });

  // Build a lookup map for embedding similarity: "idA|idB" -> similarity
  const embeddingMap = new Map<string, number>();
  let hasEmbeddings = false;
  if (embeddingSims && embeddingSims.length > 0) {
    hasEmbeddings = true;
    for (const sim of embeddingSims) {
      const key = sim.participant_a < sim.participant_b
        ? `${sim.participant_a}|${sim.participant_b}`
        : `${sim.participant_b}|${sim.participant_a}`;
      embeddingMap.set(key, sim.similarity);
    }
  }

  const weights = {
    intent: rules?.intent_weight ?? 0.30,
    industry: rules?.industry_weight ?? 0.20,
    interest: rules?.interest_weight ?? 0.20,
    complementarity: rules?.complementarity_weight ?? 0.10,
    embedding: hasEmbeddings ? (rules?.embedding_weight ?? 0.20) : 0,
  };

  // If no embeddings, redistribute that weight proportionally
  if (!hasEmbeddings) {
    weights.intent = rules?.intent_weight ?? 0.35;
    weights.industry = rules?.industry_weight ?? 0.25;
    weights.interest = rules?.interest_weight ?? 0.25;
    weights.complementarity = rules?.complementarity_weight ?? 0.15;
  }

  const totalWeight = weights.intent + weights.industry + weights.interest + weights.complementarity + weights.embedding;
  const normalized = {
    intent: weights.intent / totalWeight,
    industry: weights.industry / totalWeight,
    interest: weights.interest / totalWeight,
    complementarity: weights.complementarity / totalWeight,
    embedding: weights.embedding / totalWeight,
  };

  const minScore = rules?.minimum_score ?? 40;
  const excludeSameCompany = rules?.exclude_same_company ?? true;
  const excludeSameRole = rules?.exclude_same_role ?? false;

  // Generate all pairwise matches
  const matches: {
    event_id: string;
    participant_a_id: string;
    participant_b_id: string;
    score: number;
    intent_score: number;
    industry_score: number;
    interest_score: number;
    complementarity_score: number;
    embedding_score: number;
    match_reasons: string[];
  }[] = [];

  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const a = participants[i] as any;
      const b = participants[j] as any;

      // Exclusion checks
      if (excludeSameCompany && a.profiles.company_name && a.profiles.company_name === b.profiles.company_name) continue;
      if (excludeSameRole && a.role === b.role) continue;

      // Ensure participant_a_id < participant_b_id for the unique constraint
      const [pA, pB] = a.id < b.id ? [a, b] : [b, a];

      const intentScore = computeIntentScore(pA, pB);
      const industryScore = computeIndustryScore(pA.profiles, pB.profiles);
      const interestScore = computeInterestScore(pA.profiles, pB.profiles);
      const complementarityScore = computeComplementarityScore(pA, pB);

      // Embedding similarity (0-100 scale)
      let embeddingScore = 50; // neutral default when no embeddings
      if (hasEmbeddings) {
        const key = pA.id < pB.id ? `${pA.id}|${pB.id}` : `${pB.id}|${pA.id}`;
        const sim = embeddingMap.get(key);
        embeddingScore = sim !== undefined ? Math.round(sim * 100) : 50;
      }

      const totalScore = Math.round(
        (intentScore * normalized.intent +
          industryScore * normalized.industry +
          interestScore * normalized.interest +
          complementarityScore * normalized.complementarity +
          embeddingScore * normalized.embedding) * 100
      ) / 100;

      if (totalScore < minScore) continue;

      const reasons = generateReasons(pA, pB, intentScore, industryScore, interestScore, embeddingScore, hasEmbeddings);

      matches.push({
        event_id: eventId,
        participant_a_id: pA.id,
        participant_b_id: pB.id,
        score: totalScore,
        intent_score: Math.round(intentScore * 100) / 100,
        industry_score: Math.round(industryScore * 100) / 100,
        interest_score: Math.round(interestScore * 100) / 100,
        complementarity_score: Math.round(complementarityScore * 100) / 100,
        embedding_score: Math.round(embeddingScore * 100) / 100,
        match_reasons: reasons,
      });
    }
  }

  // Clear existing matches for this event and insert new ones
  await getAdmin().from("matches").delete().eq("event_id", eventId);

  if (matches.length > 0) {
    // Insert in batches of 500
    for (let i = 0; i < matches.length; i += 500) {
      const batch = matches.slice(i, i + 500);
      await getAdmin().from("matches").insert(batch);
    }
  }

  return NextResponse.json({
    success: true,
    participantCount: participants.length,
    matchCount: matches.length,
  });
}

/* ─── Scoring Functions ─── */

const INTENT_COMPATIBILITY: Record<string, string[]> = {
  buying: ["selling"],
  selling: ["buying"],
  investing: ["selling", "partnering"],
  partnering: ["partnering", "investing", "selling"],
  learning: ["selling", "partnering", "networking"],
  networking: ["networking", "partnering", "learning"],
};

function computeIntentScore(a: any, b: any): number {
  if (!a.intent || !b.intent) return 50;

  const compatible = INTENT_COMPATIBILITY[a.intent] || [];
  if (compatible.includes(b.intent)) return 100;

  // Check reverse
  const reverseCompatible = INTENT_COMPATIBILITY[b.intent] || [];
  if (reverseCompatible.includes(a.intent)) return 100;

  // Same intent gets partial credit
  if (a.intent === b.intent) return 60;

  return 30;
}

function computeIndustryScore(a: any, b: any): number {
  if (!a.industry || !b.industry) return 50;
  if (a.industry === b.industry) return 100;
  return 40;
}

function computeInterestScore(a: any, b: any): number {
  const aExpertise = new Set(a.expertise_areas || []);
  const bExpertise = new Set(b.expertise_areas || []);
  const aInterests = new Set(a.interests || []);
  const bInterests = new Set(b.interests || []);

  let score = 0;
  let factors = 0;

  // A's expertise matches B's interests
  if (aExpertise.size > 0 && bInterests.size > 0) {
    const overlap = [...aExpertise].filter((x) => bInterests.has(x)).length;
    score += (overlap / Math.max(bInterests.size, 1)) * 100;
    factors++;
  }

  // B's expertise matches A's interests
  if (bExpertise.size > 0 && aInterests.size > 0) {
    const overlap = [...bExpertise].filter((x) => aInterests.has(x)).length;
    score += (overlap / Math.max(aInterests.size, 1)) * 100;
    factors++;
  }

  // Shared expertise (common ground)
  if (aExpertise.size > 0 && bExpertise.size > 0) {
    const overlap = [...aExpertise].filter((x) => bExpertise.has(x)).length;
    const union = new Set([...aExpertise, ...bExpertise]).size;
    score += (overlap / union) * 80;
    factors++;
  }

  return factors > 0 ? score / factors : 50;
}

function computeComplementarityScore(a: any, b: any): number {
  let score = 50;

  // Different roles are complementary
  if (a.role !== b.role) score += 20;

  // Looking for / offering match
  if (a.looking_for && b.offering) {
    const aLooking = a.looking_for.toLowerCase();
    const bOffering = b.offering.toLowerCase();
    if (aLooking.split(" ").some((w: string) => bOffering.includes(w))) score += 15;
  }
  if (b.looking_for && a.offering) {
    const bLooking = b.looking_for.toLowerCase();
    const aOffering = a.offering.toLowerCase();
    if (bLooking.split(" ").some((w: string) => aOffering.includes(w))) score += 15;
  }

  return Math.min(score, 100);
}

function generateReasons(a: any, b: any, intentScore: number, industryScore: number, interestScore: number, embeddingScore: number = 50, hasEmbeddings: boolean = false): string[] {
  const reasons: string[] = [];

  if (intentScore >= 90) {
    reasons.push(`${a.profiles.full_name} is ${a.intent || "networking"} and ${b.profiles.full_name} is ${b.intent || "networking"}`);
  }

  if (industryScore >= 90) {
    reasons.push(`Both in ${a.profiles.industry}`);
  }

  const sharedExpertise = (a.profiles.expertise_areas || []).filter(
    (x: string) => (b.profiles.expertise_areas || []).includes(x)
  );
  if (sharedExpertise.length > 0) {
    reasons.push(`Shared expertise: ${sharedExpertise.slice(0, 3).join(", ")}`);
  }

  const aExpertiseMatchesBInterests = (a.profiles.expertise_areas || []).filter(
    (x: string) => (b.profiles.interests || []).includes(x)
  );
  if (aExpertiseMatchesBInterests.length > 0) {
    reasons.push(`${a.profiles.full_name} has expertise ${b.profiles.full_name} is interested in`);
  }

  if (hasEmbeddings && embeddingScore >= 75) {
    reasons.push("High AI profile similarity");
  }

  if (reasons.length === 0) {
    reasons.push("Complementary profiles");
  }

  return reasons;
}
