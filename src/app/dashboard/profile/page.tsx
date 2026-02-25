"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, Check, Pencil, X } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";

const INDUSTRIES = [
  "Technology", "Healthcare", "Finance", "Manufacturing", "Retail",
  "Education", "Real Estate", "Energy", "Consulting", "Media",
  "Logistics", "Agriculture", "Legal", "Hospitality", "Non-profit", "Other",
];

const EXPERTISE_AREAS = [
  "Software Development", "Product Management", "Sales & BD", "Marketing",
  "Design & UX", "Data & Analytics", "Operations", "Finance & Accounting",
  "Human Resources", "Strategy", "Supply Chain", "Customer Success",
  "Engineering", "Research", "Legal & Compliance", "AI & Machine Learning",
];

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  title: string | null;
  bio: string | null;
  company_name: string | null;
  company_size: string | null;
  company_website: string | null;
  industry: string | null;
  expertise_areas: string[];
  interests: string[];
  linkedin_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<Partial<Profile>>({});

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data as Profile);
      setDraft(data as Profile);
    }
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: draft.full_name,
        title: draft.title || null,
        bio: draft.bio || null,
        company_name: draft.company_name || null,
        company_size: draft.company_size || null,
        company_website: draft.company_website || null,
        industry: draft.industry || null,
        expertise_areas: draft.expertise_areas || [],
        interests: draft.interests || [],
        linkedin_url: draft.linkedin_url || null,
        twitter_url: draft.twitter_url || null,
        website_url: draft.website_url || null,
      })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, ...draft } as Profile);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  function toggleExpertise(area: string) {
    const current = draft.expertise_areas || [];
    const updated = current.includes(area)
      ? current.filter((a) => a !== area)
      : [...current, area];
    setDraft({ ...draft, expertise_areas: updated });
  }

  function toggleInterest(area: string) {
    const current = draft.interests || [];
    const updated = current.includes(area)
      ? current.filter((a) => a !== area)
      : [...current, area];
    setDraft({ ...draft, interests: updated });
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Your profile</h1>
          <p className="mt-1 text-body text-muted-foreground">
            This is how other participants see you at events.
          </p>
        </div>
        <div className="flex gap-2">
          {saved && (
            <div className="flex items-center gap-1 text-caption text-success animate-fade-in">
              <Check className="h-4 w-4" />
              Saved
            </div>
          )}
          {editing ? (
            <>
              <Button variant="ghost" onClick={() => { setEditing(false); setDraft(profile); }}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save changes
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit profile
            </Button>
          )}
        </div>
      </div>

      {/* Profile Header Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-5">
            {profile.avatar_url ? (
              <SafeImage src={profile.avatar_url} alt={profile.full_name} className="h-20 w-20 rounded-full object-cover shrink-0" width={80} height={80} />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary text-h1 font-semibold shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-3">
                  <Input value={draft.full_name || ""} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} placeholder="Full name" />
                  <Input value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Job title" />
                  <textarea
                    rows={3}
                    value={draft.bio || ""}
                    onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                    placeholder="Short bio"
                    className="flex w-full rounded bg-input px-4 py-3 text-body text-foreground border border-border placeholder:text-muted-foreground transition-colors duration-150 hover:border-border-strong focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/20 resize-none"
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-h2 font-semibold">{profile.full_name}</h2>
                  {profile.title && <p className="text-body text-muted-foreground">{profile.title}</p>}
                  {profile.bio && <p className="mt-2 text-body text-muted-foreground">{profile.bio}</p>}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Company</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              <Input value={draft.company_name || ""} onChange={(e) => setDraft({ ...draft, company_name: e.target.value })} placeholder="Company name" />
              <div className="grid grid-cols-2 gap-2">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => setDraft({ ...draft, industry: ind })}
                    className={`rounded-sm border px-3 py-2 text-caption text-left transition-all duration-150 ${
                      draft.industry === ind
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border bg-background text-foreground hover:border-border-strong"
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
              <Input value={draft.company_website || ""} onChange={(e) => setDraft({ ...draft, company_website: e.target.value })} placeholder="Website" />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-body font-medium">{profile.company_name || "Not set"}</p>
              {profile.industry && <Badge variant="secondary">{profile.industry}</Badge>}
              {profile.company_website && (
                <p className="text-caption text-primary">{profile.company_website}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expertise & Interests */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Expertise & interests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-caption font-medium mb-3">Expertise areas</p>
            {editing ? (
              <div className="flex flex-wrap gap-2">
                {EXPERTISE_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleExpertise(area)}
                    className={`rounded-full border px-3 py-1.5 text-caption transition-all duration-150 ${
                      (draft.expertise_areas || []).includes(area)
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border text-foreground hover:border-border-strong"
                    }`}
                  >
                    {(draft.expertise_areas || []).includes(area) && <Check className="mr-1 inline h-3 w-3" />}
                    {area}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(profile.expertise_areas || []).length > 0 ? (
                  profile.expertise_areas.map((area) => (
                    <Badge key={area} variant="secondary">{area}</Badge>
                  ))
                ) : (
                  <p className="text-caption text-muted-foreground">None set</p>
                )}
              </div>
            )}
          </div>

          <Separator />

          <div>
            <p className="text-caption font-medium mb-3">Interests</p>
            {editing ? (
              <div className="flex flex-wrap gap-2">
                {EXPERTISE_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleInterest(area)}
                    className={`rounded-full border px-3 py-1.5 text-caption transition-all duration-150 ${
                      (draft.interests || []).includes(area)
                        ? "border-primary/50 bg-primary/5 text-primary font-medium"
                        : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
                    }`}
                  >
                    {(draft.interests || []).includes(area) && <Check className="mr-1 inline h-3 w-3" />}
                    {area}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(profile.interests || []).length > 0 ? (
                  profile.interests.map((area) => (
                    <Badge key={area} variant="outline">{area}</Badge>
                  ))
                ) : (
                  <p className="text-caption text-muted-foreground">None set</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle>Links</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              <Input value={draft.linkedin_url || ""} onChange={(e) => setDraft({ ...draft, linkedin_url: e.target.value })} placeholder="LinkedIn URL" />
              <Input value={draft.twitter_url || ""} onChange={(e) => setDraft({ ...draft, twitter_url: e.target.value })} placeholder="Twitter / X URL" />
              <Input value={draft.website_url || ""} onChange={(e) => setDraft({ ...draft, website_url: e.target.value })} placeholder="Personal website" />
            </div>
          ) : (
            <div className="space-y-2">
              {profile.linkedin_url && <p className="text-caption text-primary">{profile.linkedin_url}</p>}
              {profile.twitter_url && <p className="text-caption text-primary">{profile.twitter_url}</p>}
              {profile.website_url && <p className="text-caption text-primary">{profile.website_url}</p>}
              {!profile.linkedin_url && !profile.twitter_url && !profile.website_url && (
                <p className="text-caption text-muted-foreground">No links added yet</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
