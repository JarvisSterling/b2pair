import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Users,
  Zap,
  Settings2,
  MessageSquare,
  BarChart3,
  Link2,
  Clock,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { PublishEventButton } from "@/components/events/publish-button";
import { DuplicateEventButton } from "@/components/events/duplicate-button";

interface PageProps {
  params: Promise<{ workspaceId: string; eventId: string }>;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  draft: "secondary",
  published: "default",
  active: "success",
  completed: "secondary",
  cancelled: "destructive",
};

export default async function EventControlPanel({ params }: PageProps) {
  const { workspaceId, eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("organization_id", workspaceId)
    .single();

  if (!event) notFound();

  const { count: participantCount } = await supabase
    .from("participants")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "approved");

  const { count: pendingCount } = await supabase
    .from("participants")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "pending");

  const { count: matchCount } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { count: meetingCount } = await supabase
    .from("meetings")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { count: typeCount } = await supabase
    .from("event_participant_types")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  // Participant breakdown by type
  const { data: typeBreakdown } = await supabase
    .from("event_participant_types")
    .select("id, name, color")
    .eq("event_id", eventId)
    .order("sort_order");

  const breakdownWithCounts = await Promise.all(
    (typeBreakdown || []).map(async (t: any) => {
      const { count } = await supabase
        .from("participants")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("participant_type_id", t.id)
        .eq("status", "approved");
      return { ...t, count: count || 0 };
    })
  );

  // Count participants with no type assigned
  const { count: noTypeCount } = await supabase
    .from("participants")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .is("participant_type_id", null)
    .eq("status", "approved");

  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const location = event.format === "virtual"
    ? "Virtual"
    : [event.venue_name, event.city, event.country].filter(Boolean).join(", ") || "TBD";

  const eventUrl = `/events/${event.slug}`;
  const basePath = `/dashboard/w/${workspaceId}/events/${eventId}`;

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-caption text-muted-foreground mb-4">
        <Link href={`/dashboard/w/${workspaceId}`} className="hover:text-foreground transition-colors">
          Workspace
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{event.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-display tracking-tight">{event.name}</h1>
            <Badge variant={STATUS_VARIANTS[event.status] || "secondary"}>
              {event.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-caption text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {dateFormatter.format(startDate)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {event.status !== "draft" && (
            <Link href={eventUrl} target="_blank">
              <Button variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                View page
              </Button>
            </Link>
          )}
          <DuplicateEventButton eventId={eventId} />
          <PublishEventButton eventId={eventId} currentStatus={event.status} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-5 mb-6">
        <StatCard label="Participants" value={participantCount || 0} />
        <StatCard label="Pending" value={pendingCount || 0} highlight={(pendingCount || 0) > 0} />
        <StatCard label="Types" value={typeCount || 0} />
        <StatCard label="Matches" value={matchCount || 0} />
        <StatCard label="Meetings" value={meetingCount || 0} />
      </div>

      {/* Participant breakdown by type */}
      {breakdownWithCounts.length > 0 && (
        <Card className="mb-8">
          <CardContent className="pt-5 pb-5">
            <p className="text-caption font-medium mb-3">Registration breakdown</p>
            <div className="flex flex-wrap gap-4">
              {breakdownWithCounts.map((t: any) => (
                <div key={t.id} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-caption text-muted-foreground">{t.name}</span>
                  <span className="text-caption font-semibold">{t.count}</span>
                </div>
              ))}
              {(noTypeCount || 0) > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30 shrink-0" />
                  <span className="text-caption text-muted-foreground">Unassigned</span>
                  <span className="text-caption font-semibold">{noTypeCount}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event link */}
      {event.status !== "draft" && (
        <Card className="mb-8">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-caption font-medium">Registration link</p>
                <p className="text-sm text-primary truncate">
                  {eventUrl}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Management cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href={`${basePath}/participants`}>
          <ManageCard
            icon={<Users className="h-5 w-5 text-primary" />}
            title="Participants"
            description="View, approve, and manage registered participants."
            badge={pendingCount ? `${pendingCount} pending` : undefined}
          />
        </Link>

        <Link href={`${basePath}/participant-types`}>
          <ManageCard
            icon={<Users className="h-5 w-5 text-primary" />}
            title="Participant Types"
            description="Define roles like Buyer, Seller, Speaker for registration."
            badge={typeCount ? `${typeCount} types` : undefined}
          />
        </Link>

        <Link href={`${basePath}/matching`}>
          <ManageCard
            icon={<Zap className="h-5 w-5 text-primary" />}
            title="Matching Rules"
            description="Configure the AI matching algorithm weights and filters."
          />
        </Link>

        <Link href={`${basePath}/configure`}>
          <ManageCard
            icon={<Settings2 className="h-5 w-5 text-primary" />}
            title="Configuration"
            description="Event details, registration settings, meeting defaults."
          />
        </Link>

        <Link href={`${basePath}/page-editor`}>
          <ManageCard
            icon={<MessageSquare className="h-5 w-5 text-primary" />}
            title="Page Editor"
            description="Customize your event's public registration page."
          />
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5 text-center">
        <p className={`text-h2 font-semibold ${highlight ? "text-warning" : ""}`}>{value}</p>
        <p className="text-caption text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function ManageCard({
  icon,
  title,
  description,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <Card className="group cursor-pointer hover:shadow-md hover:border-border-strong transition-all duration-150 h-full">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          {icon}
          {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
        </div>
        <h3 className="text-body font-semibold">{title}</h3>
        <p className="mt-1 text-caption text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
