"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEventId } from "@/hooks/use-event-id";
import { useParticipantPerms } from "@/hooks/use-participant-perms";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Users,
  MessageSquare,
  Calendar,
  Loader2,
  X,
  Globe,
  Mail,
  Building2,
  Briefcase,
  Tag,
} from "lucide-react";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { SafeImage } from "@/components/ui/safe-image";

interface DirectoryEntry {
  id: string;
  role: string;
  intent: string | null;
  tags: string[];
  company_role: string | null;
  matchScore?: number;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    title: string | null;
    company_name: string | null;
    industry: string | null;
    bio: string | null;
    expertise_areas: string[];
  };
  company?: {
    name: string;
    logo_url: string | null;
    capabilities: string[];
  } | null;
}

const INTENT_LABELS: Record<string, string> = {
  buying: "Looking to buy",
  selling: "Looking to sell",
  investing: "Looking to invest",
  partnering: "Looking to partner",
  learning: "Looking to learn",
  networking: "Networking",
};

export default function DirectoryPage() {
  const params = useParams();
  const eventId = useEventId();
  const router = useRouter();
  const perms = useParticipantPerms(eventId);
  const track = useActivityTracker(eventId);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState<DirectoryEntry | null>(null);

  const loadEntries = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data } = await supabase
      .from("participants")
      .select(`
        id, role, intent, tags, company_role,
        profiles!inner(full_name, email, avatar_url, title, company_name, industry, bio, expertise_areas),
        company:companies(name, logo_url, capabilities)
      `)
      .eq("event_id", eventId)
      .eq("status", "approved")
      .neq("role", "organizer")
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    let entriesWithScores = data as unknown as DirectoryEntry[];

    // Load match scores in background
    if (user) {
      const { data: myP } = await supabase
        .from("participants")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .single();

      if (myP) {
        const { data: matchesA } = await supabase
          .from("matches")
          .select("participant_b_id, score")
          .eq("event_id", eventId)
          .eq("participant_a_id", myP.id);

        const { data: matchesB } = await supabase
          .from("matches")
          .select("participant_a_id, score")
          .eq("event_id", eventId)
          .eq("participant_b_id", myP.id);

        const scoreMap = new Map<string, number>();
        (matchesA || []).forEach((m: any) => scoreMap.set(m.participant_b_id, m.score));
        (matchesB || []).forEach((m: any) => scoreMap.set(m.participant_a_id, m.score));

        entriesWithScores = entriesWithScores.map((e) => ({
          ...e,
          matchScore: scoreMap.get(e.id),
        }));
      }
    }

    setEntries(entriesWithScores);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const industries = [...new Set(entries.map((e) => e.profiles.industry).filter(Boolean))] as string[];
  const roles = [...new Set(entries.map((e) => e.role))];

  const filtered = entries.filter((entry) => {
    const p = entry.profiles;
    const matchesSearch =
      search === "" ||
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.company_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.title || "").toLowerCase().includes(search.toLowerCase()) ||
      p.expertise_areas.some((a) => a.toLowerCase().includes(search.toLowerCase()));

    const matchesRole = roleFilter === "all" || entry.role === roleFilter;
    const matchesIndustry = industryFilter === "all" || p.industry === industryFilter;

    return matchesSearch && matchesRole && matchesIndustry;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-h1 font-semibold tracking-tight">Participant directory</h1>
        <p className="mt-1 text-body text-muted-foreground">
          {entries.length} participants at this event
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, title, or expertise..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (e.target.value.length >= 3) track("search", undefined, { query: e.target.value }); }}
            className="pl-10"
          />
        </div>
        {roles.length > 1 && (
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 rounded bg-input px-3 text-body border border-border text-foreground"
          >
            <option value="all">All roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>
        )}
        {industries.length > 1 && (
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="h-10 rounded bg-input px-3 text-body border border-border text-foreground"
          >
            <option value="all">All industries</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        )}
      </div>

      {/* Directory Grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center text-center">
              <Users className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-body text-muted-foreground">
                {search ? "No participants match your search." : "No participants yet."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => {
            const p = entry.profiles;
            const initials = p.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <Card
                key={entry.id}
                className="hover:shadow-md hover:border-border-strong transition-all duration-150 cursor-pointer"
                onClick={() => { setSelectedEntry(entry); track("profile_view", entry.id); }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-3">
                    {p.avatar_url ? (
                      <SafeImage src={p.avatar_url} alt={p.full_name} className="h-12 w-12 rounded-full object-cover shrink-0" width={48} height={48} />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-caption font-medium shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-body font-medium truncate">{p.full_name}</p>
                        {entry.matchScore !== undefined && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                            entry.matchScore >= 80
                              ? "bg-emerald-500/10 text-emerald-600"
                              : entry.matchScore >= 60
                              ? "bg-primary/10 text-primary"
                              : "bg-amber-500/10 text-amber-600"
                          }`}>
                            {entry.matchScore}% match
                          </span>
                        )}
                      </div>
                      <p className="text-caption text-muted-foreground truncate">
                        {[p.title, p.company_name].filter(Boolean).join(" at ")}
                      </p>
                    </div>
                  </div>

                  {p.bio && (
                    <p className="text-caption text-muted-foreground line-clamp-2 mb-3">{p.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-1 mb-4">
                    {entry.company && entry.company_role && (
                      <Badge variant="default" className="text-[10px] gap-1">
                        <Building2 className="h-2.5 w-2.5" />
                        {entry.company.name}
                        {entry.company_role === "speaker" && " · Speaker"}
                      </Badge>
                    )}
                    {p.industry && <Badge variant="secondary">{p.industry}</Badge>}
                    {entry.intent && (
                      <Badge variant="outline">{INTENT_LABELS[entry.intent] || entry.intent}</Badge>
                    )}
                  </div>

                  {p.expertise_areas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {p.expertise_areas.slice(0, 3).map((area) => (
                        <span key={area} className="text-small text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                          {area}
                        </span>
                      ))}
                      {p.expertise_areas.length > 3 && (
                        <span className="text-small text-muted-foreground">
                          +{p.expertise_areas.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {perms.can_message && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          track("message_sent", entry.id);
                          router.push(`/dashboard/events/${eventId}/messages?to=${entry.id}`);
                        }}
                      >
                        <MessageSquare className="mr-1 h-3 w-3" />
                        Message
                      </Button>
                    )}
                    {perms.can_book_meetings && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          track("meeting_request", entry.id);
                          router.push(`/dashboard/events/${eventId}/meetings?request=${entry.id}`);
                        }}
                      >
                        <Calendar className="mr-1 h-3 w-3" />
                        Meet
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Participant Detail Panel */}
      {selectedEntry && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setSelectedEntry(null)}
          />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background border-l border-border shadow-xl animate-slide-in-right overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  {selectedEntry.profiles.avatar_url ? (
                    <SafeImage 
                      src={selectedEntry.profiles.avatar_url}
                      alt={selectedEntry.profiles.full_name}
                      className="h-16 w-16 rounded-full object-cover" width={64} height={64} />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-h3 font-semibold">
                      {selectedEntry.profiles.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-h3 font-semibold">{selectedEntry.profiles.full_name}</h2>
                    <p className="text-caption text-muted-foreground">
                      {[selectedEntry.profiles.title, selectedEntry.profiles.company_name]
                        .filter(Boolean)
                        .join(" at ")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="p-2 rounded hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                <Badge variant="secondary" className="capitalize">{selectedEntry.role}</Badge>
                {selectedEntry.profiles.industry && (
                  <Badge variant="outline">
                    <Building2 className="mr-1 h-3 w-3" />
                    {selectedEntry.profiles.industry}
                  </Badge>
                )}
                {selectedEntry.intent && (
                  <Badge variant="outline">
                    <Tag className="mr-1 h-3 w-3" />
                    {INTENT_LABELS[selectedEntry.intent] || selectedEntry.intent}
                  </Badge>
                )}
              </div>

              {/* Bio */}
              {selectedEntry.profiles.bio && (
                <div className="mb-6">
                  <h3 className="text-caption font-semibold mb-2">About</h3>
                  <p className="text-body text-muted-foreground whitespace-pre-wrap">
                    {selectedEntry.profiles.bio}
                  </p>
                </div>
              )}

              {/* Contact */}
              <div className="mb-6">
                <h3 className="text-caption font-semibold mb-2">Contact</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-caption text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{selectedEntry.profiles.email}</span>
                  </div>
                  {selectedEntry.profiles.company_name && (
                    <div className="flex items-center gap-2 text-caption text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>{selectedEntry.profiles.company_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expertise */}
              {selectedEntry.profiles.expertise_areas.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-caption font-semibold mb-2">Expertise</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEntry.profiles.expertise_areas.map((area) => (
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
              {selectedEntry.tags?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-caption font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEntry.tags.map((tag) => (
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
                      setSelectedEntry(null);
                      router.push(`/dashboard/events/${eventId}/messages?to=${selectedEntry.id}`);
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
                      setSelectedEntry(null);
                      router.push(`/dashboard/events/${eventId}/meetings?request=${selectedEntry.id}`);
                    }}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Request meeting
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
