import { NextRequest, NextResponse } from "next/server";

const INTENT_CONTEXT: Record<string, string> = {
  buying: "actively looking to purchase products, solutions, or services",
  selling: "offering products, solutions, or services to potential customers",
  investing: "looking to invest capital in companies or seeking investment",
  partnering: "seeking strategic partnerships, collaborations, or joint ventures",
  learning: "here to learn industry trends, best practices, and gain knowledge",
  networking: "focused on building professional relationships and connections",
};

/**
 * Fallback to deterministic generation when OpenAI is unavailable.
 * More specific than old version — uses title/company/industry context.
 */
function generateFallback(
  title: string,
  companyName: string,
  industry: string,
  bio: string,
  intents: string[],
  expertiseAreas: string[],
  interests: string[]
): { lookingFor: string; offering: string } {
  const role = title || "professional";
  const company = companyName ? ` at ${companyName}` : "";
  const industryCtx = industry ? ` in ${industry}` : "";
  const intentDescriptions = intents
    .map((i) => INTENT_CONTEXT[i])
    .filter(Boolean)
    .join(" and ");
  const expertiseCtx =
    expertiseAreas.length > 0
      ? ` My expertise spans ${expertiseAreas.slice(0, 3).join(", ")}.`
      : "";
  const interestCtx =
    interests.length > 0
      ? ` Particular interest in ${interests.slice(0, 2).join(" and ")}.`
      : "";

  const lookingFor = intentDescriptions
    ? `As a ${role}${company}${industryCtx}, I am ${intentDescriptions}.${interestCtx}`
    : `Looking to connect with the right people and explore meaningful opportunities.`;

  const offering = expertiseAreas.length > 0
    ? `${role}${company} with hands-on expertise in ${expertiseAreas.slice(0, 3).join(", ")}.${expertiseCtx}`
    : bio
    ? bio.slice(0, 200)
    : `Experienced ${role}${company} open to collaboration and value exchange.`;

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

    // If no API key, fall back to deterministic generation
    if (!apiKey) {
      const fallback = generateFallback(title, companyName, industry, bio, intents, expertiseAreas, interests);
      return NextResponse.json(fallback);
    }

    // Build a rich context prompt
    const profileContext = [
      title && `Job title: ${title}`,
      companyName && `Company: ${companyName}`,
      industry && `Industry: ${industry}`,
      bio && `Bio: ${bio}`,
      intents.length > 0 && `Attending to: ${intents.join(", ")}`,
      expertiseAreas.length > 0 && `Expertise: ${expertiseAreas.join(", ")}`,
      interests.length > 0 && `Interests: ${interests.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `You are writing a professional matchmaking profile for a B2B event attendee. Based on their profile below, write two short, specific, first-person statements.

Profile:
${profileContext}

Rules:
- "Looking for" should be 1-2 sentences. Be specific to their role, industry, and stated intents. Mention concrete things they want to find (people, deals, knowledge, partnerships, etc). Do NOT start with "As a".
- "Offering" should be 1-2 sentences. Be specific about what value they bring — expertise, products, network, capital, etc. Do NOT start with "As a".
- Use natural, professional language. Avoid clichés like "synergies", "leverage", "passionate".
- Keep each under 200 characters.

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
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const fallback = generateFallback(title, companyName, industry, bio, intents, expertiseAreas, interests);
      return NextResponse.json(fallback);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      const fallback = generateFallback(title, companyName, industry, bio, intents, expertiseAreas, interests);
      return NextResponse.json(fallback);
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
