"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Check, UserPlus, ArrowRight } from "lucide-react";

interface Props {
  eventId: string;
  eventSlug: string;
  isRegistered: boolean;
  isLoggedIn: boolean;
  requiresApproval: boolean;
  participantTypes: {
    id: string;
    name: string;
    color: string;
    description: string;
  }[];
}

export function RegisterButton({
  eventId,
  eventSlug,
  isRegistered: initiallyRegistered,
  isLoggedIn,
  requiresApproval,
  participantTypes,
}: Props) {
  const [step, setStep] = useState<"idle" | "type" | "auth" | "done">("idle");
  const [selectedType, setSelectedType] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLogin, setIsLogin] = useState(false);
  const [registered, setRegistered] = useState(initiallyRegistered);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [registeredEventId, setRegisteredEventId] = useState(eventId);
  const router = useRouter();

  if (registered && step !== "done") {
    return (
      <div className="space-y-3">
        <Button size="lg" disabled className="gap-2 text-base px-8 bg-emerald-600 text-white hover:bg-emerald-600">
          <Check className="h-5 w-5" />
          Already Registered
        </Button>
        <div>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  function handleStart() {
    if (participantTypes.length > 0) {
      setStep("type");
    } else if (isLoggedIn) {
      submitRegistration("signin", "", "");
    } else {
      setStep("auth");
    }
  }

  function handleTypeSelected() {
    if (!selectedType && participantTypes.length > 0) return;
    if (isLoggedIn) {
      submitRegistration("signin", "", "");
    } else {
      setStep("auth");
    }
  }

  async function submitRegistration(
    mode: "signup" | "signin",
    emailOverride?: string,
    passwordOverride?: string
  ) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/events/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          participantTypeId: selectedType || null,
          mode,
          email: emailOverride || email,
          password: passwordOverride || password,
          fullName: fullName.trim(),
          title: title.trim(),
          companyName: companyName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.alreadyRegistered) {
          setRegistered(true);
        }
        setError(data.error);
        setLoading(false);
        return;
      }

      setPendingApproval(data.requiresApproval);

      // If profile is incomplete, redirect to complete-profile then confirmation
      if (data.needsProfile) {
        router.push(
          `/dashboard/complete-profile?redirect=/events/${eventSlug}/registered`
        );
        return;
      }

      // Redirect to confirmation page
      router.push(`/events/${eventSlug}/registered`);
    } catch {
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  }

  function handleAuthSubmit() {
    if (isLogin) {
      if (!email || !password) {
        setError("Email and password are required");
        return;
      }
      submitRegistration("signin");
    } else {
      if (!fullName.trim()) {
        setError("Full name is required");
        return;
      }
      if (!email || !password) {
        setError("Email and password are required");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      submitRegistration("signup");
    }
  }

  if (step === "done") {
    return (
      <div className="space-y-3">
        <Button
          size="lg"
          disabled
          className="gap-2 text-base px-8 bg-emerald-600 text-white hover:bg-emerald-600"
        >
          <Check className="h-5 w-5" />
          {pendingApproval
            ? "Registration Pending Approval"
            : "Successfully Registered!"}
        </Button>
        <p className="text-sm text-muted-foreground">
          {pendingApproval
            ? "The organizer will review your registration. You'll be notified once approved."
            : "You can now access your event dashboard."}
        </p>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
        >
          Go to Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {step === "idle" && (
        <Button
          size="lg"
          onClick={handleStart}
          className="gap-2 text-base px-8"
        >
          <UserPlus className="h-5 w-5" />
          Register Now
        </Button>
      )}

      {step === "type" && (
        <Card className="max-w-md mx-auto text-left bg-white text-zinc-900">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-1">Select your role</h3>
            <p className="text-sm text-zinc-500 mb-4">
              How will you participate?
            </p>

            <div className="space-y-2 mb-4">
              {participantTypes.map((pt) => (
                <button
                  key={pt.id}
                  onClick={() => setSelectedType(pt.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-all ${
                    selectedType === pt.id
                      ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/10"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: pt.color }}
                    />
                    <span className="font-medium text-sm">{pt.name}</span>
                  </div>
                  {pt.description && (
                    <p className="text-xs text-zinc-500 mt-1 ml-5">
                      {pt.description}
                    </p>
                  )}
                </button>
              ))}
            </div>

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <Button
              onClick={handleTypeSelected}
              disabled={!selectedType}
              className="w-full"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "auth" && (
        <Card className="max-w-md mx-auto text-left bg-white text-zinc-900">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-1">
              {isLogin ? "Sign in to register" : "Create your account"}
            </h3>
            <p className="text-sm text-zinc-500 mb-4">
              {isLogin
                ? "Welcome back! Sign in to register for this event."
                : "Quick registration to join this event."}
            </p>

            <div className="space-y-3">
              {!isLogin && (
                <>
                  <Input
                    placeholder="Full name *"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Job title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                    <Input
                      placeholder="Company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                </>
              )}
              <Input
                type="email"
                placeholder="Email address *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password *"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button
                onClick={handleAuthSubmit}
                disabled={loading}
                className="w-full"
              >
                {loading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isLogin
                  ? "Sign in & Register"
                  : "Create Account & Register"}
              </Button>

              <p className="text-center text-xs text-zinc-500">
                {isLogin
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                  }}
                  className="underline font-medium text-zinc-900"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
