"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MatchQualityMeter } from "@/components/match-quality-meter";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const INTENTS = [
  { key: "buying", label: "Buy / Source", desc: "Find products or services" },
  { key: "selling", label: "Sell / Promote", desc: "Showcase your offerings" },
  { key: "investing", label: "Invest", desc: "Discover opportunities" },
  { key: "partnering", label: "Partner", desc: "Find strategic partners" },
  { key: "learning", label: "Learn", desc: "Gain knowledge & insights" },
  { key: "networking", label: "Network", desc: "Expand your connections" },
];

const COMPANY_SIZES = [
  { value: "1-10", label: "1–10" },
  { value: "11-50", label: "11–50" },
  { value: "51-200", label: "51–200" },
  { value: "201-1000", label: "201–1,000" },
  { value: "1000+", label: "1,000+" },
];

const EXPERTISE_AREAS = [
  "Software Development", "Product Management", "Sales & BD", "Marketing",
  "Design & UX", "Data & Analytics", "Operations", "Finance & Accounting",
  "Human Resources", "Strategy", "Supply Chain", "Customer Success",
  "Engineering", "Research", "Legal & Compliance", "AI & Machine Learning",
];

const INTEREST_OPTIONS = [
  "Sustainability", "Digital Transformation", "Growth Strategy",
  "International Expansion", "Innovation & R&D", "Talent Acquisition",
  "Fundraising", "Market Research", "Brand Building",
  "Process Automation", "Cybersecurity", "E-commerce",
];

export default function ParticipantOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0); // 0 = Step 2, 1 = Step 3

  // Step 2 fields
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState("");
  const [offering, setOffering] = useState("");

  // Step 3 fields
  const [companySize, setCompanySize] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/sign-in"); return; }

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

      const { data: profile } = await supabase
        .from("profiles")
        .select("title, company_size, company_website, expertise_areas, interests")
        .eq("id", user.id)
        .single();
      if (profile?.title) setTitle(profile.title);
      if (profile?.company_size) setCompanySize(profile.company_size);
      if (profile?.company_website) setCompanyWebsite(profile.company_website);
      if (profile?.expertise_areas?.length) setExpertiseAreas(profile.expertise_areas);
      if (profile?.interests?.length) setInterests(profile.interests);

      setLoading(false);
    }
    init();
  }, []);

  const canProceedStep2 = title.trim() && companyName.trim() && selectedIntents.length > 0;

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
      }
    } catch {
      // Silently fail
    }
    setSuggesting(false);
  }

  function toggleArrayItem(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    item: string
  ) {
    setter((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  async function handleSubmit() {
    if (!canProceedStep2) return;
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/sign-in"); return; }

      await supabase.from("profiles").update({
        platform_role: "participant",
        title: title.trim() || null,
        company_name: companyName.trim() || null,
        company_size: companySize || null,
        company_website: companyWebsite.trim() || null,
        expertise_areas: expertiseAreas,
        interests: interests,
        onboarding_completed: true,
      }).eq("id", user.id);

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
        {/* Step indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            {[0, 1].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all",
                    step < currentStep
                      ? "bg-primary text-primary-foreground"
                      : step === currentStep
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {step < currentStep ? <Check className="h-4 w-4" /> : step + 2}
                </div>
                {step < 1 && (
                  <div className={cn("mx-3 h-px w-16", step < currentStep ? "bg-primary" : "bg-border")} />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Step {currentStep + 2} of 3: {currentStep === 0 ? "Your Profile" : "Enhance Your Matches"}
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

        {/* ── STEP 2: Profile Basics ── */}
        {currentStep === 0 && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Complete your profile</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {eventName
                    ? `Set up your networking profile for ${eventName}.`
                    : "Set up your networking profile to start connecting."}
                </p>
              </div>

              {/* Required fields */}
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                  Required
                </p>

                <div className="space-y-3">
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

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      What are you here for? <span className="text-destructive">*</span>
                    </label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Select up to 3. This helps us find the right people for you.
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
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
                              "rounded-lg border px-2.5 py-2 text-left transition-all",
                              selected
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                : "border-border hover:border-primary/30",
                              !selected && selectedIntents.length >= 3 && "opacity-40 cursor-not-allowed"
                            )}
                          >
                            <span className="font-medium text-xs">{intent.label}</span>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{intent.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                    {selectedIntents.length >= 3 && (
                      <p className="text-xs text-muted-foreground mt-1">Maximum 3 selections.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Optional fields */}
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Optional
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  These fields are optional but strongly improve your match quality.
                </p>

                {selectedIntents.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSuggest}
                    disabled={suggesting}
                    className="w-full text-xs mb-3"
                  >
                    {suggesting ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                    )}
                    Suggest for me
                  </Button>
                )}

                <div className="space-y-3">
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
                </div>
              </div>

              {/* Why we collect this */}
              <div className="flex items-start gap-2.5 rounded-lg bg-muted/50 border border-border p-3">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  We use this information to match you with the right people at the event. The more you share, the better your matches will be.
                </p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center justify-end pt-2">
                <Button
                  onClick={() => { if (canProceedStep2) setCurrentStep(1); }}
                  disabled={!canProceedStep2}
                  size="lg"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 3: Company Details + Expertise ── */}
        {currentStep === 1 && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Enhance your matches</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  A few more details to help our matching engine connect you with the best people.
                </p>
              </div>

              <div className="space-y-4">
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

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Your expertise</label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Select areas you specialize in. This powers our matching algorithm.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EXPERTISE_AREAS.map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => toggleArrayItem(setExpertiseAreas, area)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition-all",
                          expertiseAreas.includes(area)
                            ? "border-primary bg-primary/5 text-primary font-medium"
                            : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
                        )}
                      >
                        {expertiseAreas.includes(area) && <Check className="mr-1 inline h-3 w-3" />}
                        {area}
                      </button>
                    ))}
                  </div>
                  {expertiseAreas.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">{expertiseAreas.length} selected</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Your interests</label>
                  <p className="text-xs text-muted-foreground mb-3">
                    What topics are you looking to explore or learn more about?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem(setInterests, item)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs transition-all",
                          interests.includes(item)
                            ? "border-primary/50 bg-primary/5 text-primary font-medium"
                            : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
                        )}
                      >
                        {interests.includes(item) && <Check className="mr-1 inline h-3 w-3" />}
                        {item}
                      </button>
                    ))}
                  </div>
                  {interests.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">{interests.length} selected</p>
                  )}
                </div>
              </div>

              {/* Why we collect this */}
              <div className="flex items-start gap-2.5 rounded-lg bg-muted/50 border border-border p-3">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  We collect this information to give you the best possible experience and match you with the right people at the event. All data is used exclusively for matching purposes.
                </p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setCurrentStep(0)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleSubmit} disabled={saving}>
                    Skip & finish
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving} size="lg">
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Complete & Go to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
