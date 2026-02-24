"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEventId } from "@/hooks/use-event-id";
import { useParticipantPerms } from "@/hooks/use-participant-perms";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Zap,
  Loader2,
  RefreshCw,
  Calendar,
  MessageSquare,
  Bookmark,
  BookmarkCheck,
  X,
  Sparkles,
  Target,
  Building2,
  Lightbulb,
  Puzzle,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchEntry {
  id: string;
  score: number;
  intent_score: number;
  industry_score: number;
  interest_score: number;
  complementarity_score?: number;
  embedding_score?: number;
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

const SCORE_FACTORS = [
  { key: "intent_score", label: "Intent", icon: Target, color: "bg-blue-500" },
  { key: "industry_score", label: "Industry", icon: Building2, color: "bg-emerald-500" },
  { key: "interest_score", label: "Interests", icon: Lightbulb, color: "bg-amber-500" },
  { key: "complementarity_score", label: "Complementarity", icon: Puzzle, color: "bg-purple-500" },
  { key: "embedding_score", label: "AI Similarity", icon: Brain, color: "bg-pink-500" },
];

const REASON_ICONS: Record<string, any> = {
  intent: Target,
  industry: Building2,
  expertise: Lightbulb,
  similarity: Brain,
  default: Sparkles,
};

function getReasonIcon(reason: string) {
  if (reason.toLowerCase().includes("buying") || reason.toLowerCase().includes("selling") || reason.toLowerCase().includes("networking") || reason.toLowerCase().includes("investing") || reason.toLowerCase().includes("partnering")) return REASON_ICONS.intent;
  if (reason.toLowerCase().includes("industry") || reason.toLowerCase().includes("both in")) return REASON_ICONS.industry;
  if (reason.toLowerCase().includes("expertise") || reason.toLowerCase().includes("interested")) return REASON_ICONS.expertise;
  if (reason.toLowerCase().includes("ai") || reason.toLowerCase().includes("similarity")) return REASON_ICONS.similarity;
  return REASON_ICONS.default;
}

export default function EventMatchesPage() {
  const eventId = useEventId();
  const router = useRouter();
  const perms = useParticipantPerms(eventId);
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "saved">("all");
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Inline meeting request state
  const [requestingMeeting, setRequestingMeeting] = useState<string | null>(null);
  const [meetingNote, setMeetingNote] = useState("");
  const [meetingType, setMeetingType] = useState("in-person");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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

    const { data: matchesA } = await supabase
      .from("matches")
      .select(`
        id, score, intent_score, industry_score, interest_score, complementarity_score, embedding_score, match_reasons, status,
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
        id, score, intent_score, industry_score, interest_score, complementarity_score, embedding_score, match_reasons, status,
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

  async function updateMatchStatus(matchId: string, status: "saved" | "dismissed" | "pending") {
    const supabase = createClient();
    await supabase.from("matches").update({ status }).eq("id", matchId);
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status } : m))
    );
  }

  async function sendMeetingRequest(participantId: string) {
    setSendingRequest(true);
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        recipientParticipantId: participantId,
        agendaNote: meetingNote.trim() || null,
        meetingType,
      }),
    });

    if (res.ok) {
      setRequestSent(participantId);
      setTimeout(() => {
        setRequestingMeeting(null);
        setRequestSent(null);
        setMeetingNote("");
      }, 2000);
    }
    setSendingRequest(false);
  }

  const activeMatches = matches.filter((m) => m.status !== "dismissed");
  const savedMatches = matches.filter((m) => m.status === "saved");
  const displayMatches = tab === "saved" ? savedMatches : activeMatches;

  const filteredMatches = displayMatches.filter((m) => {
    if (!search) return true;
    const p = m.other_participant?.profiles;
    if (!p) return false;
    const q = search.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(q) ||
      (p.company_name || "").toLowerCase().includes(q) ||
      (p.title || "").toLowerCase().includes(q) ||
      (p.industry || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
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

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-1">
          <button
            onClick={() => setTab("all")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              tab === "all"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary"
            )}
          >
            All ({activeMatches.length})
          </button>
          <button
            onClick={() => setTab("saved")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5",
              tab === "saved"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary"
            )}
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
            Saved ({savedMatches.length})
          </button>
        </div>
        {displayMatches.length > 5 && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter matches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </div>

      {filteredMatches.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center text-center">
              {tab === "saved" ? (
                <>
                  <BookmarkCheck className="mb-4 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-body text-muted-foreground">No saved matches yet.</p>
                  <p className="mt-1 text-caption text-muted-foreground">
                    Save matches you&apos;re interested in to find them quickly.
                  </p>
                </>
              ) : (
                <>
                  <Zap className="mb-4 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-body text-muted-foreground">No matches yet.</p>
                  <p className="mt-1 text-caption text-muted-foreground">
                    Click &ldquo;Generate matches&rdquo; to run the AI matching algorithm.
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match) => {
            const p = match.other_participant?.profiles;
            if (!p) return null;

            const initials = p.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            const isExpanded = expandedMatch === match.id;
            const isSaved = match.status === "saved";
            const isRequesting = requestingMeeting === match.other_participant?.id;
            const wasRequested = requestSent === match.other_participant?.id;

            return (
              <Card
                key={match.id}
                className={cn(
                  "transition-all duration-200",
                  isSaved && "border-primary/20 bg-primary/[0.02]"
                )}
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
                            {/* Score ring */}
                            <div className="relative flex items-center justify-center">
                              <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/30" />
                                <circle
                                  cx="18" cy="18" r="15" fill="none" strokeWidth="2.5"
                                  strokeDasharray={`${match.score * 0.942} 100`}
                                  strokeLinecap="round"
                                  className={cn(
                                    match.score >= 80 ? "text-emerald-500" :
                                    match.score >= 60 ? "text-primary" :
                                    "text-amber-500"
                                  )}
                                  stroke="currentColor"
                                />
                              </svg>
                              <span className="absolute text-[10px] font-bold">{match.score}</span>
                            </div>
                          </div>
                          <p className="text-caption text-muted-foreground">
                            {[p.title, p.company_name].filter(Boolean).join(" at ")}
                          </p>
                        </div>

                        {/* Save/Dismiss */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateMatchStatus(match.id, isSaved ? "pending" : "saved")}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              isSaved
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                            )}
                            title={isSaved ? "Unsave" : "Save"}
                          >
                            {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => updateMatchStatus(match.id, "dismissed")}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                            title="Dismiss"
                          >
                            <X className="h-4 w-4" />
                          </button>
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

                      {/* Why matched — always visible, styled with icons */}
                      {match.match_reasons && match.match_reasons.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {match.match_reasons.map((reason, i) => {
                            const Icon = getReasonIcon(reason);
                            return (
                              <div key={i} className="flex items-center gap-2 text-caption text-muted-foreground">
                                <Icon className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                                <span>{reason}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Expandable score breakdown */}
                      <button
                        onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
                        className="flex items-center gap-1 mt-3 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        Score breakdown
                      </button>

                      {isExpanded && (
                        <div className="mt-3 p-3 rounded-lg bg-muted/30 space-y-2.5 animate-fade-in">
                          {SCORE_FACTORS.map(({ key, label, icon: Icon, color }) => {
                            const value = (match as any)[key];
                            if (value === undefined || value === null) return null;
                            return (
                              <div key={key} className="flex items-center gap-3">
                                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={cn("h-full rounded-full transition-all", color)}
                                    style={{ width: `${Math.min(value, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground w-8 text-right">{Math.round(value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        {perms.can_book_meetings && !isRequesting && !wasRequested && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setRequestingMeeting(match.other_participant?.id);
                              setMeetingNote("");
                              setMeetingType("in-person");
                            }}
                          >
                            <Calendar className="mr-1.5 h-3.5 w-3.5" />
                            Request meeting
                          </Button>
                        )}
                        {wasRequested && (
                          <Button size="sm" disabled className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                            Request sent!
                          </Button>
                        )}
                        {perms.can_message && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/events/${eventId}/messages?to=${match.other_participant?.id}`)}
                          >
                            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                            Message
                          </Button>
                        )}
                      </div>

                      {/* Inline meeting request form */}
                      {isRequesting && !wasRequested && (
                        <div className="mt-4 p-4 rounded-lg border border-border bg-background space-y-3 animate-fade-in">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Meeting type</label>
                            <div className="flex gap-2 mt-1.5">
                              {["in-person", "virtual", "hybrid"].map((type) => (
                                <button
                                  key={type}
                                  onClick={() => setMeetingType(type)}
                                  className={cn(
                                    "rounded-full border px-3 py-1 text-xs transition-all capitalize",
                                    meetingType === type
                                      ? "border-primary bg-primary/5 text-primary font-medium"
                                      : "border-border text-muted-foreground hover:border-border"
                                  )}
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
                            <textarea
                              rows={2}
                              placeholder="What would you like to discuss?"
                              value={meetingNote}
                              onChange={(e) => setMeetingNote(e.target.value)}
                              className="mt-1.5 flex w-full rounded-lg bg-input/50 px-3 py-2 text-sm border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 resize-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => sendMeetingRequest(match.other_participant?.id)}
                              disabled={sendingRequest}
                            >
                              {sendingRequest ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              Send request
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRequestingMeeting(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
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
