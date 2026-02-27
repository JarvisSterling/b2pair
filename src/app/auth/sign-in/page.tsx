"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Loader2 } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Enter your email to receive a magic link.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(false);
    alert("Check your email for the magic link!");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-[360px] animate-scale-in">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-foreground">
              <rect width="24" height="24" rx="6" fill="currentColor" />
              <text x="4" y="17" fill="hsl(var(--primary-foreground))" fontSize="12" fontWeight="700" fontFamily="var(--font-geist-sans)">B2</text>
            </svg>
          </div>
          <h1 className="text-h2 tracking-tight">Sign in to B2Pair</h1>
        </div>

        <div className="space-y-4">
          <Button variant="outline" className="w-full h-10 rounded-lg text-[13px]" onClick={handleGoogleSignIn}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-small text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={handleSignIn} className="space-y-3">
            <div>
              <label htmlFor="email" className="text-[13px] font-medium mb-1.5 block">Email Address</label>
              <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 rounded-lg text-[14px] bg-card" required />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-[13px] font-medium">Password</label>
                <Link href="/auth/forgot-password" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Forgot?</Link>
              </div>
              <Input id="password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 rounded-lg text-[14px] bg-card" required />
            </div>

            {error && <p className="text-[13px] text-destructive animate-fade-in">{error}</p>}

            <Button type="submit" className="w-full h-10 rounded-lg text-[13px]" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Continue
            </Button>
          </form>

          <Button variant="ghost" className="w-full text-[13px] text-muted-foreground h-9" onClick={handleMagicLink}>
            Email me a login link
          </Button>
        </div>

        <p className="mt-8 text-center text-[13px] text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/auth/sign-up" className="text-foreground hover:underline">Sign Up</Link>
        </p>
      </div>
    </main>
  );
}
