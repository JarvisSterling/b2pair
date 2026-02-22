"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEventId } from "@/hooks/use-event-id";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Loader2,
  RefreshCw,
  Calendar,
  MessageSquare,
  Bookmark,
  X,
  Sparkles,
} from "lucide-react";

interface MatchEntry {
  id: string;
  score: number;
  intent_score: number;
  industry_score: number;
  interest_score: number;
  match_reasons: string[];
  status: string;
  other_participant: {
    id: string;
    role: string;
    intent: string | null;
    profiles: {
      full_name: string;
      avatar_url: string | null;
      title: string | null;
      company_name: string | null;
      industry: string | null;
      bio: string | null;
      expertise_areas: string[];
    };
  };
}

export default function EventMatchesPage() {
  const eventId = useEventId();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get my participant id
    const { data: myParticipant } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .single();

    if (!myParticipant) {
      setLoading(false);
      return;
    }

    setMyParticipantId(myParticipant.id);

    // Get matches where I'm participant_a or participant_b
    const { data: matchesA } = await supabase
      .from("matches")
      .select(`
        id, score, intent_score, industry_score, interest_score, match_reasons, status,
        participant_b:participants!matches_participant_b_id_fkey(
          id, role, intent,
          profiles!inner(full_name, avatar_url, title, company_name, industry, bio, expertise_areas)
        )
      `)
      .eq("event_id", eventId)
      .eq("participant_a_id", myParticipant.id)
      .order("score", { ascending: false });

    const { data: matchesB } = await supabase
      .from("matches")
      .select(`
        id, score, intent_score, industry_score, interest_score, match_reasons, status,
        participant_a:participants!matches_participant_a_id_fkey(
          id, role, intent,
          profiles!inner(full_name, avatar_url, title, company_name, industry, bio, expertise_areas)
        )
      `)
      .eq("event_id", eventId)
      .eq("participant_b_id", myParticipant.id)
      .order("score", { ascending: false });

    const combined: MatchEntry[] = [
      ...(matchesA || []).map((m: any) => ({
        ...m,
        other_participant: m.participant_b,
      })),
      ...(matchesB || []).map((m: any) => ({
        ...m,
        other_participant: m.participant_a,
      })),
    ].sort((a, b) => b.score - a.score);

    setMatches(combined);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  async function handleGenerate() {
    setGenerating(true);
    const res = await fetch("/api/matching/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });

    if (res.ok) {
      await loadMatches();
    }
    setGenerating(false);
  }

  async function updateMatchStatus(matchId: string, status: "saved" | "dismissed") {
    const supabase = createClient();
    await supabase.from("matches").update({ status }).eq("id", matchId);
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status } : m))
    );
  }

  const activeMatches = matches.filter((m) => m.status !== "dismissed");
  const savedMatches = matches.filter((m) => m.status === "saved");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Your matches</h1>
          <p className="mt-1 text-body text-muted-foreground">
            {activeMatches.length} recommendations based on your profile
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} variant="outline">
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {matches.length === 0 ? "Generate matches" : "Refresh"}
        </Button>
      </div>

      {activeMatches.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center text-center">
              <Zap className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-body text-muted-foreground">No matches yet.</p>
              <p className="mt-1 text-caption text-muted-foreground">
                Click "Generate matches" to run the AI matching algorithm.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeMatches.map((match) => {
            const p = match.other_participant?.profiles;
            if (!p) return null;

            const initials = p.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <Card
                key={match.id}
                className="hover:shadow-md transition-all duration-150"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt={p.full_name} className="h-14 w-14 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-body font-medium shrink-0">
                        {initials}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-body font-semibold">{p.full_name}</p>
                            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                              <Sparkles className="h-3 w-3 text-primary" />
                              <span className="text-small font-semibold text-primary">{match.score}%</span>
                            </div>
                          </div>
                          <p className="text-caption text-muted-foreground">
                            {[p.title, p.company_name].filter(Boolean).join(" at ")}
                          </p>
                        </div>
                      </div>

                      {p.bio && (
                        <p className="mt-2 text-caption text-muted-foreground line-clamp-2">{p.bio}</p>
                      )}

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {p.industry && <Badge variant="secondary">{p.industry}</Badge>}
                        {p.expertise_areas?.slice(0, 3).map((area) => (
                          <Badge key={area} variant="outline">{area}</Badge>
                        ))}
                      </div>

                      {/* Why matched */}
                      {match.match_reasons && match.match_reasons.length > 0 && (
                        <div className="mt-3 rounded-sm bg-surface p-3">
                          <p className="text-small font-medium text-muted-foreground mb-1">Why you matched</p>
                          {match.match_reasons.map((reason, i) => (
                            <p key={i} className="text-caption text-muted-foreground">{reason}</p>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          onClick={() => router.push(`/dashboard/events/${eventId}/meetings?request=${match.other_participant?.id}`)}
                        >
                          <Calendar className="mr-1 h-3 w-3" />
                          Request meeting
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/events/${eventId}/messages?to=${match.other_participant?.id}`)}
                        >
                          <MessageSquare className="mr-1 h-3 w-3" />
                          Message
                        </Button>
                        {match.status !== "saved" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateMatchStatus(match.id, "saved")}
                          >
                            <Bookmark className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateMatchStatus(match.id, "dismissed")}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
