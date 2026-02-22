import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="text-center animate-scale-in">
        <p className="text-display font-bold text-muted-foreground/20">404</p>
        <h1 className="mt-2 text-h1 font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-body text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-8">
          <Link href="/">
            <Button variant="secondary">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
