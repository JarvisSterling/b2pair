import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, Zap } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-display tracking-tight">
          Welcome, {firstName}
        </h1>
        <p className="mt-2 text-body text-muted-foreground">
          Here's what's happening across your events.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <QuickActionCard
          icon={<Plus className="h-5 w-5" />}
          title="Create an event"
          description="Set up a new networking event and start inviting participants."
          href="/dashboard/events/new"
        />
        <QuickActionCard
          icon={<Users className="h-5 w-5" />}
          title="Browse events"
          description="Discover upcoming events and register as a participant."
          href="/dashboard/events"
        />
        <QuickActionCard
          icon={<Zap className="h-5 w-5" />}
          title="View matches"
          description="See your AI-powered match recommendations."
          href="/dashboard/matches"
        />
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Active Events" value="0" />
        <StatCard label="Total Meetings" value="0" />
        <StatCard label="Connections Made" value="0" />
        <StatCard label="Match Score Avg" value="—" />
      </div>

      {/* Upcoming Meetings */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming meetings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-body text-muted-foreground">
              No upcoming meetings yet.
            </p>
            <p className="mt-1 text-caption text-muted-foreground">
              Join an event and start connecting with matches.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickActionCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="group cursor-pointer hover:shadow-md hover:border-border-strong transition-all duration-150">
        <CardContent className="pt-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors duration-150">
            {icon}
          </div>
          <h3 className="text-h3 font-semibold">{title}</h3>
          <p className="mt-1 text-caption text-muted-foreground">
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-caption text-muted-foreground">{label}</p>
        <p className="mt-1 text-h1 font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
