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
  Check,
  FileText,
  MapPin,
  Palette,
  Settings2,
} from "lucide-react";

const STEPS = [
  { id: "basics", label: "Basics", icon: FileText },
  { id: "location", label: "Location", icon: MapPin },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "settings", label: "Settings", icon: Settings2 },
] as const;

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

interface EventData {
  name: string;
  description: string;
  eventType: string;
  format: string;
  startDate: string;
  endDate: string;
  timezone: string;
  venueName: string;
  venueAddress: string;
  city: string;
  country: string;
  virtualUrl: string;
  primaryColor: string;
  maxParticipants: string;
  requiresApproval: boolean;
  visibility: "public" | "unlisted";
  meetingDuration: string;
  maxMeetingsPerParticipant: string;
  breakBetweenMeetings: string;
}

export default function NewEventPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
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
    venueAddress: "",
    city: "",
    country: "",
    virtualUrl: "",
    primaryColor: "#0071E3",
    maxParticipants: "",
    requiresApproval: false,
    visibility: "public",
    meetingDuration: "30",
    maxMeetingsPerParticipant: "20",
    breakBetweenMeetings: "5",
  });

  function updateData(updates: Partial<EventData>) {
    setData((prev) => ({ ...prev, ...updates }));
  }

  function canProceed(): boolean {
    switch (STEPS[currentStep].id) {
      case "basics":
        return data.name.length > 0 && data.eventType.length > 0 && data.startDate.length > 0 && data.endDate.length > 0;
      case "location":
        if (data.format === "virtual") return true;
        return data.city.length > 0;
      case "branding":
        return true;
      case "settings":
        return true;
      default:
        return false;
    }
  }

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
  }

  async function handleCreate() {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/sign-in");
      return;
    }

    // Check if user is organizer
    const { data: profile } = await supabase
      .from("profiles")
      .select("platform_role")
      .eq("id", user.id)
      .single();

    if (profile?.platform_role !== "organizer") {
      setError("Only organizers can create events.");
      setSaving(false);
      return;
    }

    // Get or create organization
    const { data: memberships } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1);

    let orgId: string;

    if (memberships && memberships.length > 0) {
      orgId = memberships[0].organization_id;
    } else {
      // Create personal organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, company_name")
        .eq("id", user.id)
        .single();

      const orgName = profile?.company_name || `${profile?.full_name}'s Events`;
      const orgSlug = generateSlug(orgName) + "-" + Date.now().toString(36);

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: orgName,
          slug: orgSlug,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (orgError || !org) {
        console.error("Org creation error:", orgError);
        setError(`Failed to create organization: ${orgError?.message || "unknown error"}`);
        setSaving(false);
        return;
      }

      // Add user as owner
      await supabase.from("organization_members").insert({
        organization_id: org.id,
        user_id: user.id,
        role: "owner",
      });

      orgId = org.id;
    }

    // Create event
    const slug = generateSlug(data.name) + "-" + Date.now().toString(36);

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        organization_id: orgId,
        name: data.name,
        slug,
        description: data.description || null,
        event_type: data.eventType,
        format: data.format,
        start_date: new Date(data.startDate).toISOString(),
        end_date: new Date(data.endDate).toISOString(),
        timezone: data.timezone,
        venue_name: data.venueName || null,
        venue_address: data.venueAddress || null,
        city: data.city || null,
        country: data.country || null,
        virtual_url: data.virtualUrl || null,
        primary_color: data.primaryColor,
        max_participants: data.maxParticipants ? parseInt(data.maxParticipants) : null,
        requires_approval: data.requiresApproval,
        visibility: data.visibility,
        meeting_duration_minutes: parseInt(data.meetingDuration),
        max_meetings_per_participant: parseInt(data.maxMeetingsPerParticipant),
        break_between_meetings: parseInt(data.breakBetweenMeetings),
        created_by: user.id,
        status: "draft",
      })
      .select("id")
      .single();

    if (eventError || !event) {
      setError(eventError?.message || "Failed to create event.");
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

    router.push(`/dashboard/events/${event.id}`);
    router.refresh();
  }

  function nextStep() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleCreate();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-h1 font-semibold tracking-tight">Create event</h1>
        <p className="mt-1 text-body text-muted-foreground">
          Set up your event in a few steps. You can always edit later.
        </p>
      </div>

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
                {i < currentStep ? <Check className="h-4 w-4" /> : <span>{i + 1}</span>}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-px w-12 sm:w-20 transition-colors duration-200 ${
                    i < currentStep ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-caption text-muted-foreground">
          {STEPS[currentStep].label}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="animate-fade-in" key={currentStep}>
            {STEPS[currentStep].id === "basics" && (
              <BasicsStep data={data} updateData={updateData} />
            )}
            {STEPS[currentStep].id === "location" && (
              <LocationStep data={data} updateData={updateData} />
            )}
            {STEPS[currentStep].id === "branding" && (
              <BrandingStep data={data} updateData={updateData} />
            )}
            {STEPS[currentStep].id === "settings" && (
              <SettingsStep data={data} updateData={updateData} />
            )}
          </div>

          {error && (
            <p className="mt-4 text-caption text-destructive animate-fade-in">{error}</p>
          )}

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
            <Button onClick={nextStep} disabled={!canProceed() || saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : currentStep === STEPS.length - 1 ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              {currentStep === STEPS.length - 1 ? "Create event" : "Continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Step Components ─── */

function BasicsStep({
  data,
  updateData,
}: {
  data: EventData;
  updateData: (u: Partial<EventData>) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="name" className="text-caption font-medium">
          Event name <span className="text-destructive">*</span>
        </label>
        <Input
          id="name"
          placeholder="e.g. Tech Connect Summit 2026"
          value={data.name}
          onChange={(e) => updateData({ name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-caption font-medium">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          placeholder="What's this event about?"
          value={data.description}
          onChange={(e) => updateData({ description: e.target.value })}
          className="flex w-full rounded bg-input px-4 py-3 text-body text-foreground border border-border placeholder:text-muted-foreground transition-colors duration-150 ease-out hover:border-border-strong focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/20 resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-caption font-medium">
          Event type <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {EVENT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => updateData({ eventType: type.value })}
              className={`
                rounded-sm border px-3 py-3 text-left
                transition-all duration-150 ease-out
                ${
                  data.eventType === type.value
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-border-strong hover:bg-secondary"
                }
              `}
            >
              <p className={`text-caption font-medium ${data.eventType === type.value ? "text-primary" : "text-foreground"}`}>
                {type.label}
              </p>
              <p className="text-small text-muted-foreground mt-0.5">{type.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-caption font-medium">Format</label>
        <div className="flex gap-2">
          {FORMATS.map((format) => (
            <button
              key={format.value}
              type="button"
              onClick={() => updateData({ format: format.value })}
              className={`
                flex-1 rounded-sm border px-3 py-2.5 text-caption text-center
                transition-all duration-150 ease-out
                ${
                  data.format === format.value
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-border bg-background text-foreground hover:border-border-strong hover:bg-secondary"
                }
              `}
            >
              {format.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="startDate" className="text-caption font-medium">
            Start date <span className="text-destructive">*</span>
          </label>
          <Input
            id="startDate"
            type="datetime-local"
            value={data.startDate}
            onChange={(e) => updateData({ startDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="endDate" className="text-caption font-medium">
            End date <span className="text-destructive">*</span>
          </label>
          <Input
            id="endDate"
            type="datetime-local"
            value={data.endDate}
            onChange={(e) => updateData({ endDate: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

function LocationStep({
  data,
  updateData,
}: {
  data: EventData;
  updateData: (u: Partial<EventData>) => void;
}) {
  const isVirtual = data.format === "virtual";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-h2 font-semibold">
          {isVirtual ? "Virtual event details" : "Event location"}
        </h2>
        <p className="mt-1 text-body text-muted-foreground">
          {isVirtual
            ? "Add the link where participants will join."
            : "Where is your event taking place?"}
        </p>
      </div>

      {!isVirtual && (
        <>
          <div className="space-y-2">
            <label htmlFor="venueName" className="text-caption font-medium">
              Venue name
            </label>
            <Input
              id="venueName"
              placeholder="e.g. Convention Center"
              value={data.venueName}
              onChange={(e) => updateData({ venueName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="venueAddress" className="text-caption font-medium">
              Address
            </label>
            <Input
              id="venueAddress"
              placeholder="Street address"
              value={data.venueAddress}
              onChange={(e) => updateData({ venueAddress: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="city" className="text-caption font-medium">
                City <span className="text-destructive">*</span>
              </label>
              <Input
                id="city"
                placeholder="City"
                value={data.city}
                onChange={(e) => updateData({ city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="country" className="text-caption font-medium">
                Country
              </label>
              <Input
                id="country"
                placeholder="Country"
                value={data.country}
                onChange={(e) => updateData({ country: e.target.value })}
              />
            </div>
          </div>
        </>
      )}

      {(isVirtual || data.format === "hybrid") && (
        <div className="space-y-2">
          <label htmlFor="virtualUrl" className="text-caption font-medium">
            Virtual meeting link
          </label>
          <Input
            id="virtualUrl"
            placeholder="https://zoom.us/j/..."
            value={data.virtualUrl}
            onChange={(e) => updateData({ virtualUrl: e.target.value })}
          />
          <p className="text-small text-muted-foreground">
            Zoom, Google Meet, Microsoft Teams, or any video platform.
          </p>
        </div>
      )}
    </div>
  );
}

function BrandingStep({
  data,
  updateData,
}: {
  data: EventData;
  updateData: (u: Partial<EventData>) => void;
}) {
  const COLORS = [
    "#0071E3", "#5856D6", "#AF52DE", "#FF2D55",
    "#FF3B30", "#FF9500", "#FFCC00", "#34C759",
    "#00C7BE", "#30B0C7", "#007AFF", "#1D1D1F",
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-h2 font-semibold">Event branding</h2>
        <p className="mt-1 text-body text-muted-foreground">
          Choose an accent color for your event. You can upload logos and banners later.
        </p>
      </div>

      <div className="space-y-3">
        <label className="text-caption font-medium">Accent color</label>
        <div className="flex flex-wrap gap-3">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => updateData({ primaryColor: color })}
              className={`
                h-10 w-10 rounded-full transition-all duration-150
                ${
                  data.primaryColor === color
                    ? "ring-2 ring-offset-2 ring-primary scale-110"
                    : "hover:scale-105"
                }
              `}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <p className="text-small font-medium text-muted-foreground uppercase tracking-wider">Preview</p>
        <div className="space-y-3">
          <h3 className="text-h2 font-semibold">{data.name || "Event Name"}</h3>
          <p className="text-body text-muted-foreground">
            {data.description || "Your event description will appear here."}
          </p>
          <div className="flex gap-3">
            <button
              className="rounded-sm px-4 py-2 text-caption font-medium text-white transition-all"
              style={{ backgroundColor: data.primaryColor }}
            >
              Register now
            </button>
            <button
              className="rounded-sm border px-4 py-2 text-caption font-medium transition-all"
              style={{ borderColor: data.primaryColor, color: data.primaryColor }}
            >
              Learn more
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsStep({
  data,
  updateData,
}: {
  data: EventData;
  updateData: (u: Partial<EventData>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-h2 font-semibold">Event settings</h2>
        <p className="mt-1 text-body text-muted-foreground">
          Configure meeting and registration defaults. All of these can be changed later.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="maxParticipants" className="text-caption font-medium">
          Maximum participants
        </label>
        <Input
          id="maxParticipants"
          type="number"
          placeholder="Leave empty for unlimited"
          value={data.maxParticipants}
          onChange={(e) => updateData({ maxParticipants: e.target.value })}
        />
      </div>

      {/* Visibility */}
      <div className="space-y-2">
        <label className="text-caption font-medium">Event visibility</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "public" as const, label: "Public", desc: "Visible in event directory" },
            { value: "unlisted" as const, label: "Unlisted", desc: "Only accessible via direct link" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateData({ visibility: opt.value })}
              className={`rounded-lg border p-3 text-left transition-all duration-150 ${
                data.visibility === opt.value
                  ? "border-primary bg-primary/5 ring-2 ring-ring/20"
                  : "border-border hover:border-border-strong"
              }`}
            >
              <p className="text-caption font-medium">{opt.label}</p>
              <p className="text-small text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-sm border border-border p-4">
        <div>
          <p className="text-body font-medium">Require approval</p>
          <p className="text-caption text-muted-foreground">
            Manually approve each registration before they join
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={data.requiresApproval}
          onClick={() => updateData({ requiresApproval: !data.requiresApproval })}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full
            transition-colors duration-200
            ${data.requiresApproval ? "bg-primary" : "bg-border-strong"}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 rounded-full bg-white shadow-sm
              transition-transform duration-200
              ${data.requiresApproval ? "translate-x-6" : "translate-x-1"}
            `}
          />
        </button>
      </div>

      <div className="space-y-4 rounded-sm border border-border p-4">
        <p className="text-caption font-medium">Meeting defaults</p>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="meetingDuration" className="text-small text-muted-foreground">
              Duration (min)
            </label>
            <Input
              id="meetingDuration"
              type="number"
              value={data.meetingDuration}
              onChange={(e) => updateData({ meetingDuration: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="maxMeetings" className="text-small text-muted-foreground">
              Max per person
            </label>
            <Input
              id="maxMeetings"
              type="number"
              value={data.maxMeetingsPerParticipant}
              onChange={(e) => updateData({ maxMeetingsPerParticipant: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="breakTime" className="text-small text-muted-foreground">
              Break (min)
            </label>
            <Input
              id="breakTime"
              type="number"
              value={data.breakBetweenMeetings}
              onChange={(e) => updateData({ breakBetweenMeetings: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
