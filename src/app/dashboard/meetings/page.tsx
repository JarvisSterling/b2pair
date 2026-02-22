"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Loader2,
  Check,
  X,
  Clock,
  Calendar,
  Star,
  MessageSquare,
} from "lucide-react";

interface Meeting {
  id: string;
  event_id: string;
  status: string;
  start_time: string | null;
  duration_minutes: number;
  meeting_type: string;
  location: string | null;
  agenda_note: string | null;
  decline_reason: string | null;
  requester_rating: number | null;
  recipient_rating: number | null;
  created_at: string;
  is_requester: boolean;
  other_person: {
    full_name: string;
    avatar_url: string | null;
    title: string | null;
    company_name: string | null;
  };
  event_name: string;
}

const STATUS_CONFIG: Record<string, { variant: "default" | "secondary" | "success" | "warning" | "destructive"; label: string }> = {
  pending: { variant: "warning", label: "Pending" },
  accepted: { variant: "success", label: "Accepted" },
  declined: { variant: "destructive", label: "Declined" },
  cancelled: { variant: "secondary", label: "Cancelled" },
  completed: { variant: "secondary", label: "Completed" },
  no_show: { variant: "destructive", label: "No show" },
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [ratingMeeting, setRatingMeeting] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);

  useEffect(() => {
    loadMeetings();
  }, []);

  async function loadMeetings() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get all my participant IDs
    const { data: myParticipants } = await supabase
      .from("participants")
      .select("id, event_id, events!inner(name)")
      .eq("user_id", user.id);

    if (!myParticipants || myParticipants.length === 0) {
      setLoading(false);
      return;
    }

    const myIds = myParticipants.map((p) => p.id);
    const eventMap = Object.fromEntries(
      myParticipants.map((p: any) => [p.event_id, p.events.name])
    );

    // Fetch meetings where I'm requester
    const { data: asRequester } = await supabase
      .from("meetings")
      .select(`
        id, event_id, status, start_time, duration_minutes, meeting_type, location,
        agenda_note, decline_reason, requester_rating, recipient_rating, created_at,
        recipient:participants!meetings_recipient_id_fkey(
          profiles!inner(full_name, avatar_url, title, company_name)
        )
      `)
      .in("requester_id", myIds)
      .order("created_at", { ascending: false });

    // Fetch meetings where I'm recipient
    const { data: asRecipient } = await supabase
      .from("meetings")
      .select(`
        id, event_id, status, start_time, duration_minutes, meeting_type, location,
        agenda_note, decline_reason, requester_rating, recipient_rating, created_at,
        requester:participants!meetings_requester_id_fkey(
          profiles!inner(full_name, avatar_url, title, company_name)
        )
      `)
      .in("recipient_id", myIds)
      .order("created_at", { ascending: false });

    const combined: Meeting[] = [
      ...(asRequester || []).map((m: any) => ({
        ...m,
        is_requester: true,
        other_person: m.recipient?.profiles || { full_name: "Unknown" },
        event_name: eventMap[m.event_id] || "Event",
      })),
      ...(asRecipient || []).map((m: any) => ({
        ...m,
        is_requester: false,
        other_person: m.requester?.profiles || { full_name: "Unknown" },
        event_name: eventMap[m.event_id] || "Event",
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setMeetings(combined);
    setLoading(false);
  }

  async function handleResponse(meetingId: string, status: "accepted" | "declined") {
    setUpdating(meetingId);
    await fetch("/api/meetings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId, status }),
    });
    setMeetings((prev) =>
      prev.map((m) => (m.id === meetingId ? { ...m, status } : m))
    );
    setUpdating(null);
  }

  async function handleRate(meetingId: string) {
    if (selectedRating === 0) return;
    await fetch("/api/meetings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId, rating: selectedRating }),
    });
    setRatingMeeting(null);
    setSelectedRating(0);
    loadMeetings();
  }

  const filtered = meetings.filter((m) => {
    if (filter === "all") return true;
    if (filter === "incoming") return !m.is_requester && m.status === "pending";
    if (filter === "upcoming") return m.status === "accepted";
    return m.status === filter;
  });

  const pendingIncoming = meetings.filter((m) => !m.is_requester && m.status === "pending").length;

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
          <h1 className="text-h1 font-semibold tracking-tight">Meetings</h1>
          <p className="mt-1 text-body text-muted-foreground">
            {meetings.length} total meetings across all events
          </p>
        </div>
        <Link href="/dashboard/meetings/calendar">
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {[
          { key: "all", label: "All" },
          { key: "incoming", label: `Incoming${pendingIncoming > 0 ? ` (${pendingIncoming})` : ""}` },
          { key: "upcoming", label: "Upcoming" },
          { key: "completed", label: "Completed" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-sm px-3 py-2 text-caption font-medium whitespace-nowrap transition-all duration-150 ${
              filter === f.key
                ? "bg-primary/5 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center text-center">
              <Users className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-body text-muted-foreground">
                {filter === "incoming" ? "No pending meeting requests." : "No meetings yet."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((meeting) => {
            const other = meeting.other_person;
            const initials = (other.full_name || "?")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const config = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.pending;

            return (
              <Card key={meeting.id}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-4">
                    {other.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={other.avatar_url} alt={other.full_name} className="h-11 w-11 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary text-caption font-medium shrink-0">
                        {initials}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-body font-medium truncate">{other.full_name}</p>
                        <Badge variant={config.variant}>{config.label}</Badge>
                        {!meeting.is_requester && meeting.status === "pending" && (
                          <Badge variant="outline">Incoming</Badge>
                        )}
                      </div>
                      <p className="text-caption text-muted-foreground truncate">
                        {[other.title, other.company_name].filter(Boolean).join(" at ")}
                      </p>

                      <div className="flex items-center gap-4 mt-2 text-caption text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {meeting.event_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {meeting.duration_minutes}min
                        </span>
                        {meeting.start_time && (
                          <span>
                            {new Date(meeting.start_time).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>

                      {meeting.agenda_note && (
                        <p className="mt-2 text-caption text-muted-foreground italic">
                          &ldquo;{meeting.agenda_note}&rdquo;
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        {!meeting.is_requester && meeting.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleResponse(meeting.id, "accepted")}
                              disabled={updating === meeting.id}
                            >
                              {updating === meeting.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="mr-1 h-3 w-3" />
                              )}
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResponse(meeting.id, "declined")}
                              disabled={updating === meeting.id}
                            >
                              <X className="mr-1 h-3 w-3" />
                              Decline
                            </Button>
                          </>
                        )}

                        {meeting.status === "accepted" && (
                          <Button size="sm" variant="outline">
                            <MessageSquare className="mr-1 h-3 w-3" />
                            Message
                          </Button>
                        )}

                        {meeting.status === "completed" && !ratingMeeting && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setRatingMeeting(meeting.id); setSelectedRating(0); }}
                          >
                            <Star className="mr-1 h-3 w-3" />
                            Rate meeting
                          </Button>
                        )}
                      </div>

                      {/* Rating UI */}
                      {ratingMeeting === meeting.id && (
                        <div className="flex items-center gap-3 mt-3 animate-fade-in">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setSelectedRating(star)}
                                className="transition-transform duration-100 hover:scale-110"
                              >
                                <Star
                                  className={`h-5 w-5 ${
                                    star <= selectedRating
                                      ? "fill-warning text-warning"
                                      : "text-border-strong"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <Button size="sm" onClick={() => handleRate(meeting.id)} disabled={selectedRating === 0}>
                            Submit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRatingMeeting(null)}>
                            Cancel
                          </Button>
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
