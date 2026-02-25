"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRealtime } from "@/hooks/use-realtime";
import { createClient } from "@/lib/supabase/client";
import { useEventId } from "@/hooks/use-event-id";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  Check,
  X,
  Loader2,
  UserPlus,
  ExternalLink,
  Building2,
  Briefcase,
  Mail,
  Globe,
} from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";

interface Participant {
  id: string;
  role: string;
  status: string;
  intent: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    title: string | null;
    company_name: string | null;
    industry: string | null;
    bio: string | null;
    linkedin_url: string | null;
    company_website: string | null;
    expertise_areas: string[];
  };
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  cancelled: "secondary",
};

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  attendee: "secondary",
  exhibitor: "default",
  sponsor: "default",
  speaker: "outline",
  organizer: "outline",
};

export default function ParticipantsPage() {
  const eventId = useEventId();
  const { data: participants = [], isLoading: loading, mutate } = useSWR<Participant[]>(
    eventId ? `participants-${eventId}` : null,
    async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("participants")
        .select(`
          id, role, status, intent, created_at,
          profiles!inner(full_name, email, avatar_url, title, company_name, industry, bio, linkedin_url, company_website, expertise_areas)
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      return (data || []) as unknown as Participant[];
    },
    { revalidateOnFocus: true, dedupingInterval: 2000 }
  );

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [selected, setSelected] = useState<Participant | null>(null);

  // Real-time: refresh when participants change for this event
  useRealtime({
    table: "participants",
    filter: { event_id: eventId },
    onChanged: () => mutate(),
  });

  async function updateStatus(participantId: string, status: "approved" | "rejected") {
    setUpdating(participantId);
    const supabase = createClient();

    await supabase
      .from("participants")
      .update({ status })
      .eq("id", participantId);

    // Optimistic update + revalidate
    mutate(
      participants.map((p) => (p.id === participantId ? { ...p, status } : p)),
      { revalidate: true }
    );
    setUpdating(null);
  }

  const filtered = participants.filter((p) => {
    const matchesSearch =
      search === "" ||
      p.profiles.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.profiles.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.profiles.company_name || "").toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === "all" || p.status === filter;

    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: participants.length,
    pending: participants.filter((p) => p.status === "pending").length,
    approved: participants.filter((p) => p.status === "approved").length,
    rejected: participants.filter((p) => p.status === "rejected").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Participants</h1>
          <p className="mt-1 text-body text-muted-foreground">
            {participants.length} total participants
          </p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "pending", "approved", "rejected"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`
                rounded-sm px-3 py-2 text-caption font-medium
                transition-all duration-150
                ${
                  filter === status
                    ? "bg-primary/5 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }
              `}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-1 text-small">
                ({counts[status]})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Participant List */}
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
        <div className="space-y-2">
          {filtered.map((participant) => {
            const profile = participant.profiles;
            const initials = profile.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={participant.id}
                onClick={() => setSelected(participant)}
                className="flex items-center gap-4 rounded-md border border-border bg-card p-4 transition-colors duration-150 hover:bg-secondary/30 cursor-pointer"
              >
                {profile.avatar_url ? (
                  <SafeImage 
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="h-10 w-10 rounded-full object-cover shrink-0" width={40} height={40} />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-small font-medium shrink-0">
                    {initials}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-body font-medium truncate">{profile.full_name}</p>
                    <Badge variant={ROLE_VARIANTS[participant.role] || "secondary"} className="shrink-0">
                      {participant.role}
                    </Badge>
                  </div>
                  <p className="text-caption text-muted-foreground truncate">
                    {[profile.title, profile.company_name].filter(Boolean).join(" at ") || profile.email}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {participant.status === "pending" ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateStatus(participant.id, "rejected")}
                        disabled={updating === participant.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(participant.id, "approved")}
                        disabled={updating === participant.id}
                      >
                        {updating === participant.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-1 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                    </>
                  ) : (
                    <Badge variant={STATUS_VARIANTS[participant.status] || "secondary"}>
                      {participant.status}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setSelected(null)}
          />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background border-l border-border shadow-xl overflow-y-auto animate-fade-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-h2 font-semibold">Participant Details</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Profile header */}
              <div className="flex items-start gap-4 mb-6">
                {selected.profiles.avatar_url ? (
                  <SafeImage 
                    src={selected.profiles.avatar_url}
                    alt={selected.profiles.full_name}
                    className="h-16 w-16 rounded-full object-cover shrink-0" width={64} height={64} />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-h3 font-medium shrink-0">
                    {selected.profiles.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-h3 font-semibold">{selected.profiles.full_name}</h3>
                  {selected.profiles.title && (
                    <p className="text-body text-muted-foreground">{selected.profiles.title}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={STATUS_VARIANTS[selected.status] || "secondary"}>
                      {selected.status}
                    </Badge>
                    <Badge variant={ROLE_VARIANTS[selected.role] || "secondary"}>
                      {selected.role}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {selected.status === "pending" && (
                <div className="flex gap-2 mb-6">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      updateStatus(selected.id, "approved");
                      setSelected({ ...selected, status: "approved" });
                    }}
                    disabled={updating === selected.id}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      updateStatus(selected.id, "rejected");
                      setSelected({ ...selected, status: "rejected" });
                    }}
                    disabled={updating === selected.id}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              )}

              {/* Details */}
              <div className="space-y-4">
                {selected.profiles.email && (
                  <div className="flex items-center gap-3 text-body">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${selected.profiles.email}`} className="text-primary hover:underline truncate">
                      {selected.profiles.email}
                    </a>
                  </div>
                )}

                {selected.profiles.company_name && (
                  <div className="flex items-center gap-3 text-body">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{selected.profiles.company_name}</span>
                  </div>
                )}

                {selected.profiles.industry && (
                  <div className="flex items-center gap-3 text-body">
                    <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{selected.profiles.industry}</span>
                  </div>
                )}

                {selected.profiles.company_website && (
                  <div className="flex items-center gap-3 text-body">
                    <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={selected.profiles.company_website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                      {selected.profiles.company_website}
                    </a>
                  </div>
                )}

                {selected.profiles.linkedin_url && (
                  <div className="flex items-center gap-3 text-body">
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={selected.profiles.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                      LinkedIn
                    </a>
                  </div>
                )}

                {selected.profiles.bio && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-caption font-medium mb-1">Bio</p>
                    <p className="text-body text-muted-foreground">{selected.profiles.bio}</p>
                  </div>
                )}

                {selected.profiles.expertise_areas?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-caption font-medium mb-2">Expertise</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.profiles.expertise_areas.map((area) => (
                        <Badge key={area} variant="outline">{area}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selected.intent && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-caption font-medium mb-1">Intent</p>
                    <Badge variant="secondary">{selected.intent}</Badge>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-caption font-medium mb-1">Registered</p>
                  <p className="text-body text-muted-foreground">
                    {new Date(selected.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
