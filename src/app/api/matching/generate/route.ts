﻿import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  computeParticipantVector,
  type IntentVector,
  type IntentKey,
  INTENT_KEYS,
  COMPATIBILITY_MATRIX,
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

  // Fetch all approved participants with profiles (left join so participants without profiles aren't silently dropped)
  // Exclude organizers — they should not appear as match candidates
  const { data: rawParticipants, error: fetchError } = await admin
    .from("participants")
    .select(`
      id, role, intent, intents, tags, looking_for, offering,
      expertise_areas, interests,
      intent_vector, intent_confidence, ai_intent_classification,
      profiles(full_name, title, company_name, company_size, industry, bio)
    `)
    .eq("event_id", eventId)
    .eq("status", "approved")
    .neq("role", "organizer");

  if (fetchError || !rawParticipants) {
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }

  // Ensure every participant has a profiles object (default empty fields for those missing profiles)
  const DEFAULT_PROFILE = {
    full_name: null, title: null, company_name: null, company_size: null,
    industry: null, bio: null,
  };
  const participants = rawParticipants.map((p: any) => ({
    ...p,
    profiles: p.profiles || DEFAULT_PROFILE,
  }));

  const participantsWithoutProfiles = rawParticipants.filter((p: any) => !p.profiles);

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
    intent: rules?.intent_weight ?? 0.30,
    industry: rules?.industry_weight ?? 0.20,
    interest: rules?.interest_weight ?? 0.25,
    complementarity: rules?.complementarity_weight ?? 0.15,
    company_size: rules?.company_size_weight ?? 0.10,
    embedding: hasEmbeddings ? (rules?.embedding_weight ?? 0.20) : 0,
  };

  if (!hasEmbeddings) {
    weights.intent = rules?.intent_weight ?? 0.30;
    weights.industry = rules?.industry_weight ?? 0.20;
    weights.interest = rules?.interest_weight ?? 0.25;
    weights.complementarity = rules?.complementarity_weight ?? 0.15;
    weights.company_size = rules?.company_size_weight ?? 0.10;
  }

  const totalWeight = weights.intent + weights.industry + weights.interest + weights.complementarity + weights.company_size + weights.embedding;
  const normalized = {
    intent: weights.intent / totalWeight,
    industry: weights.industry / totalWeight,
    interest: weights.interest / totalWeight,
    complementarity: weights.complementarity / totalWeight,
    company_size: weights.company_size / totalWeight,
    embedding: weights.embedding / totalWeight,
  };

  const minScore = rules?.minimum_score ?? 50;
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

  // ─── Direct Intent Scoring (replaces broken probability-vector approach) ───
  // When a user selects multiple intents, the vector approach dilutes the signal
  // massively (e.g. [networking, partnering] + [selling, investing, networking] 
  // should score 100 via partnering↔investing, but vectors give ~26).
  // Fix: take the BEST single pairwise compatibility from the explicit intents.
  function computeDirectIntentScore(intentsA: string[], intentsB: string[]): number {
    const validA = intentsA.filter((i) => INTENT_KEYS.includes(i as IntentKey));
    const validB = intentsB.filter((i) => INTENT_KEYS.includes(i as IntentKey));
    if (!validA.length || !validB.length) return 40;
    let max = 0;
    for (const iA of validA) {
      for (const iB of validB) {
        const s = COMPATIBILITY_MATRIX[iA as IntentKey]?.[iB as IntentKey] ?? 30;
        if (s > max) max = s;
      }
    }
    return max;
  }

  function getBestIntentPair(
    intentsA: string[], intentsB: string[]
  ): { iA: string; iB: string } | null {
    const validA = intentsA.filter((i) => INTENT_KEYS.includes(i as IntentKey));
    const validB = intentsB.filter((i) => INTENT_KEYS.includes(i as IntentKey));
    if (!validA.length || !validB.length) return null;
    let best = { iA: validA[0], iB: validB[0], score: 0 };
    for (const iA of validA) {
      for (const iB of validB) {
        const s = COMPATIBILITY_MATRIX[iA as IntentKey]?.[iB as IntentKey] ?? 30;
        if (s > best.score) best = { iA, iB, score: s };
      }
    }
    return { iA: best.iA, iB: best.iB };
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

      // Intent score — direct max-pairing (see computeDirectIntentScore above)
      const intentsA = (pA.intents as string[]) || (pA.intent ? [pA.intent] : []);
      const intentsB = (pB.intents as string[]) || (pB.intent ? [pB.intent] : []);
      const intentScore = computeDirectIntentScore(intentsA, intentsB);
      const bestPair = getBestIntentPair(intentsA, intentsB);

      const industryScore = computeIndustryScore(pA.profiles, pB.profiles);
      const interestScore = computeInterestScore(pA, pB);
      const complementarityScore = computeComplementarityScore(pA, pB);
      const companySizeScore = computeCompanySizeScore(pA.profiles, pB.profiles);

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
          companySizeScore * normalized.company_size +
          embeddingScore * normalized.embedding) * 100
      ) / 100;

      if (totalScore < minScore) continue;

      const reasons = generateReasons(
        pA, pB, bestPair, intentScore,
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
    participantsWithoutProfiles: participantsWithoutProfiles.length,
    matchCount: matches.length,
    vectorsComputed: participantVectors.size,
  });
}

