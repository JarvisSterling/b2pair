import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Zap,
  Users,
  MessageSquare,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ParticipantEventDashboard({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  // Get event details
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (!event) notFound();

  // Get my participant record
  const { data: myParticipant } = await supabase
    .from("participants")
    .select("id, status, role, participant_type_id")
    .eq("event_id", id)
    .eq("user_id", user.id)
    .single();

  if (!myParticipant) notFound();

  // Get my participant type name and permissions
  let typeName: string | null = null;
  let perms = { can_book_meetings: true, can_message: true, can_view_directory: true };
  if (myParticipant.participant_type_id) {
    const { data: pType } = await supabase
      .from("event_participant_types")
      .select("name, color, permissions")
      .eq("id", myParticipant.participant_type_id)
      .single();
    if (pType) {
      typeName = pType.name;
      if (pType.permissions) {
        perms = { ...perms, ...pType.permissions };
      }
    }
  }

  // Fetch stats
  const [matchRes, meetingRes, upcomingRes, msgRes, participantCountRes] =
    await Promise.all([
      supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id)
        .or(
          `participant_a_id.eq.${myParticipant.id},participant_b_id.eq.${myParticipant.id}`
        ),
      supabase
        .from("meetings")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id)
        .or(
          `requester_id.eq.${myParticipant.id},recipient_id.eq.${myParticipant.id}`
        )
        .eq("status", "accepted"),
      supabase
        .from("meetings")
        .select(
          `id, scheduled_start, scheduled_end, location, status,
           requester:participants!meetings_requester_id_fkey(profiles!inner(full_name, avatar_url)),
           recipient:participants!meetings_recipient_id_fkey(profiles!inner(full_name, avatar_url))`
        )
        .eq("event_id", id)
        .or(
          `requester_id.eq.${myParticipant.id},recipient_id.eq.${myParticipant.id}`
        )
        .eq("status", "accepted")
        .gte("scheduled_start", new Date().toISOString())
        .order("scheduled_start")
        .limit(3),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id),
      supabase
        .from("participants")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "approved"),
    ]);

  const stats = {
    matches: matchRes.count || 0,
    meetings: meetingRes.count || 0,
    messages: msgRes.count || 0,
    participants: participantCountRes.count || 0,
  };

  const upcomingMeetings = (upcomingRes.data || []) as any[];

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const location =
    event.format === "virtual"
      ? "Virtual"
      : [event.venue_name, event.city, event.country]
          .filter(Boolean)
          .join(", ") || "TBD";

  const basePath = `/dashboard/events/${id}`;

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      {/* Event header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant={
              myParticipant.status === "approved"
                ? "success"
                : myParticipant.status === "pending"
                ? "warning"
                : "secondary"
            }
          >
            {myParticipant.status}
          </Badge>
          {typeName && <Badge variant="outline">{typeName}</Badge>}
        </div>
        <h1 className="text-display tracking-tight">{event.name}</h1>
        <div className="flex items-center gap-4 mt-2 text-caption text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {dateFormatter.format(new Date(event.start_date))}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {stats.participants} participants
          </span>
        </div>
      </div>

      {/* Pending approval notice */}
      {myParticipant.status === "pending" && (
        <Card className="mb-6 border-warning/30 bg-warning/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-warning shrink-0" />
              <div>
                <p className="text-body font-medium">Registration pending approval</p>
                <p className="text-caption text-muted-foreground">
                  The organizer will review your registration. You'll be
                  notified once approved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4 mb-8">
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <Zap className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-h2 font-semibold">{stats.matches}</p>
            <p className="text-caption text-muted-foreground">Matches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-h2 font-semibold">{stats.meetings}</p>
            <p className="text-caption text-muted-foreground">Meetings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <MessageSquare className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-h2 font-semibold">{stats.messages}</p>
            <p className="text-caption text-muted-foreground">Messages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-h2 font-semibold">{stats.participants}</p>
            <p className="text-caption text-muted-foreground">Attendees</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Link href={`${basePath}/matches`}>
          <Card className="group h-full cursor-pointer hover:shadow-md hover:border-border-strong transition-all duration-150">
            <CardContent className="pt-6 pb-5">
              <div className="flex items-center justify-between mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="text-body font-semibold">Discover matches</h3>
              <p className="mt-1 text-caption text-muted-foreground">
                Browse AI-powered recommendations tailored to your profile.
              </p>
            </CardContent>
          </Card>
        </Link>

        {perms.can_book_meetings && (
          <Link href={`${basePath}/meetings`}>
            <Card className="group h-full cursor-pointer hover:shadow-md hover:border-border-strong transition-all duration-150">
              <CardContent className="pt-6 pb-5">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-body font-semibold">Schedule meetings</h3>
                <p className="mt-1 text-caption text-muted-foreground">
                  Book time with your matches and manage your calendar.
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        {perms.can_view_directory && (
          <Link href={`${basePath}/directory`}>
            <Card className="group h-full cursor-pointer hover:shadow-md hover:border-border-strong transition-all duration-150">
              <CardContent className="pt-6 pb-5">
                <div className="flex items-center justify-between mb-2">
                  <Users className="h-5 w-5 text-primary" />
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-body font-semibold">Browse directory</h3>
                <p className="mt-1 text-caption text-muted-foreground">
                  Explore all participants and find people to connect with.
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Upcoming meetings */}
      {upcomingMeetings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h3 font-semibold">Upcoming Meetings</h2>
            <Link
              href={`${basePath}/meetings`}
              className="text-caption text-primary font-medium hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingMeetings.map((meeting: any) => {
              const otherPerson =
                meeting.requester?.profiles?.full_name !==
                undefined
                  ? meeting.requester
                  : meeting.recipient;
              const otherName =
                otherPerson?.profiles?.full_name || "Participant";
              const initials = otherName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <Card key={meeting.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-small font-medium shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-medium truncate">
                          {otherName}
                        </p>
                        <p className="text-caption text-muted-foreground">
                          {timeFormatter.format(
                            new Date(meeting.scheduled_start)
                          )}{" "}
                          {meeting.location && `· ${meeting.location}`}
                        </p>
                      </div>
                      <p className="text-caption text-muted-foreground shrink-0">
                        {dateFormatter.format(
                          new Date(meeting.scheduled_start)
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
