"use client";

import { use, useEffect } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarDays, MapPin, Users, Settings } from "lucide-react";
import Link from "next/link";
import { prefetchEventOverviews } from "@/lib/prefetch";

interface PageProps {
  params: Promise<{ workspaceId: string }>;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  draft: "secondary",
  published: "default",
  active: "success",
  completed: "secondary",
  cancelled: "destructive",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function WorkspacePage({ params }: PageProps) {
  const { workspaceId } = use(params);
  const { data, isLoading } = useSWR(`/api/workspaces/${workspaceId}`, fetcher);

  // Prefetch all event overview data in the background
  useEffect(() => {
    if (data?.events?.length > 0) {
      prefetchEventOverviews(data.events.map((e: any) => e.id));
    }
  }, [data?.events]);

  if (isLoading || !data?.workspace) {
    return <WorkspaceSkeleton />;
  }

  const { workspace, events, participantCounts } = data;

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      {/* Workspace header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-foreground font-bold">
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-h1 font-semibold tracking-tight">{workspace.name}</h1>
              <p className="text-caption text-muted-foreground">
                {events.length} event{events.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/w/${workspaceId}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
          <Link href={`/dashboard/w/${workspaceId}/events/new`}>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New event
            </Button>
          </Link>
        </div>
      </div>

      {/* Events grid */}
      {events.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center text-center">
              <CalendarDays className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-body text-muted-foreground">No events yet.</p>
              <p className="mt-1 text-caption text-muted-foreground">
                Create your first event to start connecting participants.
              </p>
              <Link href={`/dashboard/w/${workspaceId}/events/new`} className="mt-4">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create event
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event: any) => {
            const start = new Date(event.start_date);
            const location = event.format === "virtual"
              ? "Virtual"
              : [event.city, event.country].filter(Boolean).join(", ") || "TBD";

            return (
              <Link key={event.id} href={`/dashboard/w/${workspaceId}/events/${event.id}`}>
                <Card className="group h-full cursor-pointer transition-all duration-150 hover:shadow-md hover:border-border-strong">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant={STATUS_VARIANTS[event.status] || "secondary"}>
                        {event.status}
                      </Badge>
                      {event.visibility === "unlisted" && (
                        <Badge variant="outline" className="text-[10px]">Unlisted</Badge>
                      )}
                    </div>

                    <h3 className="text-body font-semibold group-hover:text-foreground transition-colors">
                      {event.name}
                    </h3>

                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-caption text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        <span>{start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-caption text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-caption text-muted-foreground">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span>{participantCounts[event.id] || 0} participants</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-surface" />
          <div>
            <div className="h-8 w-40 rounded bg-surface mb-1" />
            <div className="h-4 w-20 rounded bg-surface" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded bg-surface" />
          <div className="h-9 w-28 rounded bg-surface" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-5 w-20 rounded-full bg-surface mb-3" />
              <div className="h-4 w-40 rounded bg-surface mb-3" />
              <div className="space-y-2">
                <div className="h-3 w-32 rounded bg-surface" />
                <div className="h-3 w-24 rounded bg-surface" />
                <div className="h-3 w-28 rounded bg-surface" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