/* ─── Scoring Functions ─── */

/**
 * Company size scoring: favors complementary sizes (small meets large = business opportunity)
 * while still giving decent scores to similar sizes (peer networking).
 * 
 * Matrix logic:
 * - Complementary (e.g. 1-10 ↔ 1000+): 90 — startup meets enterprise, high-value match
 * - Adjacent complement (e.g. 11-50 ↔ 201-1000): 80 — good business fit
 * - Same tier: 65 — peer networking value
 * - One step apart: 55 — moderate fit
 * - Unknown: 50 — neutral, no penalty
 */
function computeCompanySizeScore(a: any, b: any): number {
  if (!a.company_size || !b.company_size) return 50; // neutral if unknown

  const sizeOrder = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
  const idxA = sizeOrder.indexOf(a.company_size);
  const idxB = sizeOrder.indexOf(b.company_size);

  if (idxA === -1 || idxB === -1) return 50;

  const distance = Math.abs(idxA - idxB);

  // Complementary sizes score highest (big meets small = deals happen)
  if (distance >= 3) return 90;
  if (distance === 2) return 80;
  if (distance === 1) return 55;
  return 65; // same size = peer networking
}

// Related-industry clusters — industries within the same cluster get elevated scores
// Format: [industryA, industryB] → score (70-85 for related, 40 for unrelated)
const INDUSTRY_RELATIONS: Record<string, Record<string, number>> = {
  // Tech cluster
  "Technology":       { "Software": 90, "AI & Machine Learning": 85, "Cybersecurity": 80, "Cloud Computing": 85, "Fintech": 70, "E-commerce": 70, "Healthcare Technology": 70 },
  "Software":         { "Technology": 90, "AI & Machine Learning": 85, "Cloud Computing": 85, "Cybersecurity": 80, "E-commerce": 75, "Fintech": 70 },
  "AI & Machine Learning": { "Technology": 85, "Software": 85, "Data & Analytics": 90, "Cloud Computing": 80, "Healthcare Technology": 70, "Fintech": 70 },
  "Cloud Computing":  { "Technology": 85, "Software": 85, "AI & Machine Learning": 80, "Cybersecurity": 80 },
  "Cybersecurity":    { "Technology": 80, "Software": 80, "Cloud Computing": 80 },
  "Data & Analytics": { "AI & Machine Learning": 90, "Technology": 80, "Software": 80, "Fintech": 70, "Healthcare Technology": 65 },

  // Finance cluster
  "Fintech":          { "Finance & Banking": 85, "Technology": 70, "Insurance": 70, "Software": 70, "AI & Machine Learning": 70, "E-commerce": 65 },
  "Finance & Banking":{ "Fintech": 85, "Investment": 85, "Insurance": 75, "Real Estate": 65 },
  "Investment":       { "Finance & Banking": 85, "Fintech": 75, "Venture Capital": 90, "Private Equity": 90, "Real Estate": 70 },
  "Venture Capital":  { "Investment": 90, "Private Equity": 80, "Finance & Banking": 75, "Technology": 65 },
  "Private Equity":   { "Investment": 90, "Venture Capital": 80, "Finance & Banking": 75 },
  "Insurance":        { "Finance & Banking": 75, "Fintech": 70, "Healthcare": 65 },

  // Healthcare cluster
  "Healthcare":       { "Healthcare Technology": 85, "Pharmaceutical": 80, "Biotech": 80, "Medical Devices": 80, "Insurance": 65 },
  "Healthcare Technology": { "Healthcare": 85, "Technology": 70, "AI & Machine Learning": 70, "Pharmaceutical": 65 },
  "Pharmaceutical":   { "Healthcare": 80, "Biotech": 90, "Medical Devices": 75 },
  "Biotech":          { "Pharmaceutical": 90, "Healthcare": 80, "Medical Devices": 75, "AI & Machine Learning": 65 },
  "Medical Devices":  { "Healthcare": 80, "Pharmaceutical": 75, "Biotech": 75 },

  // Commerce & Retail cluster
  "E-commerce":       { "Retail": 85, "Logistics": 75, "Marketing": 70, "Fintech": 65, "Technology": 70 },
  "Retail":           { "E-commerce": 85, "Logistics": 75, "Marketing": 70, "Consumer Goods": 80 },
  "Consumer Goods":   { "Retail": 80, "E-commerce": 70, "Marketing": 70, "Logistics": 65 },
  "Logistics":        { "E-commerce": 75, "Retail": 75, "Manufacturing": 70, "Supply Chain": 90 },
  "Supply Chain":     { "Logistics": 90, "Manufacturing": 80, "Retail": 65 },
  "Manufacturing":    { "Supply Chain": 80, "Logistics": 70, "Automotive": 75, "Industrial": 80 },

  // Professional Services cluster
  "Consulting":       { "Management Consulting": 90, "Technology": 65, "Finance & Banking": 65 },
  "Management Consulting": { "Consulting": 90, "Technology": 65 },
  "Marketing":        { "Advertising": 90, "PR & Communications": 85, "E-commerce": 70, "Media": 70 },
  "Advertising":      { "Marketing": 90, "PR & Communications": 80, "Media": 75 },
  "PR & Communications": { "Marketing": 85, "Advertising": 80, "Media": 80 },
  "Legal":            { "Finance & Banking": 65, "Real Estate": 65 },
  "Real Estate":      { "Finance & Banking": 65, "Investment": 70, "Construction": 80 },
  "Construction":     { "Real Estate": 80, "Engineering": 80, "Industrial": 70 },

  // Energy & Environment cluster
  "Energy":           { "CleanTech": 80, "Oil & Gas": 70, "Renewable Energy": 85, "Industrial": 65 },
  "CleanTech":        { "Energy": 80, "Renewable Energy": 90, "Technology": 65 },
  "Renewable Energy": { "CleanTech": 90, "Energy": 85 },
  "Oil & Gas":        { "Energy": 70, "Industrial": 70 },

  // Other clusters
  "Education":        { "E-learning": 90, "Technology": 65, "Healthcare": 55 },
  "E-learning":       { "Education": 90, "Technology": 70 },
  "Media":            { "Entertainment": 80, "Marketing": 70, "Advertising": 75 },
  "Entertainment":    { "Media": 80, "Gaming": 70 },
  "Gaming":           { "Entertainment": 70, "Technology": 75, "Software": 70 },
  "Automotive":       { "Manufacturing": 75, "Technology": 65, "Logistics": 65 },
  "Industrial":       { "Manufacturing": 80, "Engineering": 80, "Construction": 70 },
  "Engineering":      { "Industrial": 80, "Construction": 80, "Technology": 65 },
  "Agriculture":      { "Food & Beverage": 75, "CleanTech": 60, "Logistics": 55 },
  "Food & Beverage":  { "Agriculture": 75, "Retail": 65, "Consumer Goods": 70 },
  "Telecommunications": { "Technology": 80, "Cloud Computing": 75, "Media": 65 },
  "Travel & Hospitality": { "Tourism": 90, "E-commerce": 60, "Logistics": 55 },
  "Tourism":          { "Travel & Hospitality": 90 },
  "HR & Recruitment": { "Technology": 60, "Consulting": 60 },
  "Nonprofit":        { "Education": 65, "Healthcare": 60 },
  "Government":       { "Nonprofit": 55, "Defense": 70 },
  "Defense":          { "Government": 70, "Technology": 60, "Cybersecurity": 75 },
};

