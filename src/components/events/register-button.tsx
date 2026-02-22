"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  participantTypes: { id: string; name: string; color: string; description: string }[];
}

export function RegisterButton({
  eventId,
  eventSlug,
  isRegistered,
  isLoggedIn,
  requiresApproval,
  participantTypes,
}: Props) {
  const [step, setStep] = useState<"idle" | "type" | "auth" | "profile" | "done">("idle");
  const [selectedType, setSelectedType] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLogin, setIsLogin] = useState(false);
  const router = useRouter();

  if (isRegistered) {
    return (
      <Button size="lg" disabled className="gap-2 text-base px-8">
        <Check className="h-5 w-5" />
        Already Registered
      </Button>
    );
  }

  async function handleRegister() {
    if (step === "idle") {
      if (participantTypes.length > 0) {
        setStep("type");
      } else if (!isLoggedIn) {
        setStep("auth");
      } else {
        await completeRegistration();
      }
      return;
    }

    if (step === "type") {
      if (!selectedType && participantTypes.length > 0) return;
      if (!isLoggedIn) {
        setStep("auth");
      } else {
        await completeRegistration();
      }
      return;
    }

    if (step === "auth") {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }
        setStep("profile");
        setLoading(false);
        // Check if profile exists
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, onboarding_completed")
            .eq("id", user.id)
            .single();
          if (profile?.onboarding_completed) {
            await completeRegistration();
            return;
          }
        }
      } else {
        if (!fullName.trim()) {
          setError("Full name is required");
          setLoading(false);
          return;
        }
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }
        // Update profile
        if (signUpData.user) {
          await supabase.from("profiles").update({
            full_name: fullName,
            title: title || null,
            company_name: companyName || null,
            platform_role: "participant",
            onboarding_completed: true,
          }).eq("id", signUpData.user.id);
        }
        setLoading(false);
        await completeRegistration();
      }
      return;
    }

    if (step === "profile") {
      await completeRegistration();
    }
  }

  async function completeRegistration() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("Please sign in first");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("participants").insert({
      event_id: eventId,
      user_id: user.id,
      status: requiresApproval ? "pending" : "approved",
      role: "attendee",
      participant_type_id: selectedType || null,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("You are already registered for this event.");
      } else {
        setError(insertError.message);
      }
      setLoading(false);
      return;
    }

    setStep("done");
    setLoading(false);
  }

  if (step === "done") {
    return (
      <div className="space-y-3">
        <Button size="lg" disabled className="gap-2 text-base px-8 bg-emerald-600">
          <Check className="h-5 w-5" />
          {requiresApproval ? "Registration Pending Approval" : "Successfully Registered!"}
        </Button>
        <p className="text-sm text-white/60">
          {requiresApproval
            ? "The organizer will review your registration."
            : "You can now access the event dashboard."}
        </p>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="text-white border-white/20 hover:bg-white/10"
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
          onClick={handleRegister}
          className="gap-2 text-base px-8 bg-white text-zinc-900 hover:bg-white/90"
        >
          <UserPlus className="h-5 w-5" />
          Register Now
        </Button>
      )}

      {step === "type" && (
        <Card className="max-w-md mx-auto text-left bg-white text-zinc-900">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-1">Select your role</h3>
            <p className="text-sm text-zinc-500 mb-4">How will you participate?</p>

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
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: pt.color }} />
                    <span className="font-medium text-sm">{pt.name}</span>
                  </div>
                  {pt.description && (
                    <p className="text-xs text-zinc-500 mt-1 ml-5">{pt.description}</p>
                  )}
                </button>
              ))}
            </div>

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <Button onClick={handleRegister} disabled={!selectedType} className="w-full">
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
              {isLogin ? "Welcome back!" : "Quick registration to join this event."}
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

              <Button onClick={handleRegister} disabled={loading} className="w-full">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isLogin ? "Sign in & Register" : "Create Account & Register"}
              </Button>

              <p className="text-center text-xs text-zinc-500">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => { setIsLogin(!isLogin); setError(null); }}
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
