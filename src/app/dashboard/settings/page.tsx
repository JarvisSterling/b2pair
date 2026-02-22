"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Eye,
  Shield,
  Bell,
  Loader2,
  Check,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Visibility = "everyone" | "connections" | "nobody";

interface VisibilitySettings {
  visibility_email: Visibility;
  visibility_phone: Visibility;
  visibility_company: Visibility;
  visibility_social: Visibility;
  discoverable: boolean;
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "connections", label: "Connections only" },
  { value: "nobody", label: "Nobody" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<VisibilitySettings>({
    visibility_email: "connections",
    visibility_phone: "nobody",
    visibility_company: "everyone",
    visibility_social: "connections",
    discoverable: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("visibility_email, visibility_phone, visibility_company, visibility_social, discoverable")
      .eq("id", user.id)
      .single();

    if (data) {
      setSettings({
        visibility_email: data.visibility_email || "connections",
        visibility_phone: data.visibility_phone || "nobody",
        visibility_company: data.visibility_company || "everyone",
        visibility_social: data.visibility_social || "connections",
        discoverable: data.discoverable ?? true,
      });
    }
    setLoading(false);
  }

  async function saveSettings() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update(settings)
      .eq("id", user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function updateSetting<K extends keyof VisibilitySettings>(key: K, value: VisibilitySettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-h1 font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Manage your privacy and account preferences.
        </p>
      </div>

      {/* Privacy & Visibility */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-6">
            <Eye className="h-5 w-5 text-primary" />
            <h2 className="text-h3 font-semibold">Privacy &amp; Visibility</h2>
          </div>

          <div className="space-y-6">
            {/* Discoverable toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body font-medium">Discoverable</p>
                <p className="text-caption text-muted-foreground">
                  Appear in participant directories and match suggestions
                </p>
              </div>
              <button
                onClick={() => updateSetting("discoverable", !settings.discoverable)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings.discoverable ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    settings.discoverable ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            <div className="h-px bg-border" />

            {/* Visibility controls */}
            <VisibilityRow
              label="Email address"
              description="Who can see your email"
              value={settings.visibility_email}
              onChange={(v) => updateSetting("visibility_email", v)}
            />
            <VisibilityRow
              label="Phone number"
              description="Who can see your phone number"
              value={settings.visibility_phone}
              onChange={(v) => updateSetting("visibility_phone", v)}
            />
            <VisibilityRow
              label="Company details"
              description="Who can see your company and title"
              value={settings.visibility_company}
              onChange={(v) => updateSetting("visibility_company", v)}
            />
            <VisibilityRow
              label="Social links"
              description="Who can see your LinkedIn, Twitter, etc."
              value={settings.visibility_social}
              onChange={(v) => updateSetting("visibility_social", v)}
            />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Shield className="mr-2 h-4 w-4" />
              )}
              {saved ? "Saved" : "Save preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-h3 font-semibold">Account</h2>
          </div>

          <Button variant="outline" onClick={handleSignOut} className="text-destructive hover:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function VisibilityRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: Visibility;
  onChange: (v: Visibility) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-body font-medium">{label}</p>
        <p className="text-caption text-muted-foreground">{description}</p>
      </div>
      <div className="flex rounded-lg border overflow-hidden shrink-0">
        {VISIBILITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              value === opt.value
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
