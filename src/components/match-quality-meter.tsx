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

const FIELD_WEIGHTS = {
  title: 15,
  companyName: 15,
  intents: 20,
  lookingFor: 20,
  offering: 20,
  companySize: 5,
  companyWebsite: 5,
};

type FieldKey = keyof typeof FIELD_WEIGHTS;

const FIELD_LABELS: Record<FieldKey, string> = {
  title: "Job Title",
  companyName: "Company",
  intents: "Intents",
  lookingFor: "Looking For",
  offering: "Offering",
  companySize: "Company Size",
  companyWebsite: "Website",
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
  const { score, missingFields } = useMemo(() => {
    const fields: Record<FieldKey, boolean> = {
      title: title.trim().length > 0,
      companyName: companyName.trim().length > 0,
      intents: intents.length > 0,
      lookingFor: lookingFor.trim().length > 0,
      offering: offering.trim().length > 0,
      companySize: companySize.length > 0,
      companyWebsite: companyWebsite.trim().length > 0,
    };

    let total = 0;
    const missing: string[] = [];

    for (const [key, filled] of Object.entries(fields)) {
      if (filled) {
        total += FIELD_WEIGHTS[key as FieldKey];
      } else {
        missing.push(FIELD_LABELS[key as FieldKey]);
      }
    }

    return { score: total, missingFields: missing };
  }, [title, companyName, intents, lookingFor, offering, companySize, companyWebsite]);

  const level = getLevel(score);

  // Find the highest-weight missing field for the hint
  const topMissing = missingFields.length > 0 ? missingFields[0] : null;

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

      {/* Hint */}
      {topMissing && score < 100 && (
        <p className="text-xs text-muted-foreground">
          💡 Add <span className="font-medium text-foreground">{topMissing}</span> to improve your matches
        </p>
      )}
      {score === 100 && (
        <p className="text-xs text-green-600">✨ Your profile is fully optimized for matching!</p>
      )}
    </div>
  );
}
