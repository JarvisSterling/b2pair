"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEventId } from "@/hooks/use-event-id";
import { useParticipantPerms } from "@/hooks/use-participant-perms";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Loader2,
  Check,
  X,
  Clock,
  Calendar,
  Star,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { MeetingSlotPicker, SelectedSlot } from "@/components/meeting-slot-picker";
import { cn } from "@/lib/utils";

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
    id: string;
    full_name: string;
    avatar_url: string | null;
    title: string | null;
    company_name: string | null;
  };
}

const STATUS_CONFIG: Record<
  string,
  { variant: "default" | "secondary" | "success" | "warning" | "destructive"; label: string }
> = {
  pending: { variant: "warning", label: "Pending" },
  accepted: { variant: "success", label: "Accepted" },
  declined: { variant: "destructive", label: "Declined" },
  cancelled: { variant: "secondary", label: "Cancelled" },
  completed: { variant: "secondary", label: "Completed" },
  no_show: { variant: "destructive", label: "No show" },
};

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function localISOTime(date: string, time: string) {
  return `${date}T${time}:00Z`;
}

export default function EventMeetingsPage() {
  const eventId = useEventId();
  const searchParams = useSearchParams();
  const requestParticipantId = searchParams.get("request");
  const perms = useParticipantPerms(eventId);

  // SWR: cached meeting data with background revalidation
  const { data: meetingsResult, isLoading: loading, mutate } = useSWR(
    eventId ? `meetings-${eventId}` : null,
    async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as Meeting[];

      const { data: myParticipant } = await supabase
        .from("participants")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .single();

      if (!myParticipant) return [] as Meeting[];

      const [{ data: asRequester }, { data: asRecipient }] = await Promise.all([
        supabase
          .from("meetings")
          .select(`
            id, event_id, status, start_time, duration_minutes, meeting_type, location,
            agenda_note, decline_reason, requester_rating, recipient_rating, created_at,
            recipient:participants!meetings_recipient_id_fkey(
              id, profiles!inner(full_name, avatar_url, title, company_name)
            )
          `)
          .eq("event_id", eventId)
          .eq("requester_id", myParticipant.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("meetings")
          .select(`
            id, event_id, status, start_time, duration_minutes, meeting_type, location,
            agenda_note, decline_reason, requester_rating, recipient_rating, created_at,
            requester:participants!meetings_requester_id_fkey(
              id, profiles!inner(full_name, avatar_url, title, company_name)
            )
          `)
          .eq("event_id", eventId)
          .eq("recipient_id", myParticipant.id)
          .order("created_at", { ascending: false }),
      ]);

      const combined: Meeting[] = [
        ...(asRequester || []).map((m: any) => ({
          ...m,
          is_requester: true,
          other_person: m.recipient?.profiles
            ? { id: m.recipient.id, ...m.recipient.profiles }
            : { id: null, full_name: "Unknown", avatar_url: null, title: null, company_name: null },
        })),
        ...(asRecipient || []).map((m: any) => ({
          ...m,
          is_requester: false,
          other_person: m.requester?.profiles
            ? { id: m.requester.id, ...m.requester.profiles }
            : { id: null, full_name: "Unknown", avatar_url: null, title: null, company_name: null },
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return combined;
    },
    { revalidateOnFocus: true, dedupingInterval: 2000 }
  );

  const meetings = meetingsResult || [];
  const [filter, setFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [ratingMeeting, setRatingMeeting] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);

  // Request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestTarget, setRequestTarget] = useState<{
    participantId: string;
    fullName: string;
    title: string | null;
    companyName: string | null;
  } | null>(null);
  const [agendaNote, setAgendaNote] = useState("");
  const [meetingType, setMeetingType] = useState("in-person");
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Cancel state
  const [cancellingMeeting, setCancellingMeeting] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  // Reschedule modal state
  const [rescheduleMeeting, setRescheduleMeeting] = useState<Meeting | null>(null);
  const [rescheduleSlot, setRescheduleSlot] = useState<SelectedSlot | null>(null);
  const [rescheduleMeetingType, setRescheduleMeetingType] = useState("in-person");
  const [sendingReschedule, setSendingReschedule] = useState(false);
  const [rescheduleSent, setRescheduleSent] = useState(false);

  // Real-time subscription for meeting updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("meetings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meetings", filter: `event_id=eq.${eventId}` },
        () => mutate()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId, mutate]);

  // Handle ?request= query param
  useEffect(() => {
    if (!requestParticipantId) return;
    openRequestModal(requestParticipantId);
  }, [requestParticipantId]);

  async function openRequestModal(participantId: string) {
    const supabase = createClient();
    const { data: participant } = await supabase
      .from("participants")
      .select("id, profiles!inner(full_name, title, company_name)")
      .eq("id", participantId)
      .single();

    if (participant) {
      setRequestTarget({
        participantId: participant.id,
        fullName: (participant.profiles as any).full_name,
        title: (participant.profiles as any).title,
        companyName: (participant.profiles as any).company_name,
      });
      setShowRequestModal(true);
    }
  }

  async function sendMeetingRequest() {
    if (!requestTarget) return;
    setSendingRequest(true);

    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        recipientParticipantId: requestTarget.participantId,
        agendaNote: agendaNote.trim() || null,
        meetingType,
        startTime: selectedSlot ? localISOTime(selectedSlot.date, selectedSlot.startTime) : null,
      }),
    });

    if (res.ok) {
      setRequestSent(true);
      mutate();
      setTimeout(() => {
        setShowRequestModal(false);
        setRequestTarget(null);
        setAgendaNote("");
        setSelectedSlot(null);
        setRequestSent(false);
      }, 1500);
    }

    setSendingRequest(false);
  }

  async function handleResponse(
    meetingId: string,
    status: "accepted" | "declined"
  ) {
    setUpdating(meetingId);
    await fetch("/api/meetings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId, status }),
    });
    // Optimistic update + revalidate
    mutate(
      meetings.map((m) => (m.id === meetingId ? { ...m, status } : m)),
      { revalidate: true }
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
    mutate();
  }

  async function handleCancel(meetingId: string) {
    setCancellingMeeting(meetingId);
    await fetch("/api/meetings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId, status: "cancelled" }),
    });
    mutate(
      meetings.map((m) => (m.id === meetingId ? { ...m, status: "cancelled" } : m)),
      { revalidate: true }
    );
    setCancellingMeeting(null);
    setConfirmCancel(null);
  }

  async function handleReschedule() {
    if (!rescheduleMeeting) return;
    setSendingReschedule(true);
    const res = await fetch("/api/meetings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingId: rescheduleMeeting.id,
        reschedule: {
          startTime: rescheduleSlot ? localISOTime(rescheduleSlot.date, rescheduleSlot.startTime) : null,
          meetingType: rescheduleMeetingType,
        },
      }),
    });
    if (res.ok) {
      setRescheduleSent(true);
      mutate();
      setTimeout(() => {
        setRescheduleMeeting(null);
        setRescheduleSlot(null);
        setRescheduleSent(false);
      }, 1800);
    }
    setSendingReschedule(false);
  }

  const filtered = meetings.filter((m) => {
    if (filter === "all") return true;
    if (filter === "incoming") return !m.is_requester && m.status === "pending";
    if (filter === "upcoming") return m.status === "accepted";
    return m.status === filter;
  });

  const pendingIncoming = meetings.filter(
    (m) => !m.is_requester && m.status === "pending"
  ).length;

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
            {meetings.length} meetings for this event
          </p>
        </div>
        <Link href={`/dashboard/events/${eventId}/meetings/calendar`}>
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
          {
            key: "incoming",
            label: `Incoming${pendingIncoming > 0 ? ` (${pendingIncoming})` : ""}`,
          },
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
                {filter === "incoming"
                  ? "No pending meeting requests."
                  : "No meetings yet."}
              </p>
              <p className="mt-1 text-caption text-muted-foreground">
                Visit your matches to request meetings with other participants.
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
            const config =
              STATUS_CONFIG[meeting.status] || STATUS_CONFIG.pending;

            return (
              <Card key={meeting.id}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-4">
                    {other.avatar_url ? (
                      <SafeImage src={other.avatar_url}
 alt={other.full_name}
 className="h-11 w-11 rounded-full object-cover shrink-0" width={400} height={200} />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary text-caption font-medium shrink-0">
                        {initials}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-body font-medium truncate">
                          {other.full_name}
                        </p>
                        <Badge variant={config.variant}>{config.label}</Badge>
                        {!meeting.is_requester &&
                          meeting.status === "pending" && (
                            <Badge variant="outline">Incoming</Badge>
                          )}
                      </div>
                      <p className="text-caption text-muted-foreground truncate">
                        {[other.title, other.company_name]
                          .filter(Boolean)
                          .join(" at ")}
                      </p>

                      <div className="flex items-center gap-4 mt-2 text-caption text-muted-foreground">
                        <span className="flex items-center gap-1 capitalize">
                          <Calendar className="h-3 w-3" />
                          {meeting.meeting_type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {meeting.duration_minutes}min
                        </span>
                        {meeting.start_time && (
                          <span>
                            {new Date(meeting.start_time).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                                timeZone: "UTC",
                              }
                            )}
                          </span>
                        )}
                      </div>

                      {meeting.agenda_note && (
                        <p className="mt-2 text-caption text-muted-foreground italic">
                          &ldquo;{meeting.agenda_note}&rdquo;
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3">
                        {/* Recipient: Accept / Decline incoming pending */}
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

                        {/* Requester: Cancel pending outgoing request */}
                        {meeting.is_requester && meeting.status === "pending" && (
                          confirmCancel === meeting.id ? (
                            <>
                              <span className="text-caption text-muted-foreground self-center">Cancel this request?</span>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleCancel(meeting.id)}
                                disabled={cancellingMeeting === meeting.id}
                              >
                                {cancellingMeeting === meeting.id ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : null}
                                Yes, cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmCancel(null)}
                              >
                                Keep it
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive text-white hover:bg-destructive/10 hover:border-destructive"
                              onClick={() => setConfirmCancel(meeting.id)}
                            >
                              <X className="mr-1 h-3 w-3" />
                              Cancel request
                            </Button>
                          )
                        )}

                        {/* Reschedule — available to both parties on pending/accepted meetings */}
                        {(meeting.status === "pending" || meeting.status === "accepted") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRescheduleMeeting(meeting);
                              setRescheduleSlot(null);
                              setRescheduleMeetingType(meeting.meeting_type || "in-person");
                              setRescheduleSent(false);
                            }}
                          >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Reschedule
                          </Button>
                        )}

                        {/* Message button on accepted meetings */}
                        {meeting.status === "accepted" && perms.can_message && (
                          <Link href={`/dashboard/events/${eventId}/messages?to=${other.id}`}>
                            <Button size="sm" variant="outline">
                              <MessageSquare className="mr-1 h-3 w-3" />
                              Message
                            </Button>
                          </Link>
                        )}

                        {/* Rate completed meetings */}
                        {meeting.status === "completed" && !ratingMeeting && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRatingMeeting(meeting.id);
                              setSelectedRating(0);
                            }}
                          >
                            <Star className="mr-1 h-3 w-3" />
                            Rate meeting
                          </Button>
                        )}
                      </div>

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
                          <Button
                            size="sm"
                            onClick={() => handleRate(meeting.id)}
                            disabled={selectedRating === 0}
                          >
                            Submit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRatingMeeting(null)}
                          >
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

      {/* Meeting Request Modal */}
      {showRequestModal && requestTarget && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => {
              setShowRequestModal(false);
              setRequestTarget(null);
              setAgendaNote("");
              setSelectedSlot(null);
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <Card className="w-full max-w-md shadow-xl animate-fade-in">
              <CardContent className="pt-6">
                {requestSent ? (
                  <div className="text-center py-6">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-4">
                      <Check className="h-6 w-6 text-emerald-500" />
                    </div>
                    <h3 className="text-h3 font-semibold">Request sent!</h3>
                    <p className="mt-1 text-caption text-muted-foreground">
                      {requestTarget.fullName} will be notified.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-h3 font-semibold">Request a meeting</h3>
                        <p className="text-caption text-muted-foreground mt-0.5">
                          Send a meeting request to {requestTarget.fullName}
                          {requestTarget.title && requestTarget.companyName
                            ? `, ${requestTarget.title} at ${requestTarget.companyName}`
                            : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setShowRequestModal(false);
                          setRequestTarget(null);
                          setAgendaNote("");
                          setSelectedSlot(null);
                        }}
                        className="p-1.5 rounded hover:bg-secondary ml-3 shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Slot Picker */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-caption font-medium">Pick a time</label>
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
                          recipientParticipantId={requestTarget.participantId}
                          selected={selectedSlot}
                          onSelect={setSelectedSlot}
                        />
                        {selectedSlot && (
                          <p className="mt-2 text-[11px] text-primary font-medium">
                            ✓ Requesting{" "}
                            {new Date(`${selectedSlot.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}{" "}
                            at {fmtTime(selectedSlot.startTime)} – {fmtTime(selectedSlot.endTime)}
                            {!selectedSlot.iAmFree && (
                              <span className="ml-1.5 text-warning font-normal">(you&apos;re marked busy at this time)</span>
                            )}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-caption font-medium">
                          Meeting type
                        </label>
                        <div className="flex gap-2">
                          {["in-person", "virtual", "hybrid"].map((type) => (
                            <button
                              key={type}
                              onClick={() => setMeetingType(type)}
                              className={`rounded-full border px-3 py-1.5 text-caption capitalize transition-all ${
                                meetingType === type
                                  ? "border-primary bg-primary/5 text-primary font-medium"
                                  : "border-border text-muted-foreground hover:border-border-strong"
                              }`}
                            >
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-caption font-medium">
                          Note (optional)
                        </label>
                        <textarea
                          rows={3}
                          placeholder="What would you like to discuss?"
                          value={agendaNote}
                          onChange={(e) => setAgendaNote(e.target.value)}
                          className="flex w-full rounded bg-input px-4 py-3 text-body text-foreground border border-border placeholder:text-muted-foreground transition-colors duration-150 hover:border-border-strong focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/20 resize-none"
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          className="flex-1"
                          onClick={sendMeetingRequest}
                          disabled={sendingRequest}
                        >
                          {sendingRequest ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Calendar className="mr-2 h-4 w-4" />
                          )}
                          {selectedSlot ? "Send request" : "Send without time"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowRequestModal(false);
                            setRequestTarget(null);
                            setAgendaNote("");
                            setSelectedSlot(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Reschedule Modal */}
      {rescheduleMeeting && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => { setRescheduleMeeting(null); setRescheduleSlot(null); setRescheduleSent(false); }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <Card className="w-full max-w-md shadow-xl animate-fade-in">
              <CardContent className="pt-6">
                {rescheduleSent ? (
                  <div className="text-center py-6">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-4">
                      <Check className="h-6 w-6 text-emerald-500" />
                    </div>
                    <h3 className="text-h3 font-semibold">Reschedule sent!</h3>
                    <p className="mt-1 text-caption text-muted-foreground">
                      {rescheduleMeeting.other_person.full_name} will be notified of the new time.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-h3 font-semibold">Reschedule meeting</h3>
                        <p className="text-caption text-muted-foreground mt-0.5">
                          Propose a new time with {rescheduleMeeting.other_person.full_name}. They&apos;ll need to re-confirm.
                        </p>
                      </div>
                      <button
                        onClick={() => { setRescheduleMeeting(null); setRescheduleSlot(null); }}
                        className="p-1.5 rounded hover:bg-secondary ml-3 shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Slot Picker */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-caption font-medium">Pick a new time</label>
                          {rescheduleSlot && (
                            <button
                              type="button"
                              onClick={() => setRescheduleSlot(null)}
                              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <MeetingSlotPicker
                          eventId={eventId}
                          recipientParticipantId={rescheduleMeeting.other_person.id}
                          selected={rescheduleSlot}
                          onSelect={setRescheduleSlot}
                        />
                        {rescheduleSlot && (
                          <p className="mt-2 text-[11px] text-primary font-medium">
                            ✓ Proposing{" "}
                            {new Date(`${rescheduleSlot.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}{" "}
                            at {fmtTime(rescheduleSlot.startTime)} – {fmtTime(rescheduleSlot.endTime)}
                            {!rescheduleSlot.iAmFree && (
                              <span className="ml-1.5 text-warning font-normal">(you&apos;re marked busy at this time)</span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Meeting type */}
                      <div className="space-y-1.5">
                        <label className="text-caption font-medium">Meeting type</label>
                        <div className="flex gap-2">
                          {["in-person", "virtual", "hybrid"].map((type) => (
                            <button
                              key={type}
                              onClick={() => setRescheduleMeetingType(type)}
                              className={`rounded-full border px-3 py-1.5 text-caption capitalize transition-all ${
                                rescheduleMeetingType === type
                                  ? "border-primary bg-primary/5 text-primary font-medium"
                                  : "border-border text-muted-foreground hover:border-border-strong"
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          className="flex-1"
                          onClick={handleReschedule}
                          disabled={sendingReschedule}
                        >
                          {sendingReschedule ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          {rescheduleSlot ? "Propose new time" : "Save changes"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => { setRescheduleMeeting(null); setRescheduleSlot(null); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
