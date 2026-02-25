"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Check,
  Upload,
  ArrowRight,
  ArrowLeft,
  Building2,
  Palette,
  FileText,
  Crown,
  ShoppingBag,
  Users,
  Send,
  AlertCircle,
  Plus,
  X,
  Image as ImageIcon,
} from "lucide-react";

interface OnboardData {
  member: { id: string; email: string; name: string; role: string };
  company: {
    id: string;
    name: string;
    slug: string;
    capabilities: string[];
    status: string;
    logo_url: string | null;
    banner_url: string | null;
    description_short: string | null;
    description_long: string | null;
    website: string | null;
    industry: string | null;
    hq_location: string | null;
    brand_colors: { primary?: string; secondary?: string };
    sponsor_profile: any;
    exhibitor_profile: any;
  };
  event: { id: string; name: string; slug: string; banner_url: string | null; logo_url: string | null };
}

type WizardStep = "auth" | "brand" | "profile" | "sponsor" | "exhibitor" | "team" | "review";

export default function OnboardWizardPage() {
  const params = useParams();
  const slug = params.slug as string;
  const code = params.code as string;

  const [data, setData] = useState<OnboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<WizardStep>("auth");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Auth form
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [authForm, setAuthForm] = useState({ full_name: "", email: "", password: "" });
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Company form state
  const [logo, setLogo] = useState("");
  const [banner, setBanner] = useState("");
  const [brandPrimary, setBrandPrimary] = useState("#6366f1");
  const [brandSecondary, setBrandSecondary] = useState("#f59e0b");
  const [descShort, setDescShort] = useState("");
  const [descLong, setDescLong] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [hqLocation, setHqLocation] = useState("");

  // Sponsor form
  const [tagline, setTagline] = useState("");
  const [ctaButtons, setCtaButtons] = useState<{ label: string; url: string; style: string }[]>([]);
  const [downloadables, setDownloadables] = useState<{ name: string; url: string; type: string }[]>([]);
  const [promoVideo, setPromoVideo] = useState("");

  // Exhibitor form
  const [boothNumber, setBoothNumber] = useState("");
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<{ name: string; description: string; image_url: string; demo_url: string }[]>([]);
  const [resources, setResources] = useState<{ name: string; url: string; type: string }[]>([]);

  // Team invites
  const [teamInvites, setTeamInvites] = useState<{ email: string; name: string; role: string }[]>([]);

  // Event ID resolved from invite data
  const [eventId, setEventId] = useState<string | null>(null);

  const loadInvite = useCallback(async () => {
    try {
      const res = await fetch(`/api/partners/onboard/${code}`);
      const json = await res.json();
      if (!res.ok) {
        if (json.alreadyAccepted) {
          setError("This invite has already been used. Please sign in to continue onboarding.");
        } else {
          setError(json.error || "Invalid invite");
        }
        setLoading(false);
        return;
      }
      setData(json);
      if (json.event?.id) setEventId(json.event.id);
      setAuthForm((f) => ({ ...f, email: json.member.email, full_name: json.member.name || "" }));

      // Pre-fill form from existing data
      const c = json.company;
      if (c.logo_url) setLogo(c.logo_url);
      if (c.banner_url) setBanner(c.banner_url);
      if (c.brand_colors?.primary) setBrandPrimary(c.brand_colors.primary);
      if (c.brand_colors?.secondary) setBrandSecondary(c.brand_colors.secondary);
      if (c.description_short) setDescShort(c.description_short);
      if (c.description_long) setDescLong(c.description_long);
      if (c.website) setWebsite(c.website);
      if (c.industry) setIndustry(c.industry);
      if (c.hq_location) setHqLocation(c.hq_location);

      if (c.sponsor_profile) {
        if (c.sponsor_profile.tagline) setTagline(c.sponsor_profile.tagline);
        if (c.sponsor_profile.cta_buttons?.length) setCtaButtons(c.sponsor_profile.cta_buttons);
        if (c.sponsor_profile.downloadables?.length) setDownloadables(c.sponsor_profile.downloadables);
        if (c.sponsor_profile.promo_video_url) setPromoVideo(c.sponsor_profile.promo_video_url);
      }

      if (c.exhibitor_profile) {
        if (c.exhibitor_profile.booth_number) setBoothNumber(c.exhibitor_profile.booth_number);
        if (c.exhibitor_profile.product_categories?.length) setProductCategories(c.exhibitor_profile.product_categories);
        if (c.exhibitor_profile.products?.length) setProducts(c.exhibitor_profile.products);
        if (c.exhibitor_profile.resources?.length) setResources(c.exhibitor_profile.resources);
      }
    } catch {
      setError("Failed to load invite");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    loadInvite();
  }, [loadInvite]);

  // Check if user is already logged in
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setStep("brand");
      }
    }
    checkAuth();
  }, []);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    const supabase = createClient();

    if (authMode === "signup") {
      if (!authForm.full_name.trim()) {
        setAuthError("Full name is required");
        setAuthLoading(false);
        return;
      }
      if (authForm.password.length < 8) {
        setAuthError("Password must be at least 8 characters");
        setAuthLoading(false);
        return;
      }
      // Use server-side account creation (auto-confirms, consistent with registration flow)
      const res = await fetch("/api/auth/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
          fullName: authForm.full_name,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setAuthError(result.error || "Failed to create account");
        setAuthLoading(false);
        return;
      }
      // Sign in to get client session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: authForm.email,
        password: authForm.password,
      });
      if (signInError) { setAuthError(signInError.message); setAuthLoading(false); return; }
      setUser(signInData.user);
    } else {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: authForm.email,
        password: authForm.password,
      });
      if (error) { setAuthError(error.message); setAuthLoading(false); return; }
      setUser(signInData.user);
    }

    // Accept invite and start onboarding
    await fetch(`/api/partners/onboard/${code}`, { method: "POST" });

    setStep("brand");
    setAuthLoading(false);
  }

  async function saveProgress() {
    setSaving(true);

    await fetch(`/api/partners/onboard/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: {
          logo_url: logo || null,
          banner_url: banner || null,
          brand_colors: { primary: brandPrimary, secondary: brandSecondary },
          description_short: descShort || null,
          description_long: descLong || null,
          website: website || null,
          industry: industry || null,
          hq_location: hqLocation || null,
        },
        sponsor_profile: data?.company.capabilities.includes("sponsor") ? {
          tagline: tagline || null,
          cta_buttons: ctaButtons,
          downloadables,
          promo_video_url: promoVideo || null,
        } : undefined,
        exhibitor_profile: data?.company.capabilities.includes("exhibitor") ? {
          booth_number: boothNumber || null,
          product_categories: productCategories,
          products,
          resources,
        } : undefined,
      }),
    });

    setSaving(false);
  }

  async function handleSubmit() {
    setSaving(true);
    setSubmitError(null);
    setMissingFields([]);

    // Save first
    await saveProgress();

    // Then submit
    const res = await fetch(`/api/partners/onboard/${code}/submit`, {
      method: "POST",
    });
    const json = await res.json();

    if (!res.ok) {
      setSubmitError(json.error);
      setMissingFields(json.missing || []);
      setSaving(false);
      return;
    }

    // Send team invites
    for (const invite of teamInvites) {
      if (invite.email) {
        await fetch(`/api/companies/${data?.company.id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invite),
        });
      }
    }

    setSaving(false);
    setStep("done" as WizardStep);
  }

  // Build steps array based on capabilities
  function getSteps(): { key: WizardStep; label: string; icon: any }[] {
    const steps: { key: WizardStep; label: string; icon: any }[] = [
      { key: "brand", label: "Brand Assets", icon: Palette },
      { key: "profile", label: "Company Profile", icon: Building2 },
    ];
    if (data?.company.capabilities.includes("sponsor")) {
      steps.push({ key: "sponsor", label: "Sponsor Setup", icon: Crown });
    }
    if (data?.company.capabilities.includes("exhibitor")) {
      steps.push({ key: "exhibitor", label: "Exhibitor Setup", icon: ShoppingBag });
    }
    steps.push({ key: "team", label: "Team", icon: Users });
    steps.push({ key: "review", label: "Review & Submit", icon: Send });
    return steps;
  }

  function nextStep() {
    saveProgress();
    const steps = getSteps();
    const idx = steps.findIndex((s) => s.key === step);
    if (idx < steps.length - 1) setStep(steps[idx + 1].key);
  }

  function prevStep() {
    const steps = getSteps();
    const idx = steps.findIndex((s) => s.key === step);
    if (idx > 0) setStep(steps[idx - 1].key);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h1 className="text-h2 font-semibold mb-2">Oops</h1>
            <p className="text-body text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const steps = getSteps();
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {data.event.logo_url && (
              <img src={data.event.logo_url} alt="" className="h-8 w-8 rounded object-cover" />
            )}
            <div>
              <p className="text-caption text-muted-foreground">{data.event.name}</p>
              <h1 className="text-body font-semibold">{data.company.name} — Partner Setup</h1>
            </div>
            <div className="ml-auto flex gap-1.5">
              {data.company.capabilities.map((cap) => (
                <Badge key={cap} variant="outline" className="text-[10px] capitalize">{cap}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      {step !== "auth" && (
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isActive = s.key === step;
              const isDone = i < currentStepIndex;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  {i > 0 && <div className={`h-px w-8 ${isDone ? "bg-primary" : "bg-border"}`} />}
                  <button
                    onClick={() => { if (isDone) { saveProgress(); setStep(s.key); } }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isDone
                        ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 pb-12">
        {/* AUTH STEP */}
        {step === "auth" && (
          <Card className="mt-8">
            <CardContent className="pt-8 pb-8">
              <div className="text-center mb-6">
                <h2 className="text-h2 font-semibold">Welcome, {data.member.name || "Partner"}</h2>
                <p className="text-body text-muted-foreground mt-1">
                  {authMode === "signup" ? "Create an account" : "Sign in"} to start setting up{" "}
                  <span className="font-medium text-foreground">{data.company.name}</span>
                </p>
              </div>
              <form onSubmit={handleAuth} className="space-y-4 max-w-sm mx-auto">
                {authMode === "signup" && (
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Full name</label>
                    <Input value={authForm.full_name} onChange={(e) => setAuthForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Your name" />
                  </div>
                )}
                <div>
                  <label className="text-caption font-medium mb-1.5 block">Email</label>
                  <Input value={authForm.email} onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))} type="email" placeholder="email@company.com" />
                </div>
                <div>
                  <label className="text-caption font-medium mb-1.5 block">Password</label>
                  <Input value={authForm.password} onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))} type="password" placeholder="Min 8 characters" />
                </div>
                {authError && <p className="text-caption text-destructive">{authError}</p>}
                <Button type="submit" className="w-full" disabled={authLoading}>
                  {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  {authMode === "signup" ? "Create Account & Continue" : "Sign In & Continue"}
                </Button>
                <p className="text-center text-caption text-muted-foreground">
                  {authMode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
                  <button type="button" className="text-primary font-medium" onClick={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}>
                    {authMode === "signup" ? "Sign in" : "Sign up"}
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {/* BRAND ASSETS STEP */}
        {step === "brand" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-h2 font-semibold">Brand Assets</h2>
              <p className="text-body text-muted-foreground mt-1">Upload your logo and brand visuals.</p>
            </div>
            <Card>
              <CardContent className="pt-6 space-y-5">
                <div>
                  <label className="text-caption font-medium mb-1.5 block">Logo URL *</label>
                  <Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://your-company.com/logo.png" />
                  {logo && <img src={logo} alt="Logo preview" className="mt-2 h-16 w-16 rounded-lg object-cover border" />}
                </div>
                <div>
                  <label className="text-caption font-medium mb-1.5 block">Banner image URL</label>
                  <Input value={banner} onChange={(e) => setBanner(e.target.value)} placeholder="https://your-company.com/banner.jpg" />
                  {banner && <img src={banner} alt="Banner preview" className="mt-2 h-24 w-full rounded-lg object-cover border" />}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Primary brand color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} className="h-10 w-10 rounded border cursor-pointer" />
                      <Input value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Secondary brand color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={brandSecondary} onChange={(e) => setBrandSecondary(e.target.value)} className="h-10 w-10 rounded border cursor-pointer" />
                      <Input value={brandSecondary} onChange={(e) => setBrandSecondary(e.target.value)} className="flex-1" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <StepNav onNext={nextStep} saving={saving} />
          </div>
        )}

        {/* COMPANY PROFILE STEP */}
        {step === "profile" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-h2 font-semibold">Company Profile</h2>
              <p className="text-body text-muted-foreground mt-1">Tell attendees about your company.</p>
            </div>
            <Card>
              <CardContent className="pt-6 space-y-5">
                <div>
                  <label className="text-caption font-medium mb-1.5 block">Short description * <span className="text-muted-foreground font-normal">(max 300 chars)</span></label>
                  <textarea
                    value={descShort}
                    onChange={(e) => setDescShort(e.target.value.slice(0, 300))}
                    rows={2}
                    placeholder="A brief tagline about your company"
                    className="flex w-full rounded bg-input px-4 py-3 text-body border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">{descShort.length}/300</p>
                </div>
                <div>
                  <label className="text-caption font-medium mb-1.5 block">Detailed description</label>
                  <textarea
                    value={descLong}
                    onChange={(e) => setDescLong(e.target.value)}
                    rows={5}
                    placeholder="Full company description, mission, what you do..."
                    className="flex w-full rounded bg-input px-4 py-3 text-body border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 resize-none"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Website</label>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Industry</label>
                    <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Technology" />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">HQ Location</label>
                    <Input value={hqLocation} onChange={(e) => setHqLocation(e.target.value)} placeholder="e.g. Berlin, Germany" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <StepNav onPrev={prevStep} onNext={nextStep} saving={saving} />
          </div>
        )}

        {/* SPONSOR SETUP STEP */}
        {step === "sponsor" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-h2 font-semibold">Sponsor Setup</h2>
              <p className="text-body text-muted-foreground mt-1">Configure your sponsor presence.</p>
            </div>
            <Card>
              <CardContent className="pt-6 space-y-5">
                <div>
                  <label className="text-caption font-medium mb-1.5 block">Tagline</label>
                  <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Your promotional headline" />
                </div>
                <div>
                  <label className="text-caption font-medium mb-1.5 block">Promo video URL</label>
                  <Input value={promoVideo} onChange={(e) => setPromoVideo(e.target.value)} placeholder="https://youtube.com/..." />
                </div>

                {/* CTA Buttons */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-caption font-medium">CTA Buttons * <span className="text-muted-foreground font-normal">(at least 1, max 3)</span></label>
                    {ctaButtons.length < 3 && (
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setCtaButtons([...ctaButtons, { label: "", url: "", style: "primary" }])}>
                        <Plus className="mr-1 h-3 w-3" /> Add
                      </Button>
                    )}
                  </div>
                  {ctaButtons.length === 0 && (
                    <button
                      onClick={() => setCtaButtons([{ label: "Learn More", url: "", style: "primary" }])}
                      className="w-full p-4 border-2 border-dashed border-border rounded-lg text-caption text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                    >
                      <Plus className="h-4 w-4 mx-auto mb-1" />
                      Add your first CTA button
                    </button>
                  )}
                  <div className="space-y-2">
                    {ctaButtons.map((btn, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input value={btn.label} onChange={(e) => { const c = [...ctaButtons]; c[i].label = e.target.value; setCtaButtons(c); }} placeholder="Button label" className="flex-1" />
                        <Input value={btn.url} onChange={(e) => { const c = [...ctaButtons]; c[i].url = e.target.value; setCtaButtons(c); }} placeholder="https://..." className="flex-1" />
                        <select
                          value={btn.style}
                          onChange={(e) => { const c = [...ctaButtons]; c[i].style = e.target.value; setCtaButtons(c); }}
                          className="h-10 rounded bg-input px-2 text-caption border border-border"
                        >
                          <option value="primary">Primary</option>
                          <option value="outline">Outline</option>
                          <option value="secondary">Secondary</option>
                        </select>
                        <button onClick={() => setCtaButtons(ctaButtons.filter((_, j) => j !== i))} className="p-1.5 hover:bg-secondary rounded">
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Downloadables */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-caption font-medium">Downloadable Resources</label>
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setDownloadables([...downloadables, { name: "", url: "", type: "pdf" }])}>
                      <Plus className="mr-1 h-3 w-3" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {downloadables.map((dl, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input value={dl.name} onChange={(e) => { const c = [...downloadables]; c[i].name = e.target.value; setDownloadables(c); }} placeholder="Resource name" className="flex-1" />
                        <Input value={dl.url} onChange={(e) => { const c = [...downloadables]; c[i].url = e.target.value; setDownloadables(c); }} placeholder="File URL" className="flex-1" />
                        <button onClick={() => setDownloadables(downloadables.filter((_, j) => j !== i))} className="p-1.5 hover:bg-secondary rounded">
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            <StepNav onPrev={prevStep} onNext={nextStep} saving={saving} />
          </div>
        )}

        {/* EXHIBITOR SETUP STEP */}
        {step === "exhibitor" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-h2 font-semibold">Exhibitor Setup</h2>
              <p className="text-body text-muted-foreground mt-1">Set up your booth and product catalog.</p>
            </div>
            <Card>
              <CardContent className="pt-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Booth number</label>
                    <Input value={boothNumber} onChange={(e) => setBoothNumber(e.target.value)} placeholder="e.g. A12" />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Product categories <span className="text-muted-foreground font-normal">(comma-separated)</span></label>
                    <Input
                      value={productCategories.join(", ")}
                      onChange={(e) => setProductCategories(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                      placeholder="SaaS, Analytics, Security"
                    />
                  </div>
                </div>

                {/* Products */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-caption font-medium">Products & Services</label>
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setProducts([...products, { name: "", description: "", image_url: "", demo_url: "" }])}>
                      <Plus className="mr-1 h-3 w-3" /> Add Product
                    </Button>
                  </div>
                  {products.length === 0 && (
                    <button
                      onClick={() => setProducts([{ name: "", description: "", image_url: "", demo_url: "" }])}
                      className="w-full p-4 border-2 border-dashed border-border rounded-lg text-caption text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                    >
                      <ShoppingBag className="h-4 w-4 mx-auto mb-1" />
                      Add your first product or service
                    </button>
                  )}
                  <div className="space-y-3">
                    {products.map((p, i) => (
                      <Card key={i}>
                        <CardContent className="pt-4 pb-4">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] text-muted-foreground font-medium">Product {i + 1}</span>
                            <button onClick={() => setProducts(products.filter((_, j) => j !== i))} className="p-1 hover:bg-secondary rounded">
                              <X className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Input value={p.name} onChange={(e) => { const c = [...products]; c[i].name = e.target.value; setProducts(c); }} placeholder="Product name" />
                            <Input value={p.demo_url} onChange={(e) => { const c = [...products]; c[i].demo_url = e.target.value; setProducts(c); }} placeholder="Demo URL (optional)" />
                            <div className="sm:col-span-2">
                              <textarea
                                value={p.description}
                                onChange={(e) => { const c = [...products]; c[i].description = e.target.value; setProducts(c); }}
                                rows={2}
                                placeholder="Brief description"
                                className="flex w-full rounded bg-input px-3 py-2 text-caption border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 resize-none"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Resources */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-caption font-medium">Resources (brochures, case studies)</label>
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setResources([...resources, { name: "", url: "", type: "brochure" }])}>
                      <Plus className="mr-1 h-3 w-3" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {resources.map((r, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input value={r.name} onChange={(e) => { const c = [...resources]; c[i].name = e.target.value; setResources(c); }} placeholder="Resource name" className="flex-1" />
                        <Input value={r.url} onChange={(e) => { const c = [...resources]; c[i].url = e.target.value; setResources(c); }} placeholder="File URL" className="flex-1" />
                        <select
                          value={r.type}
                          onChange={(e) => { const c = [...resources]; c[i].type = e.target.value; setResources(c); }}
                          className="h-10 rounded bg-input px-2 text-caption border border-border"
                        >
                          <option value="brochure">Brochure</option>
                          <option value="case_study">Case Study</option>
                          <option value="video">Video</option>
                          <option value="other">Other</option>
                        </select>
                        <button onClick={() => setResources(resources.filter((_, j) => j !== i))} className="p-1.5 hover:bg-secondary rounded">
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            <StepNav onPrev={prevStep} onNext={nextStep} saving={saving} />
          </div>
        )}

        {/* TEAM STEP */}
        {step === "team" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-h2 font-semibold">Invite Team Members</h2>
              <p className="text-body text-muted-foreground mt-1">Add your team. They'll get invite links to complete their profiles.</p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-caption font-medium">Team members</label>
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setTeamInvites([...teamInvites, { email: "", name: "", role: "representative" }])}>
                    <Plus className="mr-1 h-3 w-3" /> Add member
                  </Button>
                </div>
                {teamInvites.length === 0 && (
                  <button
                    onClick={() => setTeamInvites([{ email: "", name: "", role: "representative" }])}
                    className="w-full p-6 border-2 border-dashed border-border rounded-lg text-caption text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                  >
                    <Users className="h-5 w-5 mx-auto mb-2" />
                    Add team members (optional, you can do this later)
                  </button>
                )}
                <div className="space-y-3">
                  {teamInvites.map((inv, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input value={inv.name} onChange={(e) => { const c = [...teamInvites]; c[i].name = e.target.value; setTeamInvites(c); }} placeholder="Name" className="flex-1" />
                      <Input value={inv.email} onChange={(e) => { const c = [...teamInvites]; c[i].email = e.target.value; setTeamInvites(c); }} placeholder="Email" className="flex-1" type="email" />
                      <select
                        value={inv.role}
                        onChange={(e) => { const c = [...teamInvites]; c[i].role = e.target.value; setTeamInvites(c); }}
                        className="h-10 rounded bg-input px-2 text-caption border border-border"
                      >
                        <option value="manager">Manager</option>
                        <option value="representative">Representative</option>
                        <option value="scanner">Scanner</option>
                        <option value="speaker">Speaker</option>
                      </select>
                      <button onClick={() => setTeamInvites(teamInvites.filter((_, j) => j !== i))} className="p-1.5 hover:bg-secondary rounded">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <StepNav onPrev={prevStep} onNext={nextStep} saving={saving} />
          </div>
        )}

        {/* REVIEW & SUBMIT STEP */}
        {step === "review" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-h2 font-semibold">Review & Submit</h2>
              <p className="text-body text-muted-foreground mt-1">Review your setup and submit for organizer approval.</p>
            </div>

            {/* Preview summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-6">
                  {logo ? (
                    <img src={logo} alt="" className="h-16 w-16 rounded-xl object-cover border" />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-h2 font-bold">
                      {data.company.name[0]}
                    </div>
                  )}
                  <div>
                    <h3 className="text-h3 font-semibold">{data.company.name}</h3>
                    {descShort && <p className="text-body text-muted-foreground mt-1">{descShort}</p>}
                    <div className="flex gap-2 mt-2">
                      {website && <Badge variant="outline" className="text-[10px]">Website ✓</Badge>}
                      {industry && <Badge variant="outline" className="text-[10px]">{industry}</Badge>}
                      {hqLocation && <Badge variant="outline" className="text-[10px]">{hqLocation}</Badge>}
                    </div>
                  </div>
                </div>

                {/* Checklist */}
                <div className="space-y-2">
                  <CheckItem label="Logo" done={!!logo} />
                  <CheckItem label="Short description" done={!!descShort} />
                  <CheckItem label="Banner image" done={!!banner} optional />
                  <CheckItem label="Detailed description" done={!!descLong} optional />
                  {data.company.capabilities.includes("sponsor") && (
                    <>
                      <div className="border-t border-border my-3" />
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sponsor</p>
                      <CheckItem label="CTA buttons" done={ctaButtons.length > 0} />
                      <CheckItem label="Tagline" done={!!tagline} optional />
                      <CheckItem label="Downloadable resources" done={downloadables.length > 0} optional />
                    </>
                  )}
                  {data.company.capabilities.includes("exhibitor") && (
                    <>
                      <div className="border-t border-border my-3" />
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Exhibitor</p>
                      <CheckItem label="Products or detailed description" done={products.length > 0 || !!descLong} />
                      <CheckItem label="Booth number" done={!!boothNumber} optional />
                      <CheckItem label="Resources" done={resources.length > 0} optional />
                    </>
                  )}
                  <div className="border-t border-border my-3" />
                  <CheckItem label="Team invites" done={teamInvites.length > 0} optional />
                </div>
              </CardContent>
            </Card>

            {submitError && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-body font-medium text-destructive">{submitError}</p>
                      {missingFields.length > 0 && (
                        <ul className="mt-1 text-caption text-destructive/80 list-disc pl-4">
                          {missingFields.map((f) => <li key={f}>{f}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleSubmit} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit for Review
              </Button>
            </div>
          </div>
        )}

        {/* DONE STEP */}
        {step === ("done" as WizardStep) && (
          <div className="max-w-md mx-auto text-center py-8">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-h2 font-semibold mb-2">Submitted for Review!</h2>
            <p className="text-body text-muted-foreground mb-1">
              <span className="font-medium text-foreground">{data?.company.name}</span> has been submitted to the event organizer for review.
            </p>
            <p className="text-caption text-muted-foreground mb-6">
              You'll be notified once your profile is approved and goes live. In the meantime, your team members can accept their invites and complete their profiles.
            </p>
            <div className="space-y-2">
              <a href={`/events/${slug}`}>
                <Button className="w-full">View Event Page</Button>
              </a>
              <a href={`/dashboard/company/${data?.company.id}`}>
                <Button variant="outline" className="w-full">Go to Dashboard</Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepNav({ onPrev, onNext, saving }: { onPrev?: () => void; onNext: () => void; saving: boolean }) {
  return (
    <div className="flex gap-3">
      {onPrev && (
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      )}
      <Button onClick={onNext} disabled={saving} className="ml-auto">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save & Continue <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function CheckItem({ label, done, optional }: { label: string; done: boolean; optional?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
        done ? "bg-green-500/10 text-green-500" : optional ? "bg-muted text-muted-foreground" : "bg-red-500/10 text-red-500"
      }`}>
        {done ? <Check className="h-3 w-3" /> : <span className="text-[10px]">{optional ? "—" : "!"}</span>}
      </div>
      <span className={`text-caption ${done ? "text-foreground" : optional ? "text-muted-foreground" : "text-red-500 font-medium"}`}>
        {label}
      </span>
      {optional && !done && <span className="text-[10px] text-muted-foreground">(optional)</span>}
    </div>
  );
}
