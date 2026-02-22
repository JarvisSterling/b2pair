import { Card, CardContent } from "@/components/ui/card";
import { Zap } from "lucide-react";

export default function MatchesPage() {
  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-h1 font-semibold tracking-tight">Matches</h1>
        <p className="mt-1 text-body text-muted-foreground">
          AI-powered recommendations based on your profile and interests.
        </p>
      </div>

      <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center text-center">
            <Zap className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-body text-muted-foreground">
              No matches yet.
            </p>
            <p className="mt-1 text-caption text-muted-foreground">
              Join an event to see your personalized match recommendations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
