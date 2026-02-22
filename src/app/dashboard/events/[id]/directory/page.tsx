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
import { Search, Users, MessageSquare, Calendar, Loader2 } from "lucide-react";

interface DirectoryEntry {
  id: string;
  role: string;
  intent: string | null;
  tags: string[];
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
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");

  const loadEntries = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("participants")
      .select(`
        id, role, intent, tags,
        profiles!inner(full_name, email, avatar_url, title, company_name, industry, bio, expertise_areas)
      `)
      .eq("event_id", eventId)
      .eq("status", "approved")
      .neq("role", "organizer")
      .order("created_at", { ascending: false });

    if (data) setEntries(data as unknown as DirectoryEntry[]);
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
            onChange={(e) => setSearch(e.target.value)}
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
              <Card key={entry.id} className="hover:shadow-md hover:border-border-strong transition-all duration-150">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-3">
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt={p.full_name} className="h-12 w-12 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-caption font-medium shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-body font-medium truncate">{p.full_name}</p>
                      <p className="text-caption text-muted-foreground truncate">
                        {[p.title, p.company_name].filter(Boolean).join(" at ")}
                      </p>
                    </div>
                  </div>

                  {p.bio && (
                    <p className="text-caption text-muted-foreground line-clamp-2 mb-3">{p.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-1 mb-4">
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
                        onClick={() => router.push(`/dashboard/events/${eventId}/messages?to=${entry.id}`)}
                      >
                        <MessageSquare className="mr-1 h-3 w-3" />
                        Message
                      </Button>
                    )}
                    {perms.can_book_meetings && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push(`/dashboard/events/${eventId}/meetings?request=${entry.id}`)}
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
    </div>
  );
}
