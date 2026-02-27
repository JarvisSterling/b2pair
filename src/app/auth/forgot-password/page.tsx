"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Mail, ArrowLeft, Loader2, Check } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="absolute inset-0 dot-pattern opacity-20" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/8 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-sm animate-scale-in">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary text-white text-small font-bold">
              B2
            </div>
            <span className="text-h2 font-bold tracking-tight">B2Pair</span>
          </Link>
          <h1 className="text-h1 font-bold tracking-tight">Reset password</h1>
          <p className="mt-2 text-body text-muted-foreground">
            {sent ? "Check your email for a reset link" : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        <Card className="glow-card border-border">
          <CardContent className="pt-6">
            {sent ? (
              <div className="flex flex-col items-center gap-4 py-4 animate-fade-in">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <Check className="h-6 w-6 text-success" />
                </div>
                <p className="text-center text-body text-muted-foreground">
                  We sent a password reset link to{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
                <Button variant="ghost" className="mt-2" onClick={() => setSent(false)}>
                  Try a different email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-caption font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>

                {error && <p className="text-caption text-destructive animate-fade-in">{error}</p>}

                <Button type="submit" className="w-full gradient-primary text-white border-0 shadow-lg shadow-primary/20" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Send reset link
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="justify-center pb-6">
            <Link href="/auth/sign-in" className="inline-flex items-center gap-1 text-caption text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
