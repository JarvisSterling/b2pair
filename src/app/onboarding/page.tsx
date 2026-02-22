"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Building2,
  Target,
  Tags,
  Calendar,
  Check,
} from "lucide-react";

const STEPS = [
  { id: "role", label: "Your Role", icon: Target },
  { id: "company", label: "Company", icon: Building2 },
  { id: "interests", label: "Interests", icon: Tags },
  { id: "availability", label: "Availability", icon: Calendar },
] as const;

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Retail",
  "Education",
  "Real Estate",
  "Energy",
  "Consulting",
  "Media",
  "Logistics",
  "Agriculture",
  "Legal",
  "Hospitality",
  "Non-profit",
  "Other",
];

const EXPERTISE_AREAS = [
  "Software Development",
  "Product Management",
  "Sales & BD",
  "Marketing",
  "Design & UX",
  "Data & Analytics",
  "Operations",
  "Finance & Accounting",
  "Human Resources",
  "Strategy",
  "Supply Chain",
  "Customer Success",
  "Engineering",
  "Research",
  "Legal & Compliance",
  "AI & Machine Learning",
];

const COMPANY_SIZES = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-1000", label: "201-1,000 employees" },
  { value: "1000+", label: "1,000+ employees" },
];

type StepId = (typeof STEPS)[number]["id"];

