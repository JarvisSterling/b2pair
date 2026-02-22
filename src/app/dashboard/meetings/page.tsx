import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function MeetingsPage() {
  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-h1 font-semibold tracking-tight">Meetings</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Your scheduled meetings and meeting requests.
        </p>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center text-center">
            <Users className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-body text-muted-foreground">
              No meetings scheduled.
            </p>
            <p className="mt-1 text-caption text-muted-foreground">
              When you connect with a match, you can schedule meetings here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
