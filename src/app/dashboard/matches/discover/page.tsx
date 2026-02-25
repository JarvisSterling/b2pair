"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  X,
  ArrowLeft,
  Sparkles,
  Building2,
  Briefcase,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";

interface MatchProfile {
  matchId: string;
  score: number;
  matchReasons: string[];
  participantId: string;
  profile: {
    id: string;
    full_name: string;
    title: string;
    company_name: string;
    industry: string;
    bio: string;
    expertise_areas: string[];
    interests: string[];
    avatar_url: string | null;
  };
  role: string;
  intent: string;
}

export default function DiscoverPage() {
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [animating, setAnimating] = useState(false);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const supabase = createClient();

  useEffect(() => {
    loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMatches() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's participant records
    const { data: myParticipants } = await supabase
      .from("participants")
      .select("id, event_id")
      .eq("user_id", user.id)
      .eq("status", "approved");

    if (!myParticipants?.length) {
      setLoading(false);
      return;
    }

    const participantIds = myParticipants.map((p) => p.id);

    // Fetch matches where user is participant_a or participant_b
    const { data: matchesA } = await supabase
      .from("matches")
      .select("id, score, match_reasons, participant_a_id, participant_b_id, status")
      .in("participant_a_id", participantIds)
      .neq("status", "rejected")
      .order("score", { ascending: false });

    const { data: matchesB } = await supabase
      .from("matches")
      .select("id, score, match_reasons, participant_a_id, participant_b_id, status")
      .in("participant_b_id", participantIds)
      .neq("status", "rejected")
      .order("score", { ascending: false });

    const allMatches = [...(matchesA || []), ...(matchesB || [])];

    // Dedupe and identify the "other" participant
    const seen = new Set<string>();
    const otherParticipantIds: { matchId: string; otherId: string; score: number; reasons: string[]; status: string }[] = [];

    for (const m of allMatches) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);

      const isA = participantIds.includes(m.participant_a_id);
      const otherId = isA ? m.participant_b_id : m.participant_a_id;

      otherParticipantIds.push({
        matchId: m.id,
        otherId,
        score: m.score,
        reasons: m.match_reasons || [],
        status: m.status,
      });
    }

    if (!otherParticipantIds.length) {
      setLoading(false);
      return;
    }

    // Fetch other participants with profiles
    const { data: otherParticipants } = await supabase
      .from("participants")
      .select("id, role, intent, profiles!inner(id, full_name, title, company_name, industry, bio, expertise_areas, interests, avatar_url)")
      .in(
        "id",
        otherParticipantIds.map((o) => o.otherId)
      );

    const participantMap = new Map(
      (otherParticipants || []).map((p: any) => [p.id, p])
    );

    // Track already-accepted ones
    const alreadyAccepted = new Set<string>();

    const profiles: MatchProfile[] = otherParticipantIds
      .map((o) => {
        const p = participantMap.get(o.otherId) as any;
        if (!p) return null;

        if (o.status === "accepted") alreadyAccepted.add(o.matchId);

        return {
          matchId: o.matchId,
          score: o.score,
          matchReasons: o.reasons,
          participantId: p.id,
          profile: p.profiles,
          role: p.role,
          intent: p.intent,
        };
      })
      .filter(Boolean) as MatchProfile[];

    setAccepted(alreadyAccepted);
    setMatches(profiles);
    setLoading(false);
  }

  const handleSwipe = useCallback(
    async (dir: "left" | "right") => {
      if (animating || currentIndex >= matches.length) return;
      setDirection(dir);
      setAnimating(true);

      const match = matches[currentIndex];

      if (dir === "right") {
        // Accept match
        await supabase
          .from("matches")
          .update({ status: "accepted" })
          .eq("id", match.matchId);
        setAccepted((prev) => new Set(prev).add(match.matchId));
      } else {
        // Skip (not reject, just pass)
        setSkipped((prev) => new Set(prev).add(match.matchId));
      }

      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setDirection(null);
        setAnimating(false);
      }, 300);
    },
    [animating, currentIndex, matches, supabase]
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") handleSwipe("left");
      if (e.key === "ArrowRight") handleSwipe("right");
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSwipe]);

  const current = matches[currentIndex];
  const next = matches[currentIndex + 1];
  const progress = matches.length > 0 ? ((currentIndex) / matches.length) * 100 : 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-lg animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard/matches" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-h2 font-semibold tracking-tight">Discover</h1>
            <p className="text-caption text-muted-foreground">Finding your matches...</p>
          </div>
        </div>
        <Card className="h-[520px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading matches...</div>
        </Card>
      </div>
    );
  }

  if (!matches.length) {
    return (
      <div className="mx-auto max-w-lg animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard/matches" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-h2 font-semibold tracking-tight">Discover</h1>
            <p className="text-caption text-muted-foreground">Swipe through your matches</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Sparkles className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-body text-muted-foreground">No matches to discover yet.</p>
            <p className="mt-1 text-caption text-muted-foreground">
              Join an event to get AI-powered match recommendations.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentIndex >= matches.length) {
    return (
      <div className="mx-auto max-w-lg animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard/matches" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-h2 font-semibold tracking-tight">Discover</h1>
          </div>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Heart className="mx-auto mb-4 h-10 w-10 text-primary/40" />
            <p className="text-h3 font-medium">All caught up!</p>
            <p className="mt-2 text-body text-muted-foreground">
              You've reviewed all {matches.length} matches.
              {accepted.size > 0 && ` You connected with ${accepted.size}.`}
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setCurrentIndex(0); setSkipped(new Set()); }}>
                Start Over
              </Button>
              <Link href="/dashboard/matches">
                <Button>View Matches</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-0 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/matches" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-h2 font-semibold tracking-tight">Discover</h1>
            <p className="text-caption text-muted-foreground">
              {currentIndex + 1} of {matches.length}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="font-mono">
          {accepted.size} connected
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-muted mb-6 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Card stack */}
      <div className="relative h-[520px]">
        {/* Next card (peek) */}
        {next && (
          <div className="absolute inset-0 scale-[0.96] opacity-60 translate-y-2">
            <MatchCard match={next} />
          </div>
        )}

        {/* Current card */}
        <div
          className={`absolute inset-0 transition-all duration-300 ${
            direction === "left"
              ? "-translate-x-full rotate-[-8deg] opacity-0"
              : direction === "right"
              ? "translate-x-full rotate-[8deg] opacity-0"
              : ""
          }`}
        >
          <MatchCard match={current} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-6 mt-6">
        <button
          onClick={() => handleSwipe("left")}
          disabled={animating}
          aria-label="Skip this match"
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-muted-foreground/20 text-muted-foreground transition-all hover:border-red-300 hover:text-red-500 hover:scale-110 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <X className="h-6 w-6" />
        </button>

        <button
          onClick={() => handleSwipe("right")}
          disabled={animating}
          aria-label="Connect with this match"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Heart className="h-7 w-7" />
        </button>
      </div>

      {/* Keyboard hint */}
      <p className="mt-4 text-center text-caption text-muted-foreground">
        Use <kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs font-mono">←</kbd> to skip,{" "}
        <kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs font-mono">→</kbd> to connect
      </p>
    </div>
  );
}

