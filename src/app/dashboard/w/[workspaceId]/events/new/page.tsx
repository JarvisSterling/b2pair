"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  FileText,
  MapPin,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { DEFAULT_BANNER_URL, DEFAULT_BANNER_LAYOUT, DEFAULT_BANNER_SETTINGS } from "@/types/event-pages";

const EVENT_TYPES = [
  { value: "conference", label: "Conference", desc: "Multi-session event with speakers and panels" },
  { value: "tradeshow", label: "Trade Show", desc: "Exhibition with booths and product showcases" },
  { value: "summit", label: "Summit", desc: "High-level gathering of industry leaders" },
  { value: "networking", label: "Networking", desc: "Focused on making connections and meetings" },
  { value: "workshop", label: "Workshop", desc: "Hands-on, interactive learning session" },
  { value: "hybrid", label: "Hybrid", desc: "Combined in-person and virtual experience" },
];

const FORMATS = [
  { value: "in-person", label: "In-person" },
  { value: "virtual", label: "Virtual" },
  { value: "hybrid", label: "Hybrid" },
];

const STEPS = [
  { id: "basics", label: "Basics", icon: FileText },
  { id: "location", label: "Location", icon: MapPin },
  { id: "settings", label: "Settings", icon: Settings2 },
] as const;

interface EventData {
  name: string;
  description: string;
  eventType: string;
  format: string;
  startDate: string;
  endDate: string;
  timezone: string;
  venueName: string;
  city: string;
  country: string;
  virtualUrl: string;
  maxParticipants: string;
  requiresApproval: boolean;
  visibility: "public" | "unlisted";
  meetingDuration: string;
  breakBetweenMeetings: string;
}

