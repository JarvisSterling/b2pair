import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CalendarDays,
  Zap,
  Users,
  MessageSquare,
  MapPin,
  ArrowRight,
  Search,
} from "lucide-react";
import Link from "next/link";

export default async function ParticipantHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get all events this participant is part of
  const { data: participations } = await supabase
    .from("participants")
    .select(
      `id, status, role, created_at,
       events!inner(id, name, slug, description, start_date, end_date, status, city, country, format, venue_name, page_hero_url)`
    )
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const events = (participations || []).map((p: any) => ({
    ...p.events,
    participantId: p.id,
    participantStatus: p.status,
    participantRole: p.role,
    joinedAt: p.created_at,
  }));

  // Get per-event stats for the latest event
  const latestEvent = events[0];
  let latestStats = { matches: 0, meetings: 0, messages: 0 };

  if (latestEvent) {
    const [matchRes, meetingRes, msgRes] = await Promise.all([
      supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("event_id", latestEvent.id)
        .or(
          `participant_a_id.eq.${latestEvent.participantId},participant_b_id.eq.${latestEvent.participantId}`
        ),
      supabase
        .from("meetings")
        .select("*", { count: "exact", head: true })
        .eq("event_id", latestEvent.id)
        .or(
          `requester_id.eq.${latestEvent.participantId},recipient_id.eq.${latestEvent.participantId}`
        )
        .eq("status", "accepted"),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user!.id),
    ]);

    latestStats = {
      matches: matchRes.count || 0,
      meetings: meetingRes.count || 0,
      messages: msgRes.count || 0,
    };
  }

  const otherEvents = events.slice(1);
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-display tracking-tight">Your Events</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Events you've registered for and your networking activity.
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <CalendarDays className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <h2 className="text-h2 font-semibold mb-2">No events yet</h2>
            <p className="text-body text-muted-foreground max-w-md mx-auto">
              You haven't registered for any events. Look for an event
              invitation link from an organizer to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Latest event - prominent card */}
          {latestEvent && (
            <Link href={`/dashboard/events/${latestEvent.id}`}>
              <Card className="group mb-8 overflow-hidden cursor-pointer hover:shadow-lg hover:border-border-strong transition-all duration-200">
                {latestEvent.page_hero_url && (
                  <div className="h-40 bg-muted overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={latestEvent.page_hero_url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                )}
                <CardContent className={latestEvent.page_hero_url ? "pt-5" : "pt-6"}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      variant={
                        latestEvent.participantStatus === "approved"
                          ? "success"
                          : latestEvent.participantStatus === "pending"
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {latestEvent.participantStatus}
                    </Badge>
                    {latestEvent.participantRole && (
                      <Badge variant="outline">{latestEvent.participantRole}</Badge>
                    )}
                    <span className="text-small text-muted-foreground ml-auto">Latest</span>
                  </div>

                  <h2 className="text-h1 font-semibold tracking-tight group-hover:text-primary transition-colors">
                    {latestEvent.name}
                  </h2>

                  <div className="flex items-center gap-4 mt-2 text-caption text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {dateFormatter.format(new Date(latestEvent.start_date))}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {latestEvent.format === "virtual"
                        ? "Virtual"
                        : [latestEvent.city, latestEvent.country]
                            .filter(Boolean)
                            .join(", ") || "TBD"}
                    </span>
                  </div>

                  {latestEvent.description && (
                    <p className="mt-3 text-body text-muted-foreground line-clamp-2">
                      {latestEvent.description}
                    </p>
                  )}

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-h3 font-semibold">{latestStats.matches}</p>
                        <p className="text-small text-muted-foreground">Matches</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-h3 font-semibold">{latestStats.meetings}</p>
                        <p className="text-small text-muted-foreground">Meetings</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-h3 font-semibold">{latestStats.messages}</p>
                        <p className="text-small text-muted-foreground">Messages</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 text-caption text-primary font-medium">
                    Enter event
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Other events */}
          {otherEvents.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-h3 font-semibold">Other Events</h2>
              </div>

              <div className="space-y-3">
                {otherEvents.map((event: any) => (
                  <Link key={event.id} href={`/dashboard/events/${event.id}`}>
                    <Card className="group cursor-pointer hover:shadow-md hover:border-border-strong transition-all duration-150">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-body font-semibold truncate group-hover:text-primary transition-colors">
                                {event.name}
                              </h3>
                              <Badge
                                variant={
                                  event.participantStatus === "approved"
                                    ? "success"
                                    : event.participantStatus === "pending"
                                    ? "warning"
                                    : "secondary"
                                }
                                className="shrink-0"
                              >
                                {event.participantStatus}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-caption text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {dateFormatter.format(new Date(event.start_date))}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.format === "virtual"
                                  ? "Virtual"
                                  : [event.city, event.country]
                                      .filter(Boolean)
                                      .join(", ") || "TBD"}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
