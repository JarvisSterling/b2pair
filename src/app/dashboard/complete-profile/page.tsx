"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Check, ArrowRight } from "lucide-react";

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

interface ProfileData {
  fullName: string;
  title: string;
  companyName: string;
  industry: string;
  bio: string;
  linkedinUrl: string;
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ProfileData>({
    fullName: "",
    title: "",
    companyName: "",
    industry: "",
    bio: "",
    linkedinUrl: "",
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/sign-in");
        return;
      }
      supabase
        .from("profiles")
        .select("full_name, title, company_name, industry, bio, linkedin_url")
        .eq("id", user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile) {
            setData({
              fullName: profile.full_name || "",
              title: profile.title || "",
              companyName: profile.company_name || "",
              industry: profile.industry || "",
              bio: profile.bio || "",
              linkedinUrl: profile.linkedin_url || "",
            });
          }
          setLoading(false);
        });
    });
  }, [router]);

  async function handleSave() {
    if (!data.fullName.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        full_name: data.fullName.trim(),
        title: data.title.trim() || null,
        company_name: data.companyName.trim() || null,
        industry: data.industry || null,
        bio: data.bio.trim() || null,
        linkedin_url: data.linkedinUrl.trim() || null,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    router.push(redirectTo);
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto mb-4">
            <Check className="h-6 w-6" />
          </div>
          <h1 className="text-h1 font-semibold tracking-tight">
            Complete your profile
          </h1>
          <p className="mt-2 text-body text-muted-foreground">
            A few details so other participants can learn about you. This
            helps the AI matching work better.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-caption font-medium">
                Full name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Your full name"
                value={data.fullName}
                onChange={(e) =>
                  setData((p) => ({ ...p, fullName: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-caption font-medium">Job title</label>
                <Input
                  placeholder="e.g. Head of Sales"
                  value={data.title}
                  onChange={(e) =>
                    setData((p) => ({ ...p, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-caption font-medium">Company</label>
                <Input
                  placeholder="Your company"
                  value={data.companyName}
                  onChange={(e) =>
                    setData((p) => ({ ...p, companyName: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-caption font-medium">Industry</label>
              <div className="flex flex-wrap gap-1.5">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() =>
                      setData((p) => ({
                        ...p,
                        industry: p.industry === ind ? "" : ind,
                      }))
                    }
                    className={`rounded-full border px-2.5 py-1 text-xs transition-all duration-150 ${
                      data.industry === ind
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-caption font-medium">Short bio</label>
              <textarea
                rows={2}
                placeholder="A sentence or two about what you do..."
                value={data.bio}
                onChange={(e) =>
                  setData((p) => ({ ...p, bio: e.target.value }))
                }
                className="flex w-full rounded bg-input px-4 py-3 text-body text-foreground border border-border placeholder:text-muted-foreground transition-colors duration-150 hover:border-border-strong focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/20 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-caption font-medium">
                LinkedIn profile
              </label>
              <Input
                placeholder="https://linkedin.com/in/yourprofile"
                value={data.linkedinUrl}
                onChange={(e) =>
                  setData((p) => ({ ...p, linkedinUrl: e.target.value }))
                }
              />
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSave}
                disabled={!data.fullName.trim() || saving}
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Continue to event
              </Button>
              <button
                onClick={() => router.push(redirectTo)}
                className="w-full mt-2 text-center text-caption text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Skip for now
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
