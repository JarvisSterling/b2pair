import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  computeParticipantVector,
  computeIntentCompatibility,
  type IntentVector,
  INTENT_KEYS,
} from "@/lib/intent-engine";

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
 * Uses the Intent Engine for probability-vector-based matching.
 */
export async function POST(request: Request) {
  const { eventId } = await request.json();

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  const admin = getAdmin();

  // Fetch all approved participants with profiles
  const { data: participants, error: fetchError } = await admin
    .from("participants")
    .select(`
      id, role, intent, intents, tags, looking_for, offering,
      intent_vector, intent_confidence, ai_intent_classification,
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
  const { data: rules } = await admin
    .from("matching_rules")
    .select("*")
    .eq("event_id", eventId)
    .single();

  // Fetch embedding similarities (if embeddings exist)
  const { data: embeddingSims } = await admin
    .rpc("get_embedding_similarities", { p_event_id: eventId });

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

  // Weights from rules
  const weights = {
    intent: rules?.intent_weight ?? 0.35,
    industry: rules?.industry_weight ?? 0.25,
    interest: rules?.interest_weight ?? 0.25,
    complementarity: rules?.complementarity_weight ?? 0.15,
    embedding: hasEmbeddings ? (rules?.embedding_weight ?? 0.20) : 0,
  };

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
  const confidenceThreshold = rules?.intent_confidence_threshold ?? 40;
  const useBehavioral = rules?.use_behavioral_intent !== false;

  // Load behavioral activity if enabled
  let activityMap = new Map<string, any[]>();
  let targetIntentsMap = new Map<string, string[]>();

  if (useBehavioral) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activities } = await admin
      .from("participant_activity")
      .select("participant_id, action_type, target_participant_id, metadata, created_at")
      .eq("event_id", eventId)
      .gte("created_at", thirtyDaysAgo);

    if (activities) {
      for (const a of activities) {
        const list = activityMap.get(a.participant_id) || [];
        list.push(a);
        activityMap.set(a.participant_id, list);
      }
    }

    for (const p of participants) {
      const intents = (p.intents as string[]) || (p.intent ? [p.intent] : []);
      if (intents.length > 0) targetIntentsMap.set(p.id, intents);
    }
  }

  // Compute/update intent vectors for all participants
  const participantVectors = new Map<string, { vector: IntentVector; confidence: number }>();

  for (const p of participants) {
    // Use stored vector if available and fresh, otherwise compute
    let vector: IntentVector;
    let confidence: number;

    if (p.intent_vector && Object.keys(p.intent_vector).length > 0 && p.intent_confidence > 0) {
      vector = p.intent_vector as IntentVector;
      confidence = p.intent_confidence as number;
    } else {
      const activities = useBehavioral ? activityMap.get(p.id) : undefined;
      const computed = computeParticipantVector(
        p as any,
        activities,
        targetIntentsMap.size > 0 ? targetIntentsMap as any : undefined
      );
      vector = computed.vector;
      confidence = computed.confidence;

      // Store for future use
      await admin
        .from("participants")
        .update({ intent_vector: vector, intent_confidence: confidence })
        .eq("id", p.id);
    }

    participantVectors.set(p.id, { vector, confidence });
  }

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

      // Ensure participant_a_id < participant_b_id for unique constraint
      const [pA, pB] = a.id < b.id ? [a, b] : [b, a];

      // Intent score — use Intent Engine vectors
      const vecA = participantVectors.get(pA.id)!;
      const vecB = participantVectors.get(pB.id)!;
      const intentResult = computeIntentCompatibility(
        vecA.vector, vecA.confidence,
        vecB.vector, vecB.confidence
      );

      // If both users have very low confidence, reduce intent impact
      const intentScore = intentResult.final;

      const industryScore = computeIndustryScore(pA.profiles, pB.profiles);
      const interestScore = computeInterestScore(pA.profiles, pB.profiles);
      const complementarityScore = computeComplementarityScore(pA, pB);

      let embeddingScore = 50;
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

      const reasons = generateReasons(
        pA, pB, vecA, vecB, intentResult,
        industryScore, interestScore, embeddingScore, hasEmbeddings
      );

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

  // Clear existing matches and insert new ones
  await admin.from("matches").delete().eq("event_id", eventId);

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i += 500) {
      const batch = matches.slice(i, i + 500);
      await admin.from("matches").insert(batch);
    }
  }

  return NextResponse.json({
    success: true,
    participantCount: participants.length,
    matchCount: matches.length,
    vectorsComputed: participantVectors.size,
  });
}

/* ─── Scoring Functions ─── */

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

  if (aExpertise.size > 0 && bInterests.size > 0) {
    const overlap = [...aExpertise].filter((x) => bInterests.has(x)).length;
    score += (overlap / Math.max(bInterests.size, 1)) * 100;
    factors++;
  }

  if (bExpertise.size > 0 && aInterests.size > 0) {
    const overlap = [...bExpertise].filter((x) => aInterests.has(x)).length;
    score += (overlap / Math.max(aInterests.size, 1)) * 100;
    factors++;
  }

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

  if (a.role !== b.role) score += 20;

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

function generateReasons(
  a: any,
  b: any,
  vecA: { vector: IntentVector; confidence: number },
  vecB: { vector: IntentVector; confidence: number },
  intentResult: { peak: number; base: number; confidence: number; final: number },
  industryScore: number,
  interestScore: number,
  embeddingScore: number,
  hasEmbeddings: boolean
): string[] {
  const reasons: string[] = [];

  // Intent-based reasons using vectors
  if (intentResult.final >= 40) {
    // Find the strongest intent pairing
    let bestI: string = "", bestJ: string = "";
    let bestPairScore = 0;
    for (const iA of INTENT_KEYS) {
      for (const iB of INTENT_KEYS) {
        const ps = vecA.vector[iA] * vecB.vector[iB];
        if (ps > bestPairScore) {
          bestPairScore = ps;
          bestI = iA;
          bestJ = iB;
        }
      }
    }

    if (bestI && bestJ) {
      const intentLabels: Record<string, string> = {
        buying: "looking to buy",
        selling: "looking to sell",
        investing: "looking to invest",
        partnering: "looking to partner",
        learning: "looking to learn",
        networking: "networking",
      };

      if (bestI === bestJ) {
        reasons.push(`Both are ${intentLabels[bestI]}`);
      } else {
        reasons.push(`${a.profiles.full_name} is ${intentLabels[bestI]}, ${b.profiles.full_name} is ${intentLabels[bestJ]}`);
      }
    }
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

  // Looking for / offering match
  if (a.looking_for && b.offering) {
    const overlap = a.looking_for.toLowerCase().split(" ").some(
      (w: string) => w.length > 3 && b.offering.toLowerCase().includes(w)
    );
    if (overlap) reasons.push(`${a.profiles.full_name}'s needs align with ${b.profiles.full_name}'s offerings`);
  }
  if (b.looking_for && a.offering) {
    const overlap = b.looking_for.toLowerCase().split(" ").some(
      (w: string) => w.length > 3 && a.offering.toLowerCase().includes(w)
    );
    if (overlap) reasons.push(`${b.profiles.full_name}'s needs align with ${a.profiles.full_name}'s offerings`);
  }

  if (hasEmbeddings && embeddingScore >= 75) {
    reasons.push("High AI profile similarity");
  }

  if (reasons.length === 0) {
    reasons.push("Complementary profiles");
  }

  return reasons;
}
