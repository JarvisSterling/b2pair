import { NextRequest, NextResponse } from "next/server";

const INTENT_TEMPLATES: Record<string, { lookingFor: string[]; offering: string[] }> = {
  buying: {
    lookingFor: [
      "reliable suppliers and vendors",
      "competitive pricing on products and services",
      "new sourcing opportunities",
    ],
    offering: [
      "long-term purchasing partnerships",
      "volume procurement opportunities",
    ],
  },
  selling: {
    lookingFor: [
      "potential buyers and decision-makers",
      "distribution channels and market access",
      "feedback on products and services",
    ],
    offering: [
      "innovative products and solutions",
      "competitive commercial offerings",
      "tailored business proposals",
    ],
  },
  investing: {
    lookingFor: [
      "promising startups and growth-stage companies",
      "co-investment opportunities",
      "market insights and due diligence contacts",
    ],
    offering: [
      "capital and strategic investment",
      "advisory and mentorship for portfolio companies",
      "access to investor networks",
    ],
  },
  partnering: {
    lookingFor: [
      "strategic partners for joint ventures",
      "complementary businesses for collaboration",
      "technology or distribution partnerships",
    ],
    offering: [
      "partnership opportunities in our domain",
      "shared resources and co-development",
      "access to our market and customer base",
    ],
  },
  learning: {
    lookingFor: [
      "industry best practices and trends",
      "expert insights and case studies",
      "workshops and knowledge-sharing sessions",
    ],
    offering: [
      "experience and lessons from our journey",
      "willingness to share knowledge openly",
    ],
  },
  networking: {
    lookingFor: [
      "like-minded professionals to connect with",
      "industry contacts and introductions",
      "community and peer groups",
    ],
    offering: [
      "a broad professional network",
      "introductions and warm referrals",
      "collaborative energy and openness",
    ],
  },
};

function generateSuggestion(
  title: string,
  companyName: string,
  intents: string[]
): { lookingFor: string; offering: string } {
  const lookingForParts: string[] = [];
  const offeringParts: string[] = [];

  for (const intent of intents) {
    const template = INTENT_TEMPLATES[intent];
    if (template) {
      // Pick 1-2 items from each
      lookingForParts.push(template.lookingFor[0]);
      if (template.lookingFor[1]) lookingForParts.push(template.lookingFor[1]);
      offeringParts.push(template.offering[0]);
    }
  }

  // Personalize with title and company
  const rolePrefix = title ? `As a ${title}` : "As a professional";
  const companyContext = companyName ? ` at ${companyName}` : "";

  const lookingFor = lookingForParts.length > 0
    ? `${rolePrefix}${companyContext}, I'm looking for ${lookingForParts.join(", ")}.`
    : "";

  const offering = offeringParts.length > 0
    ? `${rolePrefix}${companyContext}, I bring ${offeringParts.join(", ")}.`
    : "";

  return { lookingFor, offering };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, companyName, intents } = body;

    if (!intents || !Array.isArray(intents) || intents.length === 0) {
      return NextResponse.json(
        { error: "At least one intent is required for suggestions" },
        { status: 400 }
      );
    }

    const suggestion = generateSuggestion(
      title || "",
      companyName || "",
      intents
    );

    return NextResponse.json(suggestion);
  } catch {
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