export default function NewEventInWorkspace() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EventData>({
    name: "",
    description: "",
    eventType: "",
    format: "in-person",
    startDate: "",
    endDate: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    venueName: "",
    city: "",
    country: "",
    virtualUrl: "",
    maxParticipants: "",
    requiresApproval: false,
    visibility: "public",
    meetingDuration: "30",
    breakBetweenMeetings: "5",
  });

  function update(u: Partial<EventData>) {
    setData((prev) => ({ ...prev, ...u }));
  }

  function generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  }

  async function handleCreate() {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const slug = generateSlug(data.name) + "-" + Date.now().toString(36);

    const { data: event, error: createError } = await supabase
      .from("events")
      .insert({
        organization_id: workspaceId,
        name: data.name,
        slug,
        description: data.description || null,
        event_type: data.eventType,
        format: data.format,
        status: "draft",
        start_date: data.startDate,
        end_date: data.endDate,
        timezone: data.timezone,
        venue_name: data.venueName || null,
        city: data.city || null,
        country: data.country || null,
        virtual_url: data.virtualUrl || null,
        max_participants: data.maxParticipants ? parseInt(data.maxParticipants) : null,
        requires_approval: data.requiresApproval,
        visibility: data.visibility,
        meeting_duration_minutes: parseInt(data.meetingDuration) || 30,
        break_between_meetings: parseInt(data.breakBetweenMeetings) || 5,
        banner_url: DEFAULT_BANNER_URL,
        banner_layout: DEFAULT_BANNER_LAYOUT,
        banner_settings: DEFAULT_BANNER_SETTINGS,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (createError || !event) {
      setError(createError?.message || "Failed to create event");
      setSaving(false);
      return;
    }

    // Create default matching rules
    await supabase.from("matching_rules").insert({
      event_id: event.id,
    });

    // Add creator as organizer participant
    await supabase.from("participants").insert({
      event_id: event.id,
      user_id: user.id,
      role: "organizer",
      status: "approved",
    });

    // Seed default event pages and theme
    const { getDefaultPages } = await import("@/types/event-pages");
    await supabase.from("event_pages").insert(
      getDefaultPages(data.name).map((p) => ({ ...p, event_id: event.id }))
    );
    await supabase.from("event_themes").insert({
      event_id: event.id,
      theme_key: "light-classic",
    });

    router.push(`/dashboard/w/${workspaceId}/events/${event.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <div className="flex items-center gap-2 text-caption text-muted-foreground mb-6">
        <Link href={`/dashboard/w/${workspaceId}`} className="hover:text-foreground transition-colors">
          Workspace
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">New event</span>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {i + 1}
            </div>
            <span className={`text-caption font-medium hidden sm:inline ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6 pb-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-h2 font-semibold">Event basics</h2>
                <p className="text-caption text-muted-foreground mt-1">What's your event about?</p>
              </div>
              <Input placeholder="Event name *" value={data.name} onChange={(e) => update({ name: e.target.value })} />
              <textarea
                placeholder="Description"
                rows={3}
                value={data.description}
                onChange={(e) => update({ description: e.target.value })}
                className="flex w-full rounded bg-input px-4 py-3 text-body border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/20 resize-none"
              />
              <div>
                <label className="text-caption font-medium mb-2 block">Event type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_TYPES.map((et) => (
                    <button
                      key={et.value}
                      onClick={() => update({ eventType: et.value })}
                      className={`rounded-lg border p-3 text-left transition-all ${
                        data.eventType === et.value ? "border-primary bg-primary/5 ring-2 ring-ring/20" : "border-border hover:border-border-strong"
                      }`}
                    >
                      <p className="text-caption font-medium">{et.label}</p>
                      <p className="text-small text-muted-foreground">{et.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-caption font-medium">Start date *</label>
                  <Input type="datetime-local" value={data.startDate} onChange={(e) => update({ startDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-caption font-medium">End date *</label>
                  <Input type="datetime-local" value={data.endDate} onChange={(e) => update({ endDate: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-h2 font-semibold">Location</h2>
                <p className="text-caption text-muted-foreground mt-1">Where will your event take place?</p>
              </div>
              <div>
                <label className="text-caption font-medium mb-2 block">Format</label>
                <div className="flex gap-2">
                  {FORMATS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => update({ format: f.value })}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                        data.format === f.value ? "border-primary bg-primary/5" : "border-border hover:border-border-strong"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {data.format !== "virtual" && (
                <>
                  <Input placeholder="Venue name" value={data.venueName} onChange={(e) => update({ venueName: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="City" value={data.city} onChange={(e) => update({ city: e.target.value })} />
                    <Input placeholder="Country" value={data.country} onChange={(e) => update({ country: e.target.value })} />
                  </div>
                </>
              )}
              {data.format !== "in-person" && (
                <Input placeholder="Virtual meeting URL" value={data.virtualUrl} onChange={(e) => update({ virtualUrl: e.target.value })} />
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-h2 font-semibold">Settings</h2>
                <p className="text-caption text-muted-foreground mt-1">Registration and meeting preferences.</p>
              </div>

              <div className="space-y-2">
                <label className="text-caption font-medium">Visibility</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "public" as const, label: "Public", desc: "Visible in directory" },
                    { value: "unlisted" as const, label: "Unlisted", desc: "Link-only access" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => update({ visibility: opt.value })}
                      className={`rounded-lg border p-3 text-left transition-all ${
                        data.visibility === opt.value ? "border-primary bg-primary/5 ring-2 ring-ring/20" : "border-border hover:border-border-strong"
                      }`}
                    >
                      <p className="text-caption font-medium">{opt.label}</p>
                      <p className="text-small text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-body font-medium">Require approval</p>
                  <p className="text-caption text-muted-foreground">Manually approve registrations</p>
                </div>
                <button
                  onClick={() => update({ requiresApproval: !data.requiresApproval })}
                  className={`relative h-6 w-11 rounded-full transition-colors ${data.requiresApproval ? "bg-primary" : "bg-border-strong"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${data.requiresApproval ? "translate-x-6" : "translate-x-1"} absolute top-1`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-caption font-medium">Meeting duration (min)</label>
                  <Input type="number" value={data.meetingDuration} onChange={(e) => update({ meetingDuration: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-caption font-medium">Break between (min)</label>
                  <Input type="number" value={data.breakBetweenMeetings} onChange={(e) => update({ breakBetweenMeetings: e.target.value })} />
                </div>
              </div>

              <Input placeholder="Max participants (leave empty for unlimited)" type="number" value={data.maxParticipants} onChange={(e) => update({ maxParticipants: e.target.value })} />
            </div>
          )}

          {error && <p className="text-sm text-destructive mt-4">{error}</p>}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => step > 0 ? setStep(step - 1) : router.push(`/dashboard/w/${workspaceId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {step === 0 ? "Cancel" : "Back"}
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 0 && (!data.name || !data.eventType || !data.startDate || !data.endDate)}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create event
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
