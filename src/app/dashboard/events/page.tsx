import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus } from "lucide-react";
import Link from "next/link";

export default function EventsPage() {
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

      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center text-center">
            <CalendarDays className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-body text-muted-foreground">
              No events yet.
            </p>
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
    </div>
  );
}
