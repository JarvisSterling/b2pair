export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Clock,
  Calendar,
  MapPin,
  ArrowRight,
  Sparkles,
  Users,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function RegisteredPage({ params }: PageProps) {
  const { slug } = await params;
  const admin = createAdminClient();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/events/${slug}`);

  // Get event
  const { data: event } = await admin
    .from("events")
    .select("id, name, slug, start_date, end_date, city, country, format, venue_name, description")
    .eq("slug", slug)
    .single();

  if (!event) redirect(`/events/${slug}`);

  // Get participant record
  const { data: participant } = await admin
    .from("participants")
    .select("id, status, participant_type_id")
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .single();

  if (!participant) redirect(`/events/${slug}`);

  // Get type name if applicable
  let typeName: string | null = null;
  if (participant.participant_type_id) {
    const { data: pType } = await admin
      .from("event_participant_types")
      .select("name")
      .eq("id", participant.participant_type_id)
      .single();
    if (pType) typeName = pType.name;
  }

  // Get participant count
  const { count } = await admin
    .from("participants")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("status", "approved");

  const isPending = participant.status === "pending";

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const location =
    event.format === "virtual"
      ? "Virtual Event"
      : [event.venue_name, event.city, event.country]
          .filter(Boolean)
          .join(", ") || "TBD";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Status icon */}
        <div className="text-center mb-8">
          <div
            className={`inline-flex h-16 w-16 items-center justify-center rounded-full mb-4 ${
              isPending
                ? "bg-warning/10"
                : "bg-emerald-500/10"
            }`}
          >
            {isPending ? (
              <Clock className="h-8 w-8 text-warning" />
            ) : (
              <Check className="h-8 w-8 text-emerald-500" />
            )}
          </div>
          <h1 className="text-display tracking-tight">
            {isPending ? "Registration Pending" : "You're In!"}
          </h1>
          <p className="mt-2 text-body text-muted-foreground max-w-md mx-auto">
            {isPending
              ? "Your registration is awaiting organizer approval. You'll be notified once approved."
              : "You've successfully registered. Get ready to connect with fellow participants."}
          </p>
        </div>

        {/* Event card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant={isPending ? "warning" : "success"}>
                {isPending ? "Pending Approval" : "Confirmed"}
              </Badge>
              {typeName && <Badge variant="outline">{typeName}</Badge>}
            </div>
            <h2 className="text-h2 font-semibold mb-3">{event.name}</h2>
            <div className="space-y-2 text-caption text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {dateFormatter.format(new Date(event.start_date))}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {location}
              </div>
              {count !== null && (
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  {count} participants registered
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* What's next */}
        {!isPending && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="text-body font-semibold mb-4">What's next?</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-body font-medium">Complete your profile</p>
                    <p className="text-caption text-muted-foreground">
                      Add your bio, expertise, and interests to get better matches.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="text-body font-medium">Discover matches</p>
                    <p className="text-caption text-muted-foreground">
                      Our AI will suggest participants you should connect with.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-body font-medium">Schedule meetings</p>
                    <p className="text-caption text-muted-foreground">
                      Set your availability and book meetings with your matches.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <Link href={`/dashboard/events/${event.id}`}>
          <Button className="w-full" size="lg">
            {isPending ? "View Registration Status" : "Go to Event Dashboard"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>

        <div className="text-center mt-4">
          <Link
            href={`/events/${slug}`}
            className="text-caption text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to event page
          </Link>
        </div>
      </div>
    </div>
  );
}
