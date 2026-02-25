"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ProfileCompletionBannerProps {
  eventId: string;
  participantId: string;
  hasLookingFor: boolean;
  hasOffering: boolean;
  hasCompanySize: boolean;
  hasCompanyWebsite: boolean;
}

export function ProfileCompletionBanner({
  eventId,
  participantId,
  hasLookingFor,
  hasOffering,
  hasCompanySize,
  hasCompanyWebsite,
}: ProfileCompletionBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Calculate completion
  const fields = [
    { filled: true, label: "Title", weight: 15 },
    { filled: true, label: "Company", weight: 15 },
    { filled: true, label: "Intents", weight: 20 },
    { filled: hasLookingFor, label: "Looking For", weight: 20 },
    { filled: hasOffering, label: "Offering", weight: 20 },
    { filled: hasCompanySize, label: "Company Size", weight: 5 },
    { filled: hasCompanyWebsite, label: "Website", weight: 5 },
  ];

  const score = fields.reduce((sum, f) => sum + (f.filled ? f.weight : 0), 0);
  const missing = fields.filter((f) => !f.filled);

  // Don't show if fully complete or dismissed
  if (score >= 100 || dismissed) return null;

  return (
    <div className="relative rounded-lg border border-primary/20 bg-primary/5 p-4 mb-6">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold mb-1">Complete your profile for better matches</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Your profile is {score}% complete. Add{" "}
            {missing
              .slice(0, 2)
              .map((f) => f.label)
              .join(" and ")}{" "}
            to get matched with the right people.
          </p>

          {/* Mini progress bar */}
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3 max-w-xs">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${score}%` }}
            />
          </div>

          <Link href={`/dashboard/events/${eventId}?completeProfile=1`}>
            <Button size="sm" variant="outline" className="text-xs h-8">
              Complete profile
              <ArrowRight className="ml-1.5 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
