"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Check } from "lucide-react";

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
    <main className="flex min-h-screen items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-[360px] animate-scale-in">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-foreground">
              <rect width="24" height="24" rx="6" fill="currentColor" />
              <text x="4" y="17" fill="hsl(var(--primary-foreground))" fontSize="12" fontWeight="700" fontFamily="var(--font-geist-sans)">B2</text>
            </svg>
          </div>
          <h1 className="text-h2 tracking-tight">Reset your password</h1>
          <p className="mt-2 text-body text-muted-foreground">
            {sent ? "Check your email for a reset link." : "Enter your email to receive a reset link."}
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-6 animate-fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface border border-border">
              <Check className="h-5 w-5 text-success" />
            </div>
            <p className="text-center text-body text-muted-foreground">
              Sent to <span className="font-medium text-foreground">{email}</span>
            </p>
            <Button variant="ghost" size="sm" className="text-[13px]" onClick={() => setSent(false)}>
              Try a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-3">
            <div>
              <label htmlFor="email" className="text-[13px] font-medium mb-1.5 block">Email Address</label>
              <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 rounded-lg text-[14px] bg-card" required />
            </div>

            {error && <p className="text-[13px] text-destructive animate-fade-in">{error}</p>}

            <Button type="submit" className="w-full h-10 rounded-lg text-[13px]" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send Reset Link
            </Button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link href="/auth/sign-in" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
