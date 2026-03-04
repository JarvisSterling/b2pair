﻿﻿﻿﻿﻿﻿﻿"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRealtime } from "@/hooks/use-realtime";
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
  User,
  Users,
  Mail,
  Tag,
  Briefcase,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { SafeImage } from "@/components/ui/safe-image";
import { MeetingSlotPicker, SelectedSlot } from "@/components/meeting-slot-picker";

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
  organizer_recommended: boolean;
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

interface ParticipantDetail {
  id: string;
  role: string;
  intent: string | null;
  tags: string[];
  looking_for: string | null;
  offering: string | null;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    title: string | null;
    company_name: string | null;
    company_size: string | null;
    industry: string | null;
    bio: string | null;
    expertise_areas: string[];
  };
}

function trimAiPrefix(text: string): string {
  const m = text.match(/^As a .+?,\s+I(?:'m looking for|'m seeking| bring|'m offering)\s+(.+)$/i);
  return m ? m[1] : text;
}

const INTENT_LABELS: Record<string, string> = {
  buying: "Looking to buy",
  selling: "Looking to sell",
  investing: "Looking to invest",
  partnering: "Looking to partner",
  learning: "Looking to learn",
  networking: "Networking",
};

const SCORE_FACTORS = [
  { key: "intent_score", label: "Intent", icon: Target, color: "#3b82f6" },
  { key: "industry_score", label: "Industry", icon: Building2, color: "#10b981" },
  { key: "interest_score", label: "Interests", icon: Lightbulb, color: "#f59e0b" },
  { key: "complementarity_score", label: "Complementarity", icon: Puzzle, color: "#8b5cf6" },
  { key: "embedding_score", label: "AI Similarity", icon: Brain, color: "#ec4899" },
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

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function localISOTime(date: string, time: string) {
  return `${date}T${time}:00Z`;
}

export default function EventMatchesPage() {
  const eventId = useEventId();
  const router = useRouter();
  const perms = useParticipantPerms(eventId);
  const track = useActivityTracker(eventId);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<"all" | "saved">("all");
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Inline meeting request state
  const [requestingMeeting, setRequestingMeeting] = useState<string | null>(null);
  const [meetingNote, setMeetingNote] = useState("");
  const [meetingType, setMeetingType] = useState("in-person");
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState<string | null>(null);

  // Participant detail panel state
  const [panelMatch, setPanelMatch] = useState<MatchEntry | null>(null);
  const [panelDetail, setPanelDetail] = useState<ParticipantDetail | null>(null);
  const [loadingPanel, setLoadingPanel] = useState(false);

  // SWR: fetch matches with caching
  const { data: matchData, isLoading: loading, mutate } = useSWR(
    eventId ? `matches-${eventId}` : null,
    async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { matches: [] as MatchEntry[], myParticipantId: null };

      const { data: myParticipant } = await supabase
        .from("participants")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .single();

      if (!myParticipant) return { matches: [] as MatchEntry[], myParticipantId: null };

      const [{ data: matchesA }, { data: matchesB }] = await Promise.all([
        supabase
          .from("matches")
          .select(`
            id, score, intent_score, industry_score, interest_score, complementarity_score, embedding_score, match_reasons, status, organizer_recommended,
            participant_b:participants!matches_participant_b_id_fkey(
              id, role, intent,
              profiles!inner(full_name, avatar_url, title, company_name, industry, bio, expertise_areas)
            )
          `)
          .eq("event_id", eventId)
          .eq("participant_a_id", myParticipant.id)
          .order("score", { ascending: false }),
        supabase
          .from("matches")
          .select(`
            id, score, intent_score, industry_score, interest_score, complementarity_score, embedding_score, match_reasons, status, organizer_recommended,
            participant_a:participants!matches_participant_a_id_fkey(
              id, role, intent,
              profiles!inner(full_name, avatar_url, title, company_name, industry, bio, expertise_areas)
            )
          `)
          .eq("event_id", eventId)
          .eq("participant_b_id", myParticipant.id)
          .order("score", { ascending: false }),
      ]);

      const combined: MatchEntry[] = [
        ...(matchesA || []).map((m: any) => ({ ...m, other_participant: m.participant_b })),
        ...(matchesB || []).map((m: any) => ({ ...m, other_participant: m.participant_a })),
      ].sort((a, b) => b.score - a.score);

      return { matches: combined, myParticipantId: myParticipant.id };
    },
    { revalidateOnFocus: true, dedupingInterval: 2000 }
  );

  const matches = matchData?.matches || [];
  const myParticipantId = matchData?.myParticipantId || null;

  // Real-time: refresh when matches change for this event
  useRealtime({
    table: "matches",
    filter: { event_id: eventId },
    onChanged: () => mutate(),
  });

  async function handleGenerate() {
    setGenerating(true);
    const res = await fetch("/api/matching/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });

    if (res.ok) {
      mutate();
    }
    setGenerating(false);
  }

  async function updateMatchStatus(matchId: string, status: "suggested" | "viewed" | "saved" | "dismissed" | "connected") {
    const match = matches.find((m) => m.id === matchId);
    if (match) {
      if (status === "saved") track("match_saved", match.other_participant?.id);
      if (status === "dismissed") track("match_dismissed", match.other_participant?.id);
    }
    // Optimistic update immediately
    mutate(
      matchData ? {
        ...matchData,
        matches: matchData.matches.map((m) => m.id === matchId ? { ...m, status } : m),
      } : undefined,
      { revalidate: false }
    );
    // Persist via server API (bypasses RLS on matches table)
    await fetch(`/api/matches/${matchId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    // Revalidate to confirm persisted state
    mutate();
  }

  async function sendMeetingRequest(participantId: string) {
    setSendingRequest(true);
    track("meeting_request", participantId, { source: "matches" });

    // Build ISO timestamps if a slot was selected (stored as UTC wall-clock, displayed with timeZone:'UTC')
    let startTime: string | null = null;
    if (selectedSlot) {
      startTime = localISOTime(selectedSlot.date, selectedSlot.startTime);
    }

    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        recipientParticipantId: participantId,
        agendaNote: meetingNote.trim() || null,
        meetingType,
        startTime,
      }),
    });

    if (res.ok) {
      setRequestSent(participantId);
      setTimeout(() => {
        setRequestingMeeting(null);
        setRequestSent(null);
        setMeetingNote("");
        setSelectedSlot(null);
      }, 2000);
    }
    setSendingRequest(false);
  }

  async function openPanel(match: MatchEntry) {
    setPanelMatch(match);
    setLoadingPanel(true);
    setPanelDetail(null);
    const supabase = createClient();
    const { data } = await supabase
      .from("participants")
      .select(`id, role, intent, tags, looking_for, offering, profiles!inner(full_name, email, avatar_url, title, company_name, company_size, industry, bio, expertise_areas)`)
      .eq("id", match.other_participant.id)
      .single();
    setPanelDetail(data as unknown as ParticipantDetail);
    setLoadingPanel(false);
  }

  const activeMatches = matches.filter((m) => m.status !== "dismissed");
  const savedMatches = matches.filter((m) => m.status === "saved");
  const recommendedMatches = activeMatches.filter((m) => m.organizer_recommended);
  const displayMatches = tab === "saved" ? savedMatches : activeMatches;

  const filteredMatches = displayMatches
    .filter((m) => {
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
    })
    .sort((a, b) => {
      if (tab === "all" && !search) {
        if (a.organizer_recommended && !b.organizer_recommended) return -1;
        if (!a.organizer_recommended && b.organizer_recommended) return 1;
      }
      return 0;
    });
  const firstNonRecommendedIdx = filteredMatches.findIndex((m) => !m.organizer_recommended);

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
          {filteredMatches.map((match, index) => {
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
              {tab === "all" && !search && match.organizer_recommended && index === 0 && (
                <div className="flex items-center gap-2 mb-3 mt-1">
                  <Star className="h-3.5 w-3.5 text-amber-500" fill="currentColor" />
                  <span className="text-caption font-medium text-amber-500">Recommended by organizer</span>
                </div>
              )}
              {tab === "all" && !search && index === firstNonRecommendedIdx && firstNonRecommendedIdx > 0 && (
                <div className="flex items-center gap-3 my-4">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-caption text-muted-foreground">Other matches</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              <Card
                key={match.id}
                className={cn(
                  "transition-all duration-200",
                  isSaved && "border-primary/20 bg-primary/[0.02]",
                  match.organizer_recommended && "border-amber-500/30 bg-amber-500/[0.03]"
                )}
              >
<CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    {p.avatar_url ? (
                      <SafeImage src={p.avatar_url} alt={p.full_name} className="h-14 w-14 rounded-full object-cover shrink-0" width={56} height={56} />
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
                            {match.organizer_recommended && (
                              <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
                                <Star className="h-2.5 w-2.5" fill="currentColor" /> Recommended
                              </span>
                            )}
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
                            onClick={() => updateMatchStatus(match.id, isSaved ? "viewed" : "saved")}
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

                      {/* Why matched â€” always visible, styled with icons */}
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
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground w-8 text-right">{Math.round(value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {perms.can_book_meetings && !isRequesting && !wasRequested && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setRequestingMeeting(match.other_participant?.id);
                              setMeetingNote("");
                              setMeetingType("in-person");
                              setSelectedSlot(null);
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPanel(match)}
                          title="View profile"
                        >
                          <User className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Inline meeting request form */}
                      {isRequesting && !wasRequested && (
                        <div className="mt-4 p-4 rounded-lg border border-border bg-background space-y-4 animate-fade-in">

                          {/* Pick a time */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-medium text-muted-foreground">Pick a time</label>
                              {selectedSlot && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedSlot(null)}
                                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                            <MeetingSlotPicker
                              eventId={eventId}
                              recipientParticipantId={match.other_participant?.id}
                              selected={selectedSlot}
                              onSelect={setSelectedSlot}
                            />
                            {selectedSlot && (
                              <p className="mt-2 text-[11px] text-primary font-medium">
                                âœ“ Requesting{" "}
                                {new Date(`${selectedSlot.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}{" "}
                                at {fmtTime(selectedSlot.startTime)} â€“ {fmtTime(selectedSlot.endTime)}
                                {!selectedSlot.iAmFree && (
                                  <span className="ml-1.5 text-warning font-normal">(you&apos;re marked busy at this time)</span>
                                )}
                              </p>
                            )}
                          </div>

                          {/* Meeting type */}
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

                          {/* Note */}
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

                          {/* Actions */}
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
                              {selectedSlot ? "Send request" : "Send without time"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setRequestingMeeting(null); setSelectedSlot(null); }}
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

      {/* Participant Detail Panel */}
      {panelMatch && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => { setPanelMatch(null); setPanelDetail(null); }}
          />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background border-l border-border shadow-xl animate-slide-in-right overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  {panelMatch.other_participant.profiles.avatar_url ? (
                    <SafeImage
                      src={panelMatch.other_participant.profiles.avatar_url}
                      alt={panelMatch.other_participant.profiles.full_name}
                      className="h-16 w-16 rounded-full object-cover"
                      width={64}
                      height={64}
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-h3 font-semibold">
                      {panelMatch.other_participant.profiles.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-h3 font-semibold">{panelMatch.other_participant.profiles.full_name}</h2>
                    <p className="text-caption text-muted-foreground">
                      {[panelMatch.other_participant.profiles.title, panelMatch.other_participant.profiles.company_name]
                        .filter(Boolean)
                        .join(" at ")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setPanelMatch(null); setPanelDetail(null); }}
                  className="p-2 rounded hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {loadingPanel ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : panelDetail ? (
                <>
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <Badge variant="secondary" className="capitalize">{panelDetail.role}</Badge>
                    {panelDetail.profiles.industry && (
                      <Badge variant="outline">
                        <Building2 className="mr-1 h-3 w-3" />
                        {panelDetail.profiles.industry}
                      </Badge>
                    )}
                    {panelDetail.profiles.company_size && (
                      <Badge variant="outline">
                        <Users className="mr-1 h-3 w-3" />
                        {panelDetail.profiles.company_size} employees
                      </Badge>
                    )}
                    {panelDetail.intent && (
                      <Badge variant="outline">
                        <Tag className="mr-1 h-3 w-3" />
                        {INTENT_LABELS[panelDetail.intent] || panelDetail.intent}
                      </Badge>
                    )}
                  </div>

                  {/* Bio */}
                  {panelDetail.profiles.bio && (
                    <div className="mb-6">
                      <h3 className="text-caption font-semibold mb-2">About</h3>
                      <p className="text-body text-muted-foreground whitespace-pre-wrap">
                        {panelDetail.profiles.bio}
                      </p>
                    </div>
                  )}

                  {/* Looking for / Offering */}
                  {(panelDetail.looking_for || panelDetail.offering) && (
                    <div className="mb-6">
                      <h3 className="text-caption font-semibold mb-2">What they&apos;re about</h3>
                      <div className="space-y-2">
                        {panelDetail.looking_for && (
                          <div className="flex items-start gap-2 text-caption text-muted-foreground">
                            <Search className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/70" />
                            <span><span className="font-medium text-foreground">Looking for:</span> {trimAiPrefix(panelDetail.looking_for)}</span>
                          </div>
                        )}
                        {panelDetail.offering && (
                          <div className="flex items-start gap-2 text-caption text-muted-foreground">
                            <Briefcase className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500/80" />
                            <span><span className="font-medium text-foreground">Offering:</span> {trimAiPrefix(panelDetail.offering)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contact */}
                  <div className="mb-6">
                    <h3 className="text-caption font-semibold mb-2">Contact</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-caption text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span>{panelDetail.profiles.email}</span>
                      </div>
                      {panelDetail.profiles.company_name && (
                        <div className="flex items-center gap-2 text-caption text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>{panelDetail.profiles.company_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expertise */}
                  {panelDetail.profiles.expertise_areas?.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-caption font-semibold mb-2">Expertise</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {panelDetail.profiles.expertise_areas.map((area) => (
                          <span
                            key={area}
                            className="text-small bg-secondary text-foreground rounded-full px-2.5 py-1"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {panelDetail.tags?.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-caption font-semibold mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {panelDetail.tags.map((tag) => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-8 pt-6 border-t border-border">
                    {perms.can_message && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setPanelMatch(null);
                          setPanelDetail(null);
                          router.push(`/dashboard/events/${eventId}/messages?to=${panelMatch.other_participant.id}`);
                        }}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Message
                      </Button>
                    )}
                    {perms.can_book_meetings && (
                      <Button
                        className="flex-1"
                        onClick={() => {
                          const m = panelMatch;
                          setPanelMatch(null);
                          setPanelDetail(null);
                          setRequestingMeeting(m.other_participant.id);
                          setMeetingNote("");
                          setMeetingType("in-person");
                          setSelectedSlot(null);
                        }}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Request meeting
                      </Button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}




