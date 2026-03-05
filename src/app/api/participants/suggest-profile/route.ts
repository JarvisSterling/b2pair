import { NextRequest, NextResponse } from "next/server";

const INTENT_CONTEXT: Record<string, string> = {
  buying: "looking to purchase solutions or services",
  selling: "offering products or services to potential customers",
  investing: "looking to invest capital or find investment",
  partnering: "seeking strategic partnerships or collaborations",
  learning: "here to learn industry trends and best practices",
  networking: "building professional relationships and connections",
};

/**
 * Fallback when OpenAI is unavailable.
 * Produces minimal but honest output instead of generic filler.
 */
function generateFallback(
  title: string,
  companyName: string,
  industry: string,
  intents: string[],
  expertiseAreas: string[],
  interests: string[]
): { lookingFor: string; offering: string } {
  const role = title || "professional";
  const company = companyName ? ` at ${companyName}` : "";
  const industryTag = industry ? ` in ${industry}` : "";

  // Build what they're looking for from intents
  const intentPhrases = intents.map((i) => INTENT_CONTEXT[i]).filter(Boolean);
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const lookingFor =
    intentPhrases.length > 0
      ? `${capitalize(intentPhrases[0])}${intentPhrases.length > 1 ? `, and ${intentPhrases.slice(1).join(" and ")}` : ""}${industryTag}.${interests.length > 0 ? ` Particularly interested in ${interests.slice(0, 2).join(" and ")}.` : ""}`
      : `Open to meaningful connections and opportunities${industryTag}.`;

  // Build offering from expertise
  const offering =
    expertiseAreas.length > 0
      ? `${role}${company} with expertise in ${expertiseAreas.slice(0, 3).join(", ")}.`
      : `${role}${company}${industryTag} — open to collaboration.`;

  return { lookingFor, offering };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title = "",
      companyName = "",
      industry = "",
      bio = "",
      intents = [],
      expertiseAreas = [],
      interests = [],
    } = body;

    if (!intents || !Array.isArray(intents) || intents.length === 0) {
      return NextResponse.json(
        { error: "At least one intent is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        generateFallback(title, companyName, industry, intents, expertiseAreas, interests)
      );
    }

    // Skip AI for sparse profiles — no bio, no expertise, no interests.
    // Without real facts to anchor the output, models hallucinate specific
    // numbers and details (revenue, client counts, budgets) that don't exist.
    const isSparse = !bio.trim() && expertiseAreas.length === 0 && interests.length === 0;
    if (isSparse) {
      return NextResponse.json(
        generateFallback(title, companyName, industry, intents, expertiseAreas, interests)
      );
    }

    // Build profile context — put bio first since it has the most specific details
    const profileLines = [
      bio && `Bio: ${bio}`,
      title && `Title: ${title}`,
      companyName && `Company: ${companyName}`,
      industry && `Industry: ${industry}`,
      intents.length > 0 && `Here to: ${intents.join(", ")}`,
      expertiseAreas.length > 0 && `Expertise: ${expertiseAreas.join(", ")}`,
      interests.length > 0 && `Interests: ${interests.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `You are filling in a professional matchmaking profile for a B2B event. Write two short, punchy, first-person statements that a real professional would actually write.

Profile:
${profileLines}

GOOD examples (specific and direct):
- Looking for: "Series A founders in enterprise SaaS or fintech raising $3–8M."
- Looking for: "CTOs modernizing their analytics stack, and SI partners for reseller deals in EMEA."
- Looking for: "Senior HR and Operations buyers at mid-market companies evaluating workforce tools."
- Offering: "$2M check, hands-on portfolio support, and 200+ enterprise CXO introductions."
- Offering: "10 years in B2B sales at Oracle — pipeline building, deal structuring, enterprise contracts."
- Offering: "Payments infrastructure processing $2B/yr for mid-market SaaS — open to API partnerships."

BAD examples (never write like this):
- "I'm looking for innovative companies to collaborate with and explore synergies."
- "As a CEO at Acme, I seek strategic partnerships and growth opportunities."
- "I bring extensive industry expertise and a robust professional network."
- "Looking to connect with like-minded professionals to drive mutual success."

Rules:
1. Be specific — use actual roles, company types, deal sizes, technologies, or facts from the profile.
2. If the bio has specific numbers (revenue, customers, team size, AUM, etc.), use them in the offering.
3. Maximum 2 sentences each. No lists or bullet points.
4. Never start with "As a", "I'm a", "I am a", "I seek", or "I'm looking to connect".
5. Banned phrases: synergies, innovative, robust, extensive expertise, passionate, leverage, cutting-edge, value-add, thought leader, like-minded.
6. "Looking for" = exactly who or what they want to meet at this event.
7. "Offering" = the concrete value, product, capital, or expertise they bring.
8. If the profile is thin (no bio, no expertise), write short and honest — don't pad with filler.
9. NEVER invent numbers, revenue figures, client counts, team sizes, or budget amounts not explicitly stated in the profile. If the bio has no specific numbers, do not add any.

Respond with ONLY valid JSON: {"lookingFor": "...", "offering": "..."}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        generateFallback(title, companyName, industry, intents, expertiseAreas, interests)
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        generateFallback(title, companyName, industry, intents, expertiseAreas, interests)
      );
    }

    const parsed = JSON.parse(content);
    return NextResponse.json({
      lookingFor: parsed.lookingFor || "",
      offering: parsed.offering || "",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
