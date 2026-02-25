"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MatchQualityMeter } from "@/components/match-quality-meter";
import {
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Building2,
  Briefcase,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InviteData {
  member: { id: string; email: string; name: string; role: string };
  company: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    capabilities: string[];
    website: string | null;
    company_size: string | null;
  };
  event: { id: string; name: string; slug: string; logo_url: string | null } | null;
}

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

export default function TeamMemberInvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"auth" | "profile" | "enhance" | "done">("auth");
  const [user, setUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Auth
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Profile (Step 2)
  const [title, setTitle] = useState("");
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState("");
  const [offering, setOffering] = useState("");

  // Enhance (Step 3) — only show fields admin didn't fill
  const [companySize, setCompanySize] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  const [eventSlug, setEventSlug] = useState<string | null>(null);

  const loadInvite = useCallback(async () => {
    try {
      const res = await fetch(`/api/partners/invite/${code}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Invalid invite");
        setLoading(false);
        return;
      }
      setData(json);
      // Pre-fill from invite data
      const nameParts = (json.member.name || "").split(" ");
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(" ") || "");
      setAuthEmail(json.member.email);
      if (json.event?.slug) setEventSlug(json.event.slug);
      // Pre-fill company data from admin
      if (json.company.company_size) setCompanySize(json.company.company_size);
      if (json.company.website) setCompanyWebsite(json.company.website);
    } catch {
      setError("Failed to load invite");
    }
    setLoading(false);
  }, [code]);

  useEffect(() => { loadInvite(); }, [loadInvite]);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setStep("profile");
      }
    }
    checkAuth();
  }, []);

  const companyName = data?.company.name || "";
  const adminFilledSize = !!data?.company.company_size;
  const adminFilledWebsite = !!data?.company.website;
  const canProceedProfile = title.trim() && selectedIntents.length > 0;

  // Check if Step 3 has anything to show
  const hasStep3Content = !adminFilledSize || !adminFilledWebsite || true; // always show for expertise/interests

  function toggleArrayItem(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    item: string
  ) {
    setter((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  async function handleSuggest() {
    if (selectedIntents.length === 0) return;
    setSuggesting(true);
    try {
      const res = await fetch("/api/participants/suggest-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          companyName,
          intents: selectedIntents,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.lookingFor && !lookingFor.trim()) setLookingFor(d.lookingFor);
        if (d.offering && !offering.trim()) setOffering(d.offering);
      }
    } catch {}
    setSuggesting(false);
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAuthError(null);
    const supabase = createClient();

    if (authMode === "signup") {
      if (!firstName.trim() || !lastName.trim()) {
        setAuthError("First and last name are required");
        setSaving(false);
        return;
      }
      if (password.length < 8) {
        setAuthError("Password must be at least 8 characters");
        setSaving(false);
        return;
      }
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) { setAuthError(error.message); setSaving(false); return; }
      setUser(signUpData.user);
    } else {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });
      if (error) { setAuthError(error.message); setSaving(false); return; }
      setUser(signInData.user);
    }

    setStep("profile");
    setSaving(false);
  }

  async function handleComplete() {
    setSaving(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    const res = await fetch(`/api/partners/invite/${code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName || user?.user_metadata?.full_name,
        title: title.trim(),
        intents: selectedIntents,
        looking_for: lookingFor.trim(),
        offering: offering.trim(),
        expertise_areas: expertiseAreas,
        user_interests: interests,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      setSaving(false);
      return;
    }

    setStep("done");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && step !== "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h1 className="text-lg font-semibold mb-2">Oops</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const roleLabels: Record<string, string> = {
    admin: "Company Admin",
    manager: "Manager",
    representative: "Representative",
    scanner: "Lead Scanner",
    speaker: "Speaker",
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Company header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            {data.company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.company.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover border" />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-lg font-bold">
                {data.company.name[0]}
              </div>
            )}
          </div>
          <h1 className="text-xl font-semibold">Join {data.company.name}</h1>
          {data.event && (
            <p className="text-xs text-muted-foreground mt-1">at {data.event.name}</p>
          )}
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="outline" className="text-[10px]">{roleLabels[data.member.role] || data.member.role}</Badge>
            {data.company.capabilities.map((cap) => (
              <Badge key={cap} variant="secondary" className="text-[10px] capitalize">{cap}</Badge>
            ))}
          </div>
        </div>

        {/* Step indicator (shown after auth) */}
        {step !== "auth" && step !== "done" && (
          <div className="mb-4">
            <div className="flex gap-1.5">
              {["profile", "enhance"].map((s, i) => (
                <div key={s} className={cn("h-1 flex-1 rounded-full", 
                  s === step || (step === "enhance" && s === "profile") ? "bg-primary" : "bg-border"
                )} />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Step {step === "profile" ? 2 : 3} of 3: {step === "profile" ? "Your Profile" : "Enhance Your Matches"}
            </p>
          </div>
        )}

        {/* Match Quality Meter (shown in profile/enhance steps) */}
        {(step === "profile" || step === "enhance") && (
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
        )}

        {/* ── STEP 1: AUTH ── */}
        {step === "auth" && (
          <Card>
            <CardContent className="pt-6 pb-6">
              <h2 className="text-base font-semibold mb-1 text-center">
                {authMode === "signup" ? "Create your account" : "Sign in"}
              </h2>
              <p className="text-xs text-muted-foreground mb-5 text-center">
                {authMode === "signup"
                  ? `Create an account to join ${data.company.name}`
                  : "Sign in with your existing B2Pair account"}
              </p>
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === "signup" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">First name <span className="text-destructive">*</span></label>
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Last name <span className="text-destructive">*</span></label>
                      <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email</label>
                  <Input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} type="email" disabled />
                  <p className="text-[10px] text-muted-foreground mt-1">Pre-filled from your invite</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Password</label>
                  <div className="relative">
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder={authMode === "signup" ? "At least 8 characters" : "Your password"}
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
                {authError && <p className="text-sm text-destructive">{authError}</p>}
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  {authMode === "signup" ? "Create Account & Continue" : "Sign In & Continue"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {authMode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
                  <button type="button" className="text-primary font-medium" onClick={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}>
                    {authMode === "signup" ? "Sign in" : "Sign up"}
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 2: PROFILE ── */}
        {step === "profile" && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Complete your profile</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Set up your networking profile for {data.event?.name || "the event"}.
                </p>
              </div>

              {/* Required */}
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
                      placeholder="e.g. Sales Director"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Company</label>
                    <Input value={companyName} disabled />
                    <p className="text-[10px] text-muted-foreground mt-1">Pre-filled from your company profile</p>
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

              {/* Optional */}
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
                      placeholder="e.g. Enterprise clients, partnership opportunities..."
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

              <div className="flex items-center justify-end pt-2">
                <Button
                  onClick={() => { if (canProceedProfile) setStep("enhance"); }}
                  disabled={!canProceedProfile}
                  size="lg"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 3: ENHANCE ── */}
        {step === "enhance" && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Enhance your matches</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  A few more details to help our matching engine connect you with the best people.
                </p>
              </div>

              <div className="space-y-4">
                {/* Only show company size/website if admin didn't fill them */}
                {(!adminFilledSize || !adminFilledWebsite) && (
                  <div className="grid grid-cols-2 gap-3">
                    {!adminFilledSize && (
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
                    )}
                    {!adminFilledWebsite && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Company website</label>
                        <Input
                          value={companyWebsite}
                          onChange={(e) => setCompanyWebsite(e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Expertise */}
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

                {/* Interests */}
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

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep("profile")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleComplete} disabled={saving}>
                    Skip & finish
                  </Button>
                  <Button onClick={handleComplete} disabled={saving} size="lg">
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Complete & Join
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── DONE ── */}
        {step === "done" && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">You&apos;re in!</h2>
              <p className="text-sm text-muted-foreground mb-1">
                You&apos;ve joined <span className="font-medium text-foreground">{data.company.name}</span> as a {roleLabels[data.member.role]?.toLowerCase() || data.member.role}.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                You&apos;re now part of the attendee pool and can be matched with other participants.
              </p>
              <div className="space-y-2">
                {eventSlug && (
                  <Button className="w-full" onClick={() => router.push(`/events/${eventSlug}`)}>
                    <Building2 className="mr-2 h-4 w-4" />
                    View Event
                  </Button>
                )}
                <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard")}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
