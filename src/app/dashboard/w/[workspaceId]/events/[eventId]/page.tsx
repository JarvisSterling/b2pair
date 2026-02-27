"use client";

import { use, useEffect } from "react";
import useSWR from "swr";
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
  Eye,
  Link2,
} from "lucide-react";
import Link from "next/link";
import { PublishEventButton } from "@/components/events/publish-button";
import { DuplicateEventButton } from "@/components/events/duplicate-button";
import { prefetchEventTabs } from "@/lib/prefetch";

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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function EventControlPanel({ params }: PageProps) {
  const { workspaceId, eventId } = use(params);
  const { data, isLoading } = useSWR(`/api/events/${eventId}/overview`, fetcher);

  // Prefetch all tab data in the background
  useEffect(() => {
    if (eventId) {
      prefetchEventTabs(eventId);
    }
  }, [eventId]);

  if (isLoading || !data?.event) {
    return <EventOverviewSkeleton />;
  }

  const { event, stats, breakdownWithCounts } = data;

  const startDate = new Date(event.start_date);
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
        <StatCard label="Participants" value={stats.participantCount} />
        <StatCard label="Pending" value={stats.pendingCount} highlight={stats.pendingCount > 0} />
        <StatCard label="Types" value={stats.typeCount} />
        <StatCard label="Matches" value={stats.matchCount} />
        <StatCard label="Meetings" value={stats.meetingCount} />
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
              {stats.noTypeCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30 shrink-0" />
                  <span className="text-caption text-muted-foreground">Unassigned</span>
                  <span className="text-caption font-semibold">{stats.noTypeCount}</span>
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
            badge={stats.pendingCount ? `${stats.pendingCount} pending` : undefined}
          />
        </Link>

        <Link href={`${basePath}/participant-types`}>
          <ManageCard
            icon={<Users className="h-5 w-5 text-primary" />}
            title="Participant Types"
            description="Define roles like Buyer, Seller, Speaker for registration."
            badge={stats.typeCount ? `${stats.typeCount} types` : undefined}
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

        <Link href={`/editor/${eventId}`}>
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

function EventOverviewSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-20 rounded bg-surface" />
        <div className="h-4 w-4 rounded bg-surface" />
        <div className="h-4 w-32 rounded bg-surface" />
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-64 rounded bg-surface" />
          <div className="h-5 w-20 rounded-full bg-surface" />
        </div>
        <div className="flex gap-4">
          <div className="h-4 w-36 rounded bg-surface" />
          <div className="h-4 w-28 rounded bg-surface" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-5 mb-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-5 text-center">
              <div className="h-7 w-10 rounded bg-surface mx-auto mb-1" />
              <div className="h-4 w-16 rounded bg-surface mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Management cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-8">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-5 w-5 rounded bg-surface mb-3" />
              <div className="h-4 w-28 rounded bg-surface mb-2" />
              <div className="h-3 w-full rounded bg-surface" />
            </CardContent>
          </Card>
        ))}
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
