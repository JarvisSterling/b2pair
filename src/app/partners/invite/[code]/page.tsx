"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  AlertCircle,
  ArrowRight,
  User,
  Building2,
  CheckCircle2,
  Briefcase,
} from "lucide-react";

interface InviteData {
  member: { id: string; email: string; name: string; role: string };
  company: { id: string; name: string; slug: string; logo_url: string | null; capabilities: string[] };
  event: { id: string; name: string; slug: string; logo_url: string | null } | null;
}

export default function TeamMemberInvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"auth" | "profile" | "done">("auth");
  const [user, setUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Auth
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [authForm, setAuthForm] = useState({ full_name: "", email: "", password: "" });
  const [authError, setAuthError] = useState<string | null>(null);

  // Profile
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Result
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
      setAuthForm((f) => ({ ...f, email: json.member.email, full_name: json.member.name || "" }));
      setFullName(json.member.name || "");
      if (json.event?.slug) setEventSlug(json.event.slug);
    } catch {
      setError("Failed to load invite");
    }
    setLoading(false);
  }, [code]);

  useEffect(() => { loadInvite(); }, [loadInvite]);

  // Check auth
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setFullName(user.user_metadata?.full_name || "");
        setStep("profile");
      }
    }
    checkAuth();
  }, []);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAuthError(null);
    const supabase = createClient();

    if (authMode === "signup") {
      if (authForm.password.length < 8) {
        setAuthError("Password must be at least 8 characters");
        setSaving(false);
        return;
      }
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: authForm.email,
        password: authForm.password,
        options: { data: { full_name: authForm.full_name } },
      });
      if (error) { setAuthError(error.message); setSaving(false); return; }
      setUser(signUpData.user);
      setFullName(authForm.full_name);
    } else {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: authForm.email,
        password: authForm.password,
      });
      if (error) { setAuthError(error.message); setSaving(false); return; }
      setUser(signInData.user);
      setFullName(signInData.user?.user_metadata?.full_name || authForm.full_name);
    }

    setStep("profile");
    setSaving(false);
  }

  async function handleComplete() {
    setSaving(true);

    const res = await fetch(`/api/partners/invite/${code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        bio,
        title,
        interests,
        avatar_url: avatarUrl || null,
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
            <h1 className="text-h2 font-semibold mb-2">Oops</h1>
            <p className="text-body text-muted-foreground">{error}</p>
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
      <div className="w-full max-w-md">
        {/* Company header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            {data.company.logo_url ? (
              <img src={data.company.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover border" />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-h3 font-bold">
                {data.company.name[0]}
              </div>
            )}
          </div>
          <h1 className="text-h2 font-semibold">Join {data.company.name}</h1>
          {data.event && (
            <p className="text-caption text-muted-foreground mt-1">at {data.event.name}</p>
          )}
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="outline" className="text-[10px]">{roleLabels[data.member.role] || data.member.role}</Badge>
            {data.company.capabilities.map((cap) => (
              <Badge key={cap} variant="secondary" className="text-[10px] capitalize">{cap}</Badge>
            ))}
          </div>
        </div>

        {/* AUTH STEP */}
        {step === "auth" && (
          <Card>
            <CardContent className="pt-6 pb-6">
              <h2 className="text-body font-semibold mb-4 text-center">
                {authMode === "signup" ? "Create your account" : "Sign in"}
              </h2>
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === "signup" && (
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Full name</label>
                    <Input value={authForm.full_name} onChange={(e) => setAuthForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Your name" />
                  </div>
                )}
                <div>
                  <label className="text-caption font-medium mb-1.5 block">Email</label>
                  <Input value={authForm.email} onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))} type="email" />
                </div>
                <div>
                  <label className="text-caption font-medium mb-1.5 block">Password</label>
                  <Input value={authForm.password} onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))} type="password" placeholder="Min 8 characters" />
                </div>
                {authError && <p className="text-caption text-destructive">{authError}</p>}
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  {authMode === "signup" ? "Create Account" : "Sign In"}
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

        {/* PROFILE STEP */}
        {step === "profile" && (
          <Card>
            <CardContent className="pt-6 pb-6">
              <h2 className="text-body font-semibold mb-1">Complete your profile</h2>
              <p className="text-caption text-muted-foreground mb-5">This is how other attendees will see you at the event.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-caption font-medium mb-1.5 block">Full name *</label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
                </div>
                <div>
                  <label className="text-caption font-medium mb-1.5 block">Job title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sales Director" />
                </div>
                <div>
                  <label className="text-caption font-medium mb-1.5 block">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Brief bio about yourself and what you do"
                    className="flex w-full rounded bg-input px-4 py-3 text-body border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 resize-none"
                  />
                </div>
                <div>
                  <label className="text-caption font-medium mb-1.5 block">Interests / looking for</label>
                  <Input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="e.g. Partnership opportunities, Enterprise clients" />
                </div>
                <div>
                  <label className="text-caption font-medium mb-1.5 block">Profile photo URL</label>
                  <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
                  {avatarUrl && <img src={avatarUrl} alt="" className="mt-2 h-16 w-16 rounded-full object-cover border" />}
                </div>
                <Button onClick={handleComplete} className="w-full" disabled={saving || !fullName}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Complete Profile & Join
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* DONE STEP */}
        {step === "done" && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-h2 font-semibold mb-2">You're in!</h2>
              <p className="text-body text-muted-foreground mb-1">
                You've joined <span className="font-medium text-foreground">{data.company.name}</span> as a {roleLabels[data.member.role]?.toLowerCase() || data.member.role}.
              </p>
              <p className="text-caption text-muted-foreground mb-6">
                You're now part of the attendee pool and can be matched with other participants.
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