function computeIndustryScore(a: any, b: any): number {
  if (!a.industry || !b.industry) return 50;
  if (a.industry === b.industry) return 100;

  // Check related-industry table (both directions)
  const relatedScore = INDUSTRY_RELATIONS[a.industry]?.[b.industry]
    ?? INDUSTRY_RELATIONS[b.industry]?.[a.industry]
    ?? 40;

  return relatedScore;
}

function computeInterestScore(a: any, b: any): number {
  // Use partial/substring matching so "AI" matches "AI Startups", "SaaS" matches "B2B SaaS Growth", etc.
  function partialMatch(setA: string[], setB: string[]): number {
    if (!setA.length || !setB.length) return 0;
    let hits = 0;
    for (const a of setA) {
      const aLow = a.toLowerCase();
      for (const b of setB) {
        const bLow = b.toLowerCase();
        if (aLow === bLow || bLow.includes(aLow) || aLow.includes(bLow)) {
          hits++;
          break; // count each A item at most once
        }
      }
    }
    return hits / Math.max(setA.length, 1);
  }

  const aExp = (a.expertise_areas || []) as string[];
  const bExp = (b.expertise_areas || []) as string[];
  const aInt = (a.interests || []) as string[];
  const bInt = (b.interests || []) as string[];

  let score = 0;
  let factors = 0;

  // a expertise vs b interests (a can teach what b wants to learn)
  if (aExp.length > 0 && bInt.length > 0) {
    score += partialMatch(aExp, bInt) * 100;
    factors++;
  }
  // b expertise vs a interests
  if (bExp.length > 0 && aInt.length > 0) {
    score += partialMatch(bExp, aInt) * 100;
    factors++;
  }
  // shared expertise (peer value)
  if (aExp.length > 0 && bExp.length > 0) {
    const sharedCount = aExp.filter(x => bExp.some(y => {
      const xl = x.toLowerCase(); const yl = y.toLowerCase();
      return xl === yl || xl.includes(yl) || yl.includes(xl);
    })).length;
    const union = new Set([...aExp, ...bExp]).size;
    score += (sharedCount / union) * 80;
    factors++;
  }

  return factors > 0 ? Math.round(score / factors) : 50;
}

