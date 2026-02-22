import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Zap, Users, MessageSquare } from "lucide-react";
import Link from "next/link";

export default async function ParticipantDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: participations } = await supabase
    .from("participants")
    .select("id, status, events!inner(id, name, start_date, end_date, status, city, country, format)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const { count: matchCount } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .or(`participant_a_id.in.(${(participations || []).map(p => p.id).join(",")}),participant_b_id.in.(${(participations || []).map(p => p.id).join(",")})`)
    .eq("status", "accepted");

  const { count: meetingCount } = await supabase
    .from("meetings")
    .select("*", { count: "exact", head: true })
    .or(`requester_id.in.(${(participations || []).map(p => p.id).join(",")}),recipient_id.in.(${(participations || []).map(p => p.id).join(",")})`)
    .eq("status", "accepted");

  const events = (participations || []).map((p: any) => ({ ...p.events, participantStatus: p.status }));

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-h1 font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Your events and networking overview.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-h2 font-semibold">{events.length}</p>
                <p className="text-caption text-muted-foreground">Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-h2 font-semibold">{matchCount || 0}</p>
                <p className="text-caption text-muted-foreground">Connections</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-h2 font-semibold">{meetingCount || 0}</p>
                <p className="text-caption text-muted-foreground">Meetings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-h2 font-semibold">0</p>
                <p className="text-caption text-muted-foreground">Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events */}
      <h2 className="text-h2 font-semibold mb-4">Your Events</h2>
      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-body text-muted-foreground">No events yet.</p>
            <p className="text-caption text-muted-foreground mt-1">
              Register for events to start networking.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event: any) => (
            <Link key={event.id} href={`/dashboard/events/${event.id}`}>
              <Card className="group h-full cursor-pointer transition-all duration-150 hover:shadow-md hover:border-border-strong">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={event.participantStatus === "approved" ? "default" : "warning"}>
                      {event.participantStatus}
                    </Badge>
                  </div>
                  <h3 className="text-body font-semibold group-hover:text-primary transition-colors">
                    {event.name}
                  </h3>
                  <p className="text-caption text-muted-foreground mt-1">
                    {new Date(event.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
