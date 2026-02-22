import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-h1 font-semibold tracking-tight">Notifications</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Stay updated on matches, meetings, and event activity.
        </p>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center text-center">
            <Bell className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-body text-muted-foreground">
              All caught up!
            </p>
            <p className="mt-1 text-caption text-muted-foreground">
              You'll see notifications here when something needs your attention.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
