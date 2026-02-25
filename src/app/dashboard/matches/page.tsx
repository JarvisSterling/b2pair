"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Sparkles,
  Building2,
  Briefcase,
  MessageSquare,
  Calendar,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";

interface MatchItem {
  id: string;
  score: number;
  status: string;
  match_reasons: string[];
  profile: {
    full_name: string;
    title: string;
    company_name: string;
    industry: string;
    avatar_url: string | null;
    expertise_areas: string[];
  };
  participantId: string;
  role: string;
  intent: string;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "accepted" | "pending">("all");

  const supabase = createClient();

  useEffect(() => {
    loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMatches() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: myParticipants } = await supabase
      .from("participants")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "approved");

    if (!myParticipants?.length) {
      setLoading(false);
      return;
    }

    const pIds = myParticipants.map((p) => p.id);

    const { data: matchesA } = await supabase
      .from("matches")
      .select("id, score, status, match_reasons, participant_a_id, participant_b_id")
      .in("participant_a_id", pIds)
      .neq("status", "rejected")
      .order("score", { ascending: false });

    const { data: matchesB } = await supabase
      .from("matches")
      .select("id, score, status, match_reasons, participant_a_id, participant_b_id")
      .in("participant_b_id", pIds)
      .neq("status", "rejected")
      .order("score", { ascending: false });

    const all = [...(matchesA || []), ...(matchesB || [])];
    const seen = new Set<string>();
    const others: { matchId: string; otherId: string; score: number; reasons: string[]; status: string }[] = [];

    for (const m of all) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      const isA = pIds.includes(m.participant_a_id);
      others.push({
        matchId: m.id,
        otherId: isA ? m.participant_b_id : m.participant_a_id,
        score: m.score,
        reasons: m.match_reasons || [],
        status: m.status,
      });
    }

    if (!others.length) {
      setLoading(false);
      return;
    }

    const { data: participants } = await supabase
      .from("participants")
      .select("id, role, intent, profiles!inner(full_name, title, company_name, industry, avatar_url, expertise_areas)")
      .in("id", others.map((o) => o.otherId));

    const pMap = new Map((participants || []).map((p: any) => [p.id, p]));

    const items: MatchItem[] = others
      .map((o) => {
        const p = pMap.get(o.otherId) as any;
        if (!p) return null;
        return {
          id: o.matchId,
          score: o.score,
          status: o.status,
          match_reasons: o.reasons,
          profile: p.profiles,
          participantId: p.id,
          role: p.role,
          intent: p.intent,
        };
      })
      .filter(Boolean) as MatchItem[];

    setMatches(items);
    setLoading(false);
  }

  const filtered = matches.filter((m) => {
    if (filter === "accepted") return m.status === "accepted";
    if (filter === "pending") return m.status === "pending";
    return true;
  });

  const acceptedCount = matches.filter((m) => m.status === "accepted").length;

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Matches</h1>
          <p className="mt-1 text-body text-muted-foreground">
            AI-powered recommendations based on your profile and interests.
          </p>
        </div>
        <Link href="/dashboard/matches/discover">
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            Discover
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      {matches.length > 0 && (
        <div className="flex gap-2 mb-6">
          {(["all", "accepted", "pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? `All (${matches.length})` : f === "accepted" ? `Connected (${acceptedCount})` : `Pending (${matches.length - acceptedCount})`}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center text-center">
              <Zap className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-body text-muted-foreground">
                {matches.length === 0 ? "No matches yet." : "No matches in this category."}
              </p>
              {matches.length === 0 && (
                <p className="mt-1 text-caption text-muted-foreground">
                  Join an event to see your personalized match recommendations.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: MatchItem }) {
  const { profile, score, status, match_reasons, role, intent } = match;
  const initials = (profile.full_name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {profile.avatar_url ? (
            <SafeImage src={profile.avatar_url} alt={profile.full_name} className="h-12 w-12 rounded-full object-cover" width={48} height={48} />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold truncate">{profile.full_name}</h3>
              <Badge
                variant={status === "accepted" ? "default" : "secondary"}
                className="ml-2 shrink-0 text-xs font-mono"
              >
                {Math.round(score)}%
              </Badge>
            </div>
            {(profile.title || profile.company_name) && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {[profile.title, profile.company_name].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {role && (
            <Badge variant="outline" className="capitalize text-[10px]">
              {role}
            </Badge>
          )}
          {intent && (
            <Badge variant="secondary" className="capitalize text-[10px]">
              {intent}
            </Badge>
          )}
        </div>

        {/* Match reasons */}
        {match_reasons.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-1 mb-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-primary">Why you matched</span>
            </div>
            {match_reasons.slice(0, 2).map((r, i) => (
              <p key={i} className="text-[11px] text-muted-foreground">{r}</p>
            ))}
          </div>
        )}

        {/* Actions */}
        {status === "accepted" && (
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
              <MessageSquare className="h-3 w-3 mr-1.5" />
              Message
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
              <Calendar className="h-3 w-3 mr-1.5" />
              Meet
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