interface OnboardingData {
  platformRole: "organizer" | "participant" | "";
  title: string;
  bio: string;
  companyName: string;
  companySize: string;
  companyWebsite: string;
  industry: string;
  expertiseAreas: string[];
  interests: string[];
  linkedinUrl: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    platformRole: "",
    title: "",
    bio: "",
    companyName: "",
    companySize: "",
    companyWebsite: "",
    industry: "",
    expertiseAreas: [],
    interests: [],
    linkedinUrl: "",
  });

  function updateData(updates: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...updates }));
  }

  function toggleArrayItem(field: "expertiseAreas" | "interests", item: string) {
    setData((prev) => {
      const current = prev[field];
      const updated = current.includes(item)
        ? current.filter((i) => i !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  }

  function canProceed(): boolean {
    switch (STEPS[currentStep].id) {
      case "role":
        return data.platformRole.length > 0 && data.title.length > 0;
      case "company":
        return data.companyName.length > 0 && data.industry.length > 0;
      case "interests":
        return data.expertiseAreas.length > 0;
      case "availability":
        return true;
      default:
        return false;
    }
  }

  async function handleComplete() {
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/sign-in");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        platform_role: data.platformRole || "participant",
        title: data.title,
        bio: data.bio,
        company_name: data.companyName,
        company_size: data.companySize || null,
        company_website: data.companyWebsite || null,
        industry: data.industry,
        expertise_areas: data.expertiseAreas,
        interests: data.interests,
        linkedin_url: data.linkedinUrl || null,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Failed to save profile:", error);
      setSaving(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  function nextStep() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`
                    flex h-8 w-8 items-center justify-center rounded-full text-small font-medium
                    transition-all duration-200
                    ${
                      i < currentStep
                        ? "bg-primary text-primary-foreground"
                        : i === currentStep
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-secondary text-muted-foreground"
                    }
                  `}
                >
                  {i < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`
                      mx-2 h-px w-12 sm:w-20 transition-colors duration-200
                      ${i < currentStep ? "bg-primary" : "bg-border"}
                    `}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-caption text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].label}
          </p>
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            <div className="animate-fade-in" key={currentStep}>
              {STEPS[currentStep].id === "role" && (
                <RoleStep data={data} updateData={updateData} />
              )}
              {STEPS[currentStep].id === "company" && (
                <CompanyStep data={data} updateData={updateData} />
              )}
              {STEPS[currentStep].id === "interests" && (
                <InterestsStep
                  data={data}
                  toggleArrayItem={toggleArrayItem}
                />
              )}
              {STEPS[currentStep].id === "availability" && (
                <AvailabilityStep data={data} updateData={updateData} />
              )}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={prevStep}
                disabled={currentStep === 0}
                className={currentStep === 0 ? "invisible" : ""}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <Button
                onClick={nextStep}
                disabled={!canProceed() || saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : currentStep === STEPS.length - 1 ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {currentStep === STEPS.length - 1 ? "Complete setup" : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

/* ─── Step Components ─── */

function RoleStep({
  data,
  updateData,
}: {
  data: OnboardingData;
  updateData: (u: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-h2 font-semibold">Tell us about yourself</h2>
        <p className="mt-1 text-body text-muted-foreground">
          This helps us find the most relevant connections for you.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-caption font-medium">
            How will you use B2Pair? <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "organizer" as const, label: "Organizer", desc: "I create and manage events" },
              { value: "participant" as const, label: "Participant", desc: "I attend events and network" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateData({ platformRole: opt.value })}
                className={`rounded-lg border p-4 text-left transition-all duration-150 ${
                  data.platformRole === opt.value
                    ? "border-primary bg-primary/5 ring-2 ring-ring/20"
                    : "border-border hover:border-border-strong"
                }`}
              >
                <p className="text-body font-medium">{opt.label}</p>
                <p className="text-caption text-muted-foreground mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="title" className="text-caption font-medium">
            Job title <span className="text-destructive">*</span>
          </label>
          <Input
            id="title"
            placeholder="e.g. Head of Partnerships"
            value={data.title}
            onChange={(e) => updateData({ title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="bio" className="text-caption font-medium">
            Short bio
          </label>
          <textarea
            id="bio"
            rows={3}
            placeholder="A few words about what you do and what you're passionate about..."
            value={data.bio}
            onChange={(e) => updateData({ bio: e.target.value })}
            className="flex w-full rounded bg-input px-4 py-3 text-body text-foreground border border-border placeholder:text-muted-foreground transition-colors duration-150 ease-out hover:border-border-strong focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/20 resize-none"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="linkedin" className="text-caption font-medium">
            LinkedIn profile
          </label>
          <Input
            id="linkedin"
            placeholder="https://linkedin.com/in/yourprofile"
            value={data.linkedinUrl}
            onChange={(e) => updateData({ linkedinUrl: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

function CompanyStep({
  data,
  updateData,
}: {
  data: OnboardingData;
  updateData: (u: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-h2 font-semibold">Your company</h2>
        <p className="mt-1 text-body text-muted-foreground">
          We use this to match you with complementary businesses.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="companyName" className="text-caption font-medium">
            Company name <span className="text-destructive">*</span>
          </label>
          <Input
            id="companyName"
            placeholder="Acme Inc."
            value={data.companyName}
            onChange={(e) => updateData({ companyName: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-caption font-medium">
            Industry <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {INDUSTRIES.map((industry) => (
              <button
                key={industry}
                type="button"
                onClick={() => updateData({ industry })}
                className={`
                  rounded-sm border px-3 py-2 text-caption text-left
                  transition-all duration-150 ease-out
                  ${
                    data.industry === industry
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border bg-background text-foreground hover:border-border-strong hover:bg-secondary"
                  }
                `}
              >
                {industry}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-caption font-medium">Company size</label>
          <div className="grid grid-cols-1 gap-2">
            {COMPANY_SIZES.map((size) => (
              <button
                key={size.value}
                type="button"
                onClick={() => updateData({ companySize: size.value })}
                className={`
                  rounded-sm border px-3 py-2 text-caption text-left
                  transition-all duration-150 ease-out
                  ${
                    data.companySize === size.value
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border bg-background text-foreground hover:border-border-strong hover:bg-secondary"
                  }
                `}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="companyWebsite" className="text-caption font-medium">
            Website
          </label>
          <Input
            id="companyWebsite"
            placeholder="https://acme.com"
            value={data.companyWebsite}
            onChange={(e) => updateData({ companyWebsite: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

function InterestsStep({
  data,
  toggleArrayItem,
}: {
  data: OnboardingData;
  toggleArrayItem: (field: "expertiseAreas" | "interests", item: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-h2 font-semibold">Your expertise</h2>
        <p className="mt-1 text-body text-muted-foreground">
          Select areas you specialize in. This powers our matching algorithm.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-caption font-medium">
            Expertise areas <span className="text-destructive">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {EXPERTISE_AREAS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => toggleArrayItem("expertiseAreas", area)}
                className={`
                  rounded-full border px-3 py-1.5 text-caption
                  transition-all duration-150 ease-out
                  ${
                    data.expertiseAreas.includes(area)
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border bg-background text-foreground hover:border-border-strong hover:bg-secondary"
                  }
                `}
              >
                {data.expertiseAreas.includes(area) && (
                  <Check className="mr-1 inline h-3 w-3" />
                )}
                {area}
              </button>
            ))}
          </div>
          {data.expertiseAreas.length > 0 && (
            <p className="text-small text-muted-foreground">
              {data.expertiseAreas.length} selected
            </p>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-caption font-medium">
            Interests (what are you looking to learn or explore?)
          </label>
          <div className="flex flex-wrap gap-2">
            {EXPERTISE_AREAS.filter(
              (a) => !data.expertiseAreas.includes(a)
            ).map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => toggleArrayItem("interests", area)}
                className={`
                  rounded-full border px-3 py-1.5 text-caption
                  transition-all duration-150 ease-out
                  ${
                    data.interests.includes(area)
                      ? "border-primary/50 bg-primary/5 text-primary font-medium"
                      : "border-border bg-background text-muted-foreground hover:border-border-strong hover:bg-secondary hover:text-foreground"
                  }
                `}
              >
                {data.interests.includes(area) && (
                  <Check className="mr-1 inline h-3 w-3" />
                )}
                {area}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AvailabilityStep({
  data,
  updateData,
}: {
  data: OnboardingData;
  updateData: (u: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-h2 font-semibold">Almost there!</h2>
        <p className="mt-1 text-body text-muted-foreground">
          You can set specific meeting availability later for each event.
          For now, you're all set.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <Check className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-h3 font-semibold">Your profile is ready</h3>
        <p className="mt-2 text-body text-muted-foreground">
          Click "Complete setup" to start discovering relevant connections
          at your next event.
        </p>
      </div>
    </div>
  );
}
