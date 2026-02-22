import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Users,
  Zap,
  Settings2,
  Share2,
  Globe,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { DuplicateEventButton } from "@/components/events/duplicate-button";
import { PublishEventButton } from "@/components/events/publish-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  draft: "secondary",
  published: "default",
  active: "success",
  completed: "secondary",
  cancelled: "destructive",
};

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (!event) {
    notFound();
  }

  const { count: participantCount } = await supabase
    .from("participants")
    .select("*", { count: "exact", head: true })
    .eq("event_id", id)
    .eq("status", "approved");

  const { count: pendingCount } = await supabase
    .from("participants")
    .select("*", { count: "exact", head: true })
    .eq("event_id", id)
    .eq("status", "pending");

  const { count: meetingCount } = await supabase
    .from("meetings")
    .select("*", { count: "exact", head: true })
    .eq("event_id", id);

  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-display tracking-tight">{event.name}</h1>
            <Badge variant={STATUS_VARIANTS[event.status] || "secondary"}>
              {event.status}
            </Badge>
          </div>
          {event.description && (
            <p className="text-body text-muted-foreground max-w-2xl">
              {event.description}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <DuplicateEventButton eventId={id} />
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Link href={`/dashboard/events/${id}/settings`}>
            <Button variant="outline" size="sm">
              <Settings2 className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
          <PublishEventButton eventId={id} currentStatus={event.status} />
        </div>
      </div>

      {/* Event Info */}
      <div className="grid gap-3 sm:grid-cols-3 mb-8">
        <div className="flex items-center gap-3 rounded-md border border-border p-4">
          <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-caption font-medium">Date</p>
            <p className="text-small text-muted-foreground">
              {dateFormatter.format(startDate)}
            </p>
            <p className="text-small text-muted-foreground">
              to {dateFormatter.format(endDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-border p-4">
          <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-caption font-medium">Location</p>
            <p className="text-small text-muted-foreground">
              {event.format === "virtual"
                ? "Virtual event"
                : [event.venue_name, event.city, event.country].filter(Boolean).join(", ") || "TBD"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-border p-4">
          <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-caption font-medium">Meetings</p>
            <p className="text-small text-muted-foreground">
              {event.meeting_duration_minutes}min, {event.break_between_meetings}min break
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <StatCard label="Participants" value={String(participantCount || 0)} />
        <StatCard
          label="Pending"
          value={String(pendingCount || 0)}
          highlight={pendingCount ? pendingCount > 0 : false}
        />
        <StatCard label="Meetings" value={String(meetingCount || 0)} />
        <StatCard label="Match Rate" value="—" />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href={`/dashboard/events/${id}/participants`}>
          <Card className="group cursor-pointer hover:shadow-md hover:border-border-strong transition-all duration-150">
            <CardContent className="pt-6">
              <Users className="mb-3 h-5 w-5 text-primary" />
              <h3 className="text-h3 font-semibold">Manage participants</h3>
              <p className="mt-1 text-caption text-muted-foreground">
                Invite, approve, and manage event participants.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/dashboard/events/${id}/matching`}>
          <Card className="group cursor-pointer hover:shadow-md hover:border-border-strong transition-all duration-150">
            <CardContent className="pt-6">
              <Zap className="mb-3 h-5 w-5 text-primary" />
              <h3 className="text-h3 font-semibold">Matching rules</h3>
              <p className="mt-1 text-caption text-muted-foreground">
                Configure the AI matching algorithm for this event.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/dashboard/events/${id}/participant-types`}>
          <Card className="group cursor-pointer hover:shadow-md hover:border-border-strong transition-all duration-150">
            <CardContent className="pt-6">
              <Users className="mb-3 h-5 w-5 text-primary" />
              <h3 className="text-h3 font-semibold">Participant types</h3>
              <p className="mt-1 text-caption text-muted-foreground">
                Define roles like Buyer, Seller, Speaker for registration.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/dashboard/events/${id}/analytics`}>
          <Card className="group cursor-pointer hover:shadow-md hover:border-border-strong transition-all duration-150">
            <CardContent className="pt-6">
              <Settings2 className="mb-3 h-5 w-5 text-primary" />
              <h3 className="text-h3 font-semibold">Analytics</h3>
              <p className="mt-1 text-caption text-muted-foreground">
                View engagement metrics and meeting statistics.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-caption text-muted-foreground">{label}</p>
        <p className={`mt-1 text-h1 font-semibold tracking-tight ${highlight ? "text-warning" : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
