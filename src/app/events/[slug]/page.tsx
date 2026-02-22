export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { RegisterButton } from "@/components/events/register-button";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicEventPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .in("status", ["published", "active"])
    .single();

  if (!event) {
    notFound();
  }

  // Get participant types
  const { data: participantTypes } = await supabase
    .from("event_participant_types")
    .select("*")
    .eq("event_id", event.id)
    .order("sort_order");

  // Get participant count
  const { count } = await supabase
    .from("participants")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("status", "approved");

  // Get current user's registration status
  const { data: { user } } = await supabase.auth.getUser();
  let isRegistered = false;
  if (user) {
    const { data: existing } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .limit(1)
      .single();
    isRegistered = !!existing;
  }

  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const location = event.format === "virtual"
    ? "Virtual Event"
    : [event.venue_name, event.city, event.country].filter(Boolean).join(", ") || "TBD";

  const sections = (event.page_sections || []) as { type: string; title: string; content: string }[];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div
        className="relative bg-gradient-to-br from-zinc-900 to-zinc-800 text-white"
        style={event.page_hero_url ? { backgroundImage: `url(${event.page_hero_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
      >
        {event.page_hero_url && <div className="absolute inset-0 bg-black/60" />}
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          <Badge className="mb-4 bg-white/10 text-white border-white/20">
            {event.event_type}
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            {event.name}
          </h1>
          {event.description && (
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
              {event.description}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/70 mb-8">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {dateFormatter.format(startDate)}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {location}
            </span>
            {count !== null && count > 0 && (
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {count} participants
              </span>
            )}
          </div>

          <RegisterButton
            eventId={event.id}
            eventSlug={slug}
            isRegistered={isRegistered}
            isLoggedIn={!!user}
            requiresApproval={event.requires_approval}
            participantTypes={(participantTypes || []) as any[]}
          />
        </div>
      </div>

      {/* Event details */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid gap-4 sm:grid-cols-3 mb-12">
          <Card>
            <CardContent className="pt-6 flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-caption font-medium">Date &amp; Time</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {dateFormatter.format(startDate)}
                </p>
                <p className="text-sm text-muted-foreground">
                  to {dateFormatter.format(endDate)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-caption font-medium">Location</p>
                <p className="text-sm text-muted-foreground mt-1">{location}</p>
                {event.format === "hybrid" && (
                  <p className="text-sm text-muted-foreground">+ Virtual attendance available</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-caption font-medium">Meetings</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {event.meeting_duration_minutes} min sessions
                </p>
                <p className="text-sm text-muted-foreground">
                  AI-powered matchmaking
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Custom sections */}
        {sections.map((section, i) => (
          <div key={i} className="mb-12">
            <h2 className="text-h2 font-semibold mb-4">{section.title}</h2>
            <div className="prose prose-zinc max-w-none">
              <p className="text-body text-muted-foreground whitespace-pre-wrap">{section.content}</p>
            </div>
          </div>
        ))}

        {/* Participant types */}
        {participantTypes && participantTypes.length > 0 && (
          <div className="mb-12">
            <h2 className="text-h2 font-semibold mb-4">Who should attend?</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {participantTypes.map((pt: any) => (
                <Card key={pt.id}>
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: pt.color }}
                      />
                      <h3 className="text-body font-semibold">{pt.name}</h3>
                    </div>
                    {pt.description && (
                      <p className="text-caption text-muted-foreground">{pt.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <p className="text-caption text-muted-foreground">
            Powered by <span className="font-semibold text-foreground">B2Pair</span>
          </p>
        </div>
      </div>
    </div>
  );
}
