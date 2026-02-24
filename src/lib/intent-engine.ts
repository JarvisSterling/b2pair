/**
 * Intent Engine — Computes intent vectors from signals
 * 
 * Intent taxonomy: buying, selling, investing, partnering, learning, networking
 * Each user gets a probability vector that sums to 1.0
 */

export const INTENT_KEYS = ["buying", "selling", "investing", "partnering", "learning", "networking"] as const;
export type IntentKey = (typeof INTENT_KEYS)[number];
export type IntentVector = Record<IntentKey, number>;

// Compatibility matrix: how well intent A pairs with intent B (0-100)
export const COMPATIBILITY_MATRIX: Record<IntentKey, Record<IntentKey, number>> = {
  buying:     { buying: 60, selling: 100, investing: 30, partnering: 30, learning: 30, networking: 30 },
  selling:    { buying: 100, selling: 60, investing: 80, partnering: 80, learning: 60, networking: 30 },
  investing:  { buying: 30, selling: 80, investing: 60, partnering: 100, learning: 30, networking: 30 },
  partnering: { buying: 30, selling: 80, investing: 100, partnering: 60, learning: 60, networking: 60 },
  learning:   { buying: 30, selling: 60, investing: 30, partnering: 60, learning: 60, networking: 100 },
  networking: { buying: 30, selling: 30, investing: 30, partnering: 60, learning: 100, networking: 60 },
};

// ─── Profile Signal Keywords ───────────────────────────────────────────

const TITLE_SIGNALS: { pattern: RegExp; intent: IntentKey; weight: number }[] = [
  // Buying signals
  { pattern: /\b(procurement|purchasing|sourcing|buyer|supply chain)\b/i, intent: "buying", weight: 20 },
  { pattern: /\b(operations|logistics|category manager)\b/i, intent: "buying", weight: 12 },
  { pattern: /\b(CTO|CIO|IT Director|IT Manager|tech lead)\b/i, intent: "buying", weight: 8 },

  // Selling signals
  { pattern: /\b(sales|account executive|account manager|business development|BD)\b/i, intent: "selling", weight: 20 },
  { pattern: /\b(marketing|growth|revenue|commercial)\b/i, intent: "selling", weight: 12 },
  { pattern: /\b(founder|co-founder|CEO|managing director)\b/i, intent: "selling", weight: 10 },

  // Investing signals
  { pattern: /\b(investor|venture|VC|angel|investment|portfolio|fund)\b/i, intent: "investing", weight: 25 },
  { pattern: /\b(private equity|PE|capital|asset management)\b/i, intent: "investing", weight: 20 },

  // Partnering signals
  { pattern: /\b(partnership|alliances|strategic|channel|ecosystem)\b/i, intent: "partnering", weight: 20 },
  { pattern: /\b(business development|BD|expansion)\b/i, intent: "partnering", weight: 10 },

  // Learning signals
  { pattern: /\b(student|researcher|academic|professor|analyst|junior|intern)\b/i, intent: "learning", weight: 20 },
  { pattern: /\b(exploring|learning|curious)\b/i, intent: "learning", weight: 15 },

  // Networking signals
  { pattern: /\b(consultant|advisor|freelance|independent|community)\b/i, intent: "networking", weight: 15 },
  { pattern: /\b(HR|people|talent|recruiter|recruiting)\b/i, intent: "networking", weight: 10 },
];