function MatchCard({ match }: { match: MatchProfile }) {
  const { profile, score, matchReasons, role, intent } = match;
  const initials = (profile.full_name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="h-full overflow-hidden">
      <CardContent className="flex h-full flex-col p-0">
        {/* Avatar / header area */}
        <div className="relative bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center py-10">
          {profile.avatar_url ? (
            <SafeImage src={profile.avatar_url} alt={profile.full_name} className="h-24 w-24 rounded-full object-cover ring-4 ring-background shadow-lg" width={400} height={96} />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-semibold ring-4 ring-background shadow-lg">
              {initials}
            </div>
          )}

          {/* Score badge */}
          <div className="absolute top-4 right-4">
            <Badge className="bg-primary/10 text-primary border-0 font-mono text-sm">
              {Math.round(score)}% match
            </Badge>
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col p-6">
          <h2 className="text-h3 font-semibold">{profile.full_name}</h2>

          {(profile.title || profile.company_name) && (
            <div className="mt-1 flex items-center gap-2 text-body text-muted-foreground">
              {profile.title && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {profile.title}
                </span>
              )}
              {profile.title && profile.company_name && <span>·</span>}
              {profile.company_name && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {profile.company_name}
                </span>
              )}
            </div>
          )}

          {/* Role & Intent */}
          <div className="mt-3 flex gap-2">
            {role && (
              <Badge variant="outline" className="capitalize text-xs">
                {role}
              </Badge>
            )}
            {intent && (
              <Badge variant="secondary" className="capitalize text-xs">
                {intent}
              </Badge>
            )}
            {profile.industry && (
              <Badge variant="secondary" className="text-xs">
                {profile.industry}
              </Badge>
            )}
          </div>

          {/* Bio snippet */}
          {profile.bio && (
            <p className="mt-4 text-sm text-muted-foreground line-clamp-3">
              {profile.bio}
            </p>
          )}

          {/* Expertise tags */}
          {profile.expertise_areas?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {profile.expertise_areas.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {profile.expertise_areas.length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{profile.expertise_areas.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Why matched */}
          {matchReasons.length > 0 && (
            <div className="mt-auto pt-4 border-t">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">Why you matched</span>
              </div>
              <ul className="space-y-1">
                {matchReasons.slice(0, 3).map((reason, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
