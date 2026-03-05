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
 * Fallback when OpenAI is unavailable or profile is too thin for safe AI generation.
 * Produces minimal but honest output instead of hallucinated specifics.
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

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const intentPhrases = intents.map((i) => INTENT_CONTEXT[i]).filter(Boolean);
  const lookingFor =
    intentPhrases.length > 0
      ? `${capitalize(intentPhrases[0])}${intentPhrases.length > 1 ? `, and ${intentPhrases.slice(1).join(" and ")}` : ""}${industryTag}.${interests.length > 0 ? ` Particularly interested in ${interests.slice(0, 2).join(" and ")}.` : ""}`
      : `Open to meaningful connections and opportunities${industryTag}.`;

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

    // Skip AI when there's not enough grounded context to prevent hallucination.
    //
    // "Meaningful numbers" = $-amounts or standalone 2+ digit numbers.
    // Acronyms like B2B, B2C, Web3 contain digits but are NOT specific facts —
    // use /\$\d|\b\d{2,}\b/ instead of /\d/ to avoid false positives.
    //
    // We skip AI when:
    //  1. Sparse: no bio, no expertise, no interests.
    //  2. Vague bio: bio <100 chars, no meaningful numbers, AND no expertise.
    //     (expertise present = enough anchor for AI even without bio details)
    const hasMeaningfulNumbers = /\$\d|\b\d{2,}\b/.test(bio);
    const isSparse = !bio.trim() && expertiseAreas.length === 0 && interests.length === 0;
    const isVagueBio =
      bio.trim().length < 100 && !hasMeaningfulNumbers && expertiseAreas.length === 0;
    if (isSparse || isVagueBio) {
      return NextResponse.json(
        generateFallback(title, companyName, industry, intents, expertiseAreas, interests)
      );
    }

    // Build profile context — bio first since it has the most specific details
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

    const prompt = `You are filling in a professional matchmaking profile for a B2B event. Write two short, honest, first-person statements based STRICTLY on what is in the profile below.

Profile:
${profileLines}

GOOD examples when profile has rich context (bio with specific facts):
- Looking for: "Series A founders in enterprise SaaS or fintech raising $3–8M."
- Looking for: "CTOs modernizing their analytics stack, and SI partners for reseller deals in EMEA."
- Offering: "$2M check, hands-on portfolio support, and 200+ enterprise CXO introductions."
- Offering: "Payments infrastructure processing $2B/yr for mid-market SaaS — open to API partnerships."

GOOD examples when profile context is thin (no bio details, only expertise/interest tags):
- Looking for: "Product leaders and digital transformation practitioners open to partnerships."
- Looking for: "B2B professionals in Technology open to partnerships and meaningful connections."
- Offering: "Product management background — open to collaboration and knowledge exchange."
- Offering: "B2B sales experience — open to partnerships in the Technology space."

BAD examples (never write like this):
- "I'm looking for innovative companies to collaborate with and explore synergies."
- "As a CEO at Acme, I seek strategic partnerships and growth opportunities."
- "I bring extensive industry expertise and a robust professional network."
- "Looking to connect with like-minded professionals to drive mutual success."

Rules:
1. ONLY use details explicitly stated in the profile — never add anything that is not there.
2. If the bio has specific numbers (revenue, customers, team size, AUM, etc.), use them.
3. Maximum 2 sentences each. No lists or bullet points.
4. Never start with "As a", "I'm a", "I am a", "I seek", or "I'm looking to connect".
5. Banned phrases: synergies, innovative, robust, extensive expertise, passionate, leverage, cutting-edge, value-add, thought leader, like-minded.
6. "Looking for" = who or what they want to meet at this event.
7. "Offering" = the value, product, capital, or expertise they bring.
8. NEVER invent numbers, revenue figures, client counts, years of experience, team sizes, or budget amounts not in the profile.
9. NEVER add company size descriptors (mid-market, enterprise, SMB, large-scale, Fortune 500, mid-sized) unless the profile explicitly states them.
10. If the profile has no specific product, technology, or metric in the bio, keep both statements SHORT and derive them only from the expertise and interest tags provided.

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
