"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MatchQualityMeter } from "@/components/match-quality-meter";
import { Loader2, ArrowRight, Check, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const INTENTS = [
  { key: "buying", label: "Buy / Source", emoji: "🛒", desc: "Find products or services" },
  { key: "selling", label: "Sell / Promote", emoji: "💼", desc: "Showcase your offerings" },
  { key: "investing", label: "Invest", emoji: "📈", desc: "Discover opportunities" },
  { key: "partnering", label: "Partner", emoji: "🤝", desc: "Find strategic partners" },
  { key: "learning", label: "Learn", emoji: "🎓", desc: "Gain knowledge & insights" },
  { key: "networking", label: "Network", emoji: "🌐", desc: "Expand your connections" },
];

const COMPANY_SIZES = [
  { value: "1-10", label: "1–10" },
  { value: "11-50", label: "11–50" },
  { value: "51-200", label: "51–200" },
  { value: "201-1000", label: "201–1,000" },
  { value: "1000+", label: "1,000+" },
];

export default function ParticipantOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Required fields
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);

  // Optional fields
  const [lookingFor, setLookingFor] = useState("");
  const [offering, setOffering] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [showOptional, setShowOptional] = useState(true);

  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/sign-in"); return; }

      // Get company membership via API (bypasses RLS)
      const res = await fetch("/api/user/companies");
      const json = await res.json();
      const companies = json.memberships || [];

      if (companies.length > 0) {
        const c = companies[0];
        setCompanyName(c.company_name || "");
        setCompanyId(c.company_id);
        if (c.event_id) {
          setEventId(c.event_id);
          setEventName(c.event_name || "");
        }
      }

      // Pre-fill from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("title, company_size, company_website")
        .eq("id", user.id)
        .single();
      if (profile?.title) setTitle(profile.title);
      if (profile?.company_size) setCompanySize(profile.company_size);
      if (profile?.company_website) setCompanyWebsite(profile.company_website);

      setLoading(false);
    }
    init();
  }, []);

  const canSubmit = title.trim() && companyName.trim() && selectedIntents.length > 0;

  async function handleSuggest() {
    if (selectedIntents.length === 0) return;
    setSuggesting(true);
    try {
      const res = await fetch("/api/participants/suggest-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          companyName: companyName.trim(),
          intents: selectedIntents,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.lookingFor && !lookingFor.trim()) setLookingFor(data.lookingFor);
        if (data.offering && !offering.trim()) setOffering(data.offering);
        // Open the optional section if it's collapsed
        setShowOptional(true);
      }
    } catch {
      // Silently fail — it's a nice-to-have
    }
    setSuggesting(false);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/sign-in"); return; }

      // Update profile
      await supabase.from("profiles").update({
        platform_role: "participant",
        title: title.trim() || null,
        company_name: companyName.trim() || null,
        company_size: companySize || null,
        company_website: companyWebsite.trim() || null,
        onboarding_completed: true,
      }).eq("id", user.id);

      // Register as participant for the event
      if (eventId) {
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
            companySize: companySize || null,
            companyWebsite: companyWebsite.trim() || null,
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
          <h1 className="text-2xl font-bold tracking-tight">Set up your networking profile</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {eventName
              ? `Join ${eventName} and start connecting.`
              : "Set up your profile to start connecting with others."}
          </p>
        </div>

        {/* Match Quality Meter */}
        <div className="mb-4">
          <MatchQualityMeter
            title={title}
            companyName={companyName}
            intents={selectedIntents}
            lookingFor={lookingFor}
            offering={offering}
            companySize={companySize}
            companyWebsite={companyWebsite}
          />
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* ── Required Section ── */}
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-4">
                Required
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Job title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Product Manager"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Company <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Inc."
                    disabled={!!companyId}
                  />
                  {companyId && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Auto-filled from your company profile
                    </p>
                  )}
                </div>

                {/* Intent multi-select */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    What are you here for? <span className="text-destructive">*</span>
                  </label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Select up to 3. This helps us find the right people for you.
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
              </div>
            </div>

            {/* ── Optional / Recommended Section ── */}
            <div className="border-t border-border pt-5">
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="flex items-center justify-between w-full text-left group"
              >
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Recommended
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Improve your match quality. You can always add these later.
                  </p>
                </div>
                {showOptional ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {showOptional && (
                <div className="space-y-4 mt-4">
                  {/* AI Suggestion button */}
                  {selectedIntents.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSuggest}
                      disabled={suggesting}
                      className="w-full text-xs"
                    >
                      {suggesting ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-3.5 w-3.5" />
                      )}
                      Suggest for me
                    </Button>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">What are you looking for?</label>
                    <Textarea
                      value={lookingFor}
                      onChange={(e) => setLookingFor(e.target.value)}
                      placeholder="e.g. Packaging suppliers in Europe, AI solutions for HR..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">What do you offer?</label>
                    <Textarea
                      value={offering}
                      onChange={(e) => setOffering(e.target.value)}
                      placeholder="e.g. Cloud-based logistics platform, B2B consulting..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Company size</label>
                      <select
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                        className="flex w-full rounded bg-input px-4 py-2.5 text-sm text-foreground border border-border transition-colors duration-150 hover:border-border-strong focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/20"
                      >
                        <option value="">Select...</option>
                        {COMPANY_SIZES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label} employees</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Company website</label>
                      <Input
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              onClick={handleSubmit}
              disabled={saving || !canSubmit}
              className="w-full"
              size="lg"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {lookingFor.trim() || offering.trim()
                ? "Complete & Go to Dashboard"
                : "Register & Complete Profile Later"}
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