const BIO_SIGNALS: { pattern: RegExp; intent: IntentKey; weight: number }[] = [
  // Buying
  { pattern: /\b(looking for|searching for|need|seeking)\s+(a\s+)?(supplier|vendor|solution|tool|platform|provider|service)/i, intent: "buying", weight: 25 },
  { pattern: /\b(evaluating|comparing|reviewing)\s+(solutions|options|vendors|tools)/i, intent: "buying", weight: 20 },

  // Selling
  { pattern: /\b(we (offer|provide|deliver|build|help)|our (solution|platform|product|service))\b/i, intent: "selling", weight: 25 },
  { pattern: /\b(helping (companies|businesses|teams|organizations))\b/i, intent: "selling", weight: 20 },
  { pattern: /\b(SaaS|B2B|platform|software|solution)\b/i, intent: "selling", weight: 8 },

  // Investing
  { pattern: /\b(invest(ing|ment)?|fund(ing|ed)?|portfolio|deal flow|due diligence)\b/i, intent: "investing", weight: 20 },
  { pattern: /\b(startup|seed|series [A-D]|raise|round)\b/i, intent: "investing", weight: 12 },

  // Partnering
  { pattern: /\b(partner(ship|ing)?|collaborat(e|ion)|joint venture|alliance|distribution)\b/i, intent: "partnering", weight: 20 },
  { pattern: /\b(looking for.{0,30}partner|open to.{0,30}collaborat)/i, intent: "partnering", weight: 25 },

  // Learning
  { pattern: /\b(learn(ing)?|discover|explore|understand|research|study)\b/i, intent: "learning", weight: 12 },
  { pattern: /\b(best practices|trends|insights|knowledge)\b/i, intent: "learning", weight: 10 },

  // Networking
  { pattern: /\b(connect(ing)?|network(ing)?|meet(ing)?\s+(like-minded|people|professionals))\b/i, intent: "networking", weight: 15 },
  { pattern: /\b(expand.{0,20}(network|connections)|build.{0,20}relationships)\b/i, intent: "networking", weight: 15 },
];

// ─── Core Functions ────────────────────────────────────────────────────

/**
 * Create a zero intent vector
 */
export function emptyVector(): IntentVector {
  return { buying: 0, selling: 0, investing: 0, partnering: 0, learning: 0, networking: 0 };
}

/**
 * Normalize a raw score vector into probabilities (sum = 1.0)
 */
export function normalizeVector(raw: IntentVector): IntentVector {
  const total = INTENT_KEYS.reduce((sum, k) => sum + raw[k], 0);
  if (total === 0) {
    // Uniform distribution if no signal
    const uniform = 1 / INTENT_KEYS.length;
    return Object.fromEntries(INTENT_KEYS.map((k) => [k, uniform])) as IntentVector;
  }
  return Object.fromEntries(INTENT_KEYS.map((k) => [k, Math.round((raw[k] / total) * 1000) / 1000])) as IntentVector;
}

/**
 * Compute intent scores from explicit multi-select intents
 * Each selected intent gets equal weight
 */
export function fromExplicitIntents(intents: string[]): { vector: IntentVector; confidence: number } {
  const raw = emptyVector();
  const validIntents = intents.filter((i) => INTENT_KEYS.includes(i as IntentKey));

  if (validIntents.length === 0) {
    return { vector: normalizeVector(raw), confidence: 0 };
  }

  // Each explicit intent gets a strong base score
  for (const intent of validIntents) {
    raw[intent as IntentKey] += 40;
  }

  // Confidence: 1 intent = 50, 2 = 65, 3 = 75
  const confidence = Math.min(50 + (validIntents.length - 1) * 15, 75);

  return { vector: normalizeVector(raw), confidence };
}

/**
 * Compute intent scores from profile signals (title + bio)
 */
export function fromProfileSignals(
  title: string | null,
  bio: string | null,
  companyName: string | null
): { vector: IntentVector; confidence: number } {
  const raw = emptyVector();
  let signalCount = 0;

  // Title signals
  if (title) {
    for (const signal of TITLE_SIGNALS) {
      if (signal.pattern.test(title)) {
        raw[signal.intent] += signal.weight;
        signalCount++;
      }
    }
  }

  // Bio signals
  if (bio) {
    for (const signal of BIO_SIGNALS) {
      if (signal.pattern.test(bio)) {
        raw[signal.intent] += signal.weight;
        signalCount++;
      }
    }
  }

  // Confidence based on number of signals matched
  const confidence = Math.min(signalCount * 12, 60); // max 60 from profile alone

  return { vector: normalizeVector(raw), confidence };
}

/**
 * Merge multiple intent signal sources into a final vector
 * Uses weighted combination
 */
