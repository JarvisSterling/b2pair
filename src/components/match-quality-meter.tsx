"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface MatchQualityMeterProps {
  title: string;
  companyName: string;
  intents: string[];
  lookingFor: string;
  offering: string;
  companySize: string;
  companyWebsite: string;
}

// Weights reflect actual matching engine importance:
// • Intents = 40% (mirrors engine weight; required to reach "Good")
// • lookingFor + offering = 30% combined (unlock complementarity bonus)
// • title + company = 20% (useful identity context)
// • companySize + website = 10% (nice-to-have)
//
// Key invariant: with all text fields filled but NO intents selected,
// the score is exactly 50% ("Medium") — you need intents to reach "Good".
const FIELD_WEIGHTS: Record<string, number> = {
  intents: 40,
  lookingFor: 15,
  offering: 15,
  title: 10,
  companyName: 10,
  companySize: 5,
  companyWebsite: 5,
};

const FIELD_HINTS: Record<string, string> = {
  intents: "Select your goals — it's the #1 factor in finding great matches",
  lookingFor: "Describe what you're looking for to unlock better matches",
  offering: "Add what you offer so others can find you",
  title: "Add your job title",
  companyName: "Add your company name",
  companySize: "Add company size",
  companyWebsite: "Add your website",
};

function getLevel(score: number) {
  if (score >= 76) return { label: "Excellent", color: "bg-green-500", textColor: "text-green-600" };
  if (score >= 51) return { label: "Good", color: "bg-yellow-500", textColor: "text-yellow-600" };
  if (score >= 31) return { label: "Medium", color: "bg-orange-500", textColor: "text-orange-600" };
  return { label: "Low", color: "bg-red-500", textColor: "text-red-500" };
}

export function MatchQualityMeter({
  title,
  companyName,
  intents,
  lookingFor,
  offering,
  companySize,
  companyWebsite,
}: MatchQualityMeterProps) {
  const { score, topMissingHint } = useMemo(() => {
    const filled: Record<string, boolean> = {
      intents: intents.length > 0,
      lookingFor: lookingFor.trim().length > 0,
      offering: offering.trim().length > 0,
      title: title.trim().length > 0,
      companyName: companyName.trim().length > 0,
      companySize: companySize.length > 0,
      companyWebsite: companyWebsite.trim().length > 0,
    };

    let total = 0;
    // Collect missing fields sorted by weight descending (highest-impact hint first)
    const missing: { key: string; weight: number }[] = [];

    for (const [key, isFilled] of Object.entries(filled)) {
      if (isFilled) {
        total += FIELD_WEIGHTS[key];
      } else {
        missing.push({ key, weight: FIELD_WEIGHTS[key] });
      }
    }

    missing.sort((a, b) => b.weight - a.weight);
    const topHint = missing.length > 0 ? FIELD_HINTS[missing[0].key] : null;

    return { score: total, topMissingHint: topHint };
  }, [title, companyName, intents, lookingFor, offering, companySize, companyWebsite]);

  const level = getLevel(score);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Match Quality</span>
        <span className={cn("text-sm font-semibold", level.textColor)}>
          {level.label} · {score}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", level.color)}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Hint — always shows highest-impact missing field */}
      {topMissingHint && score < 100 && (
        <p className="text-xs text-muted-foreground">
          💡 {topMissingHint}
        </p>
      )}
      {score === 100 && (
        <p className="text-xs text-green-600">✨ Your profile is fully optimized for matching!</p>
      )}
    </div>
  );
}