function computeComplementarityScore(a: any, b: any): number {
  let score = 50;

  if (a.role !== b.role) score += 20;

  // Tokenize and use partial stemming (first 5 chars of words > 3 chars)
  function tokenize(text: string): string[] {
    if (!text) return [];
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .map((w) => w.substring(0, 6)); // stem to 6 chars
  }

  if (a.looking_for && b.offering) {
    const aTokens = new Set(tokenize(a.looking_for));
    const bTokens = tokenize(b.offering);
    if (bTokens.some((t) => aTokens.has(t))) score += 15;
  }
  if (b.looking_for && a.offering) {
    const bTokens = new Set(tokenize(b.looking_for));
    const aTokens = tokenize(a.offering);
    if (aTokens.some((t) => bTokens.has(t))) score += 15;
  }

  return Math.min(score, 100);
}

function generateReasons(
  a: any,
  b: any,
  bestPair: { iA: string; iB: string } | null,
  intentScore: number,
  industryScore: number,
  interestScore: number,
  embeddingScore: number,
  hasEmbeddings: boolean
): string[] {
  const reasons: string[] = [];

  const intentLabels: Record<string, string> = {
    buying: "looking to buy",
    selling: "looking to sell",
    investing: "looking to invest",
    partnering: "looking to partner",
    learning: "looking to learn",
    networking: "networking",
  };

  // Intent-based reason using best pair
  if (bestPair && intentScore >= 50) {
    if (bestPair.iA === bestPair.iB) {
      reasons.push(`Both are ${intentLabels[bestPair.iA]}`);
    } else {
      reasons.push(`${a.profiles.full_name || "Attendee A"} is ${intentLabels[bestPair.iA]}, ${b.profiles.full_name || "Attendee B"} is ${intentLabels[bestPair.iB]}`);
    }
  }

  if (industryScore === 100) {
    reasons.push(`Both in ${a.profiles.industry}`);
  } else if (industryScore >= 70) {
    reasons.push(`Related industries: ${a.profiles.industry} & ${b.profiles.industry}`);
  }

  const sharedExpertise = (a.expertise_areas || []).filter(
    (x: string) => (b.expertise_areas || []).includes(x)
  );
  if (sharedExpertise.length > 0) {
    reasons.push(`Shared expertise: ${sharedExpertise.slice(0, 3).join(", ")}`);
  }

  const aExpertiseMatchesBInterests = (a.expertise_areas || []).filter(
    (x: string) => (b.interests || []).includes(x)
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

  // Company size complementarity
  if (a.profiles.company_size && b.profiles.company_size) {
    const sizeOrder = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
    const dist = Math.abs(sizeOrder.indexOf(a.profiles.company_size) - sizeOrder.indexOf(b.profiles.company_size));
    if (dist >= 3) {
      const sizeLabels: Record<string, string> = { "1-10": "startup", "11-50": "small business", "51-200": "mid-size", "201-1000": "large company", "1000+": "enterprise" };
      reasons.push(`${sizeLabels[a.profiles.company_size] || a.profiles.company_size} meets ${sizeLabels[b.profiles.company_size] || b.profiles.company_size}`);
    }
  }

  if (hasEmbeddings && embeddingScore >= 75) {
    reasons.push("High AI profile similarity");
  }

  if (reasons.length === 0) {
    reasons.push("Complementary profiles");
  }

  return reasons;
}
