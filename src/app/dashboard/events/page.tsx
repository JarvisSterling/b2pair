import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Plus, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  draft: "secondary",
  published: "default",
  active: "success",
  completed: "secondary",
  cancelled: "destructive",
};

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let events: any[] = [];

  if (user) {
    // Events I created
    const { data: myEvents } = await supabase
      .from("events")
      .select("*")
      .eq("created_by", user.id)
      .order("start_date", { ascending: false });

    // Events I'm participating in
    const { data: participating } = await supabase
      .from("participants")
      .select("event_id, events!inner(*)")
      .eq("user_id", user.id)
      .neq("events.created_by", user.id);

    const participatingEvents = (participating || []).map((p: any) => p.events);

    // Merge and dedupe
    const seen = new Set<string>();
    for (const e of [...(myEvents || []), ...participatingEvents]) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        events.push(e);
      }
    }

    events.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-body text-muted-foreground">
            Manage your events or browse upcoming ones.
          </p>
        </div>
        <Link href="/dashboard/events/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New event
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center text-center">
              <CalendarDays className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-body text-muted-foreground">No events yet.</p>
              <p className="mt-1 text-caption text-muted-foreground">
                Create your first event to start matching participants.
              </p>
              <Link href="/dashboard/events/new" className="mt-4">
                <Button variant="secondary">
                  <Plus className="mr-2 h-4 w-4" />
                  Create event
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const start = new Date(event.start_date);
            const end = new Date(event.end_date);
            const location = event.format === "virtual"
              ? "Virtual"
              : [event.city, event.country].filter(Boolean).join(", ") || "TBD";

            return (
              <Link key={event.id} href={`/dashboard/events/${event.id}`}>
                <Card className="group h-full cursor-pointer transition-all duration-150 hover:shadow-md hover:border-border-strong">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant={STATUS_VARIANTS[event.status] || "secondary"}>
                        {event.status}
                      </Badge>
                      <span className="text-caption text-muted-foreground capitalize">
                        {event.event_type}
                      </span>
                    </div>

                    <h3 className="text-h3 font-semibold group-hover:text-primary transition-colors">
                      {event.name}
                    </h3>

                    {event.description && (
                      <p className="mt-1 text-caption text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center gap-2 text-caption text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" - "}
                          {end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-caption text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{location}</span>
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
