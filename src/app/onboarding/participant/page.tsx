"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const INTENTS = [
  { key: "buying", label: "Buy / Source", emoji: "🛒", desc: "Find products or services" },
  { key: "selling", label: "Sell / Promote", emoji: "💼", desc: "Showcase your offerings" },
  { key: "investing", label: "Invest", emoji: "📈", desc: "Discover opportunities" },
  { key: "partnering", label: "Partner", emoji: "🤝", desc: "Find strategic partners" },
  { key: "learning", label: "Learn", emoji: "🎓", desc: "Gain knowledge & insights" },
  { key: "networking", label: "Network", emoji: "🌐", desc: "Expand your connections" },
];

export default function ParticipantOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState("");
  const [offering, setOffering] = useState("");

  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/sign-in"); return; }

      // Get company membership to auto-fill company name and find event
      const { data: memberships } = await supabase
        .from("company_members")
        .select("company_id, companies(id, name, event_id, events(id, name, slug))")
        .eq("user_id", user.id)
        .eq("invite_status", "accepted")
        .limit(1);

      if (memberships && memberships.length > 0) {
        const m = memberships[0] as any;
        setCompanyName(m.companies?.name || "");
        setCompanyId(m.company_id);
        if (m.companies?.events) {
          setEventId(m.companies.events.id);
          setEventName(m.companies.events.name);
        }
      }

      // Pre-fill title from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("title")
        .eq("id", user.id)
        .single();
      if (profile?.title) setTitle(profile.title);

      setLoading(false);
    }
    init();
  }, []);

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/sign-in"); return; }

      // Update profile: mark onboarding complete, set as participant
      await supabase.from("profiles").update({
        platform_role: "participant",
        title: title.trim() || null,
        company_name: companyName.trim() || null,
        onboarding_completed: true,
      }).eq("id", user.id);

      // Register as participant for the event if not already
      if (eventId) {
        // Use the dedicated participant registration endpoint
        const res = await fetch("/api/events/register-participant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            title: title.trim(),
            companyName: companyName.trim(),
            intents: selectedIntents,
            lookingFor: lookingFor.trim(),
            offering: offering.trim(),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          if (!data.alreadyRegistered) {
            setError(data.error || "Failed to register");
            setSaving(false);
            return;
          }
        }

        router.push(`/dashboard/events/${eventId}`);
      } else {
        router.push("/dashboard/home");
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Complete your participant profile</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {eventName
              ? `Set up your networking profile for ${eventName}.`
              : "Set up your networking profile to start connecting with others."}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
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
                disabled
              />
              <p className="text-[10px] text-muted-foreground mt-1">Auto-filled from your company profile</p>
            </div>

            {/* Intent multi-select */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                What are you looking to do at this event?
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Select up to 3 that apply. This helps us find better matches for you.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {INTENTS.map((intent) => {
                  const selected = selectedIntents.includes(intent.key);
                  return (
                    <button
                      key={intent.key}
                      type="button"
                      onClick={() => {
                        setSelectedIntents((prev) =>
                          selected
                            ? prev.filter((i) => i !== intent.key)
                            : prev.length < 3
                            ? [...prev, intent.key]
                            : prev
                        );
                      }}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-all",
                        selected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/30",
                        !selected && selectedIntents.length >= 3 && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{intent.emoji}</span>
                        <span className="font-medium text-sm">{intent.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 ml-7">{intent.desc}</p>
                    </button>
                  );
                })}
              </div>
              {selectedIntents.length >= 3 && (
                <p className="text-xs text-muted-foreground mt-2">Maximum 3 selections.</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">What are you looking for?</label>
              <Input
                value={lookingFor}
                onChange={(e) => setLookingFor(e.target.value)}
                placeholder="e.g. Packaging suppliers in Europe, AI solutions for HR..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">What do you offer?</label>
              <Input
                value={offering}
                onChange={(e) => setOffering(e.target.value)}
                placeholder="e.g. Cloud-based logistics platform, B2B consulting..."
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button onClick={handleSubmit} disabled={saving} className="w-full" size="lg">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Complete & Go to Dashboard
            </Button>
          </CardContent>
        </Card>

        {companyId && (
          <div className="text-center mt-4">
            <button
              onClick={() => router.push(`/dashboard/company/${companyId}`)}
              className="text-caption text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to company dashboard
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
