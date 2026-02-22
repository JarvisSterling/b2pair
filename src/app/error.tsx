"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="text-center animate-scale-in">
        <p className="text-display font-bold text-muted-foreground/20">Error</p>
        <h1 className="mt-2 text-h1 font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-body text-muted-foreground max-w-md mx-auto">
          An unexpected error occurred. Please try again.
        </p>
        <div className="mt-8">
          <Button onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    </main>
  );
}
