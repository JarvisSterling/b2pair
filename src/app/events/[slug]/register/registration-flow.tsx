"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Check,
  Eye,
  EyeOff,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RegistrationFlowProps {
  event: {
    id: string;
    name: string;
    slug: string;
    start_date: string;
    end_date: string;
    banner_url: string | null;
    requires_approval: boolean;
  };
  participantTypes: {
    id: string;
    name: string;
    color: string;
    description: string;
  }[];
  isLoggedIn: boolean;
  alreadyRegistered: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function RegistrationFlow({
  event,
  participantTypes,
  isLoggedIn,
  alreadyRegistered,
}: RegistrationFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const startAsLogin = searchParams.get("mode") === "signin";
  const [currentStep, setCurrentStep] = useState<1 | 2>(alreadyRegistered ? 2 : isLoggedIn ? 2 : 1);
  const [isLogin, setIsLogin] = useState(startAsLogin);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2 state
  const [selectedType, setSelectedType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");

  const dateRange = `${formatDate(event.start_date)} – ${formatDate(event.end_date)}`;

  async function handleGoogleAuth() {
    const redirectUrl = `${window.location.origin}/auth/callback?next=/events/${event.slug}/register`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl },
    });
  }

  async function handleLinkedInAuth() {
    const redirectUrl = `${window.location.origin}/auth/callback?next=/events/${event.slug}/register`;
    await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: { redirectTo: redirectUrl },
    });
  }

  async function handleStep1Submit() {
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }

    if (isLogin) {
      // Sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      setCurrentStep(2);
    } else {
      // Sign up
      if (!firstName.trim() || !lastName.trim()) {
        setError("First and last name are required");
        setLoading(false);
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        setLoading(false);
        return;
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      const res = await fetch("/api/events/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          mode: "signup",
          email,
          password,
          fullName,
          participantTypeId: null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes("already exists")) {
          setError("An account with this email already exists. Try signing in instead.");
          setIsLogin(true);
        } else {
          setError(data.error);
        }
        setLoading(false);
        return;
      }

      // Sign in after signup
      await supabase.auth.signInWithPassword({ email, password });
      setCurrentStep(2);
    }

    setLoading(false);
  }

  async function handleStep2Submit() {
    setLoading(true);
    setError(null);

    try {
      // If not already registered (sign-in flow), register now
      if (isLogin && !alreadyRegistered) {
        const res = await fetch("/api/events/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: event.id,
            mode: "signin",
            email,
            password,
            participantTypeId: selectedType || null,
          }),
        });
        const data = await res.json();
        if (!res.ok && !data.alreadyRegistered) {
          setError(data.error);
          setLoading(false);
          return;
        }
      } else if (!isLogin && selectedType) {
        // Update participant type if signup already created it without type
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const supabaseAdmin = await fetch("/api/events/update-participant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventId: event.id,
              participantTypeId: selectedType,
              title: title.trim(),
              companyName: companyName.trim(),
            }),
          });
        }
      }

      // Update profile with additional info
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({
          title: title.trim() || undefined,
          company_name: companyName.trim() || undefined,
        }).eq("id", user.id);

        // Update participant type
        if (selectedType) {
          const res = await fetch("/api/events/update-participant-type", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventId: event.id,
              participantTypeId: selectedType,
            }),
          });
        }
      }

      router.push(`/events/${event.slug}/registered`);
    } catch {
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  }

  if (alreadyRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold">Already Registered</h1>
          <p className="text-muted-foreground">You&apos;re already registered for {event.name}.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push(`/events/${event.slug}`)}>
              Back to Event
            </Button>
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left sidebar */}
      <div className="w-[320px] shrink-0 border-r bg-muted/30 p-8 flex flex-col">
        {/* Event info */}
        <div className="mb-10">
          {event.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.banner_url}
              alt={event.name}
              className="w-full h-32 object-cover rounded-xl mb-4"
            />
          ) : (
            <div className="w-full h-32 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4" />
          )}
          <Link
            href={`/events/${event.slug}`}
            className="text-lg font-semibold hover:text-primary transition-colors"
          >
            {event.name} →
          </Link>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {dateRange}
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          <StepIndicator
            stepNumber={1}
            label="Create an account"
            active={currentStep === 1}
            completed={currentStep > 1}
          />
          <StepIndicator
            stepNumber={2}
            label="Complete your profile"
            active={currentStep === 2}
            completed={false}
          />
        </div>

        <div className="mt-auto">
          <Link
            href={`/events/${event.slug}`}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Cancel registration
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-start justify-center pt-16 px-8">
          <div className="w-full max-w-lg">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {isLogin ? "Sign in" : "Create new Account"}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isLogin ? "Don't have an account? " : "or "}
                    <button
                      onClick={() => { setIsLogin(!isLogin); setError(null); }}
                      className="underline font-medium text-foreground"
                    >
                      {isLogin ? "Create one" : "log in"}
                    </button>
                    {isLogin ? "" : " with your existing B2Pair account"}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Your email address</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Password</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isLogin ? "Your password" : "At least 8 characters"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {!isLogin && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">First name *</label>
                        <Input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Last name *</label>
                        <Input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
                    or
                  </span>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleLinkedInAuth}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm font-medium"
                  >
                    <svg className="h-5 w-5 text-[#0077B5]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    Continue with LinkedIn
                  </button>

                  <button
                    onClick={handleGoogleAuth}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm font-medium"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </button>
                </div>

                {!isLogin && (
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input type="checkbox" className="rounded mt-0.5" />
                      <span>I want to receive email recommendations for similar events I might be interested in.</span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input type="checkbox" className="rounded mt-0.5" defaultChecked />
                      <span>
                        By signing up, I agree to B2Pair&apos;s{" "}
                        <a href="/terms" className="underline text-foreground">terms of service</a> and{" "}
                        <a href="/privacy" className="underline text-foreground">privacy policy</a>.
                      </span>
                    </label>
                  </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Complete your profile</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tell us a bit about yourself so we can find the best matches for you.
                  </p>
                </div>

                {participantTypes.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">I am participating as</label>
                    <div className="space-y-2">
                      {participantTypes.map((pt) => (
                        <button
                          key={pt.id}
                          onClick={() => setSelectedType(pt.id)}
                          className={cn(
                            "w-full rounded-lg border p-3 text-left transition-all",
                            selectedType === pt.id
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: pt.color }}
                            />
                            <span className="font-medium text-sm">{pt.name}</span>
                          </div>
                          {pt.description && (
                            <p className="text-xs text-muted-foreground mt-1 ml-5">
                              {pt.description}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Job title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Product Manager"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Company</label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Inc."
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t px-8 py-4 flex items-center justify-end">
          <Button
            onClick={currentStep === 1 ? handleStep1Submit : handleStep2Submit}
            disabled={loading}
            size="lg"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({
  stepNumber,
  label,
  active,
  completed,
}: {
  stepNumber: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
          completed
            ? "bg-primary border-primary text-primary-foreground"
            : active
            ? "border-primary text-primary"
            : "border-border text-muted-foreground"
        )}
      >
        {completed ? <Check className="h-4 w-4" /> : stepNumber}
      </div>
      <span
        className={cn(
          "text-sm",
          active || completed ? "font-medium text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}
