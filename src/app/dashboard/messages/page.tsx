import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-h1 font-semibold tracking-tight">Messages</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Direct conversations with your connections.
        </p>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center text-center">
            <MessageSquare className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-body text-muted-foreground">
              No messages yet.
            </p>
            <p className="mt-1 text-caption text-muted-foreground">
              Start a conversation with one of your matches.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