export function mergeSignals(
  signals: { vector: IntentVector; confidence: number; weight: number }[]
): { vector: IntentVector; confidence: number } {
  const merged = emptyVector();
  let totalWeight = 0;
  let maxConfidence = 0;

  for (const signal of signals) {
    if (signal.confidence === 0) continue;
    const effectiveWeight = signal.weight * (signal.confidence / 100);
    for (const key of INTENT_KEYS) {
      merged[key] += signal.vector[key] * effectiveWeight;
    }
    totalWeight += effectiveWeight;
    maxConfidence = Math.max(maxConfidence, signal.confidence);
  }

  if (totalWeight === 0) {
    return { vector: normalizeVector(emptyVector()), confidence: 0 };
  }

  // Normalize
  for (const key of INTENT_KEYS) {
    merged[key] /= totalWeight;
  }

  // Overall confidence = weighted average of confidences, capped at 95
  const avgConfidence = signals.reduce((sum, s) => sum + s.confidence * s.weight, 0) /
    signals.reduce((sum, s) => sum + s.weight, 0);
  const confidence = Math.min(Math.round(avgConfidence), 95);

  return { vector: normalizeVector(merged), confidence };
}

/**
 * Compute the intent compatibility score between two users
 * Returns: { peak, base, final } scores (0-100)
 */
export function computeIntentCompatibility(
  vectorA: IntentVector,
  confidenceA: number,
  vectorB: IntentVector,
  confidenceB: number
): { peak: number; base: number; confidence: number; final: number } {
  // Peak: strongest single pairing
  let peak = 0;
  for (const iA of INTENT_KEYS) {
    for (const iB of INTENT_KEYS) {
      const pairScore = vectorA[iA] * COMPATIBILITY_MATRIX[iA][iB] * vectorB[iB];
      if (pairScore > peak) peak = pairScore;
    }
  }

  // Base: full matrix product pA^T × M × pB
  let base = 0;
  for (const iA of INTENT_KEYS) {
    for (const iB of INTENT_KEYS) {
      base += vectorA[iA] * COMPATIBILITY_MATRIX[iA][iB] * vectorB[iB];
    }
  }

  // Confidence scaling factor
  const K = Math.min(confidenceA, confidenceB) / 100;

  // Hybrid: 60% Peak + 40% Base, scaled by confidence
  const raw = 0.6 * peak + 0.4 * base;
  const final = raw * (0.5 + 0.5 * K);

  return {
    peak: Math.round(peak * 100) / 100,
    base: Math.round(base * 100) / 100,
    confidence: Math.round(K * 100),
    final: Math.round(final * 100) / 100,
  };
}

/**
 * Compute intent vector for a participant from all available signals
 */
export function computeParticipantVector(participant: {
  intents?: string[];
  intent?: string | null;
  looking_for?: string | null;
  offering?: string | null;
  profiles?: {
    title?: string | null;
    bio?: string | null;
    company_name?: string | null;
  };
}): { vector: IntentVector; confidence: number } {
  const signals: { vector: IntentVector; confidence: number; weight: number }[] = [];

  // 1. Explicit intents (strongest for cold start)
  const explicitIntents = participant.intents && (participant.intents as string[]).length > 0
    ? (participant.intents as string[])
    : participant.intent
    ? [participant.intent]
    : [];

  if (explicitIntents.length > 0) {
    const explicit = fromExplicitIntents(explicitIntents);
    signals.push({ ...explicit, weight: 3.0 }); // highest weight for explicit
  }

  // 2. Profile signals
  if (participant.profiles) {
    const profileSignal = fromProfileSignals(
      participant.profiles.title || null,
      participant.profiles.bio || null,
      participant.profiles.company_name || null
    );
    if (profileSignal.confidence > 0) {
      signals.push({ ...profileSignal, weight: 1.5 });
    }
  }

  // 3. Looking for / Offering text (treat as bio-like signals)
  const lookingOfferingText = [
    participant.looking_for ? `looking for ${participant.looking_for}` : "",
    participant.offering ? `we offer ${participant.offering}` : "",
  ].filter(Boolean).join(". ");

  if (lookingOfferingText) {
    const loSignal = fromProfileSignals(null, lookingOfferingText, null);
    if (loSignal.confidence > 0) {
      signals.push({ ...loSignal, weight: 2.0 });
    }
  }

  if (signals.length === 0) {
    return { vector: normalizeVector(emptyVector()), confidence: 0 };
  }

  return mergeSignals(signals);
}
