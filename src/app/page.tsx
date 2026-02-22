import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="mx-auto max-w-2xl text-center animate-fade-in">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-caption text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Coming soon
        </div>

        <h1 className="text-display tracking-tight text-foreground">
          Connect the right people
          <br />
          at your events
        </h1>

        <p className="mt-6 text-body text-muted-foreground leading-relaxed max-w-lg mx-auto">
          AI-powered matchmaking that understands what your attendees need
          and connects them with the people who matter most.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg">
            Get started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="secondary" size="lg">
            Learn more
          </Button>
        </div>
      </div>
    </main>
  );
}
