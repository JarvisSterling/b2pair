"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEventId } from "@/hooks/use-event-id";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, Trash2, Globe, Check } from "lucide-react";

interface EventSettings {
  id: string;
  name: string;
  description: string | null;
  status: string;
  max_participants: number | null;
  requires_approval: boolean;
  meeting_duration_minutes: number;
  max_meetings_per_participant: number;
  break_between_meetings: number;
  registration_open: boolean;
  primary_color: string;
}

export default function EventSettingsPage() {
  const router = useRouter();
  const eventId = useEventId();
  const [event, setEvent] = useState<EventSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadEvent = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("events")
      .select("id, name, description, status, max_participants, requires_approval, meeting_duration_minutes, max_meetings_per_participant, break_between_meetings, registration_open, primary_color")
      .eq("id", eventId)
      .single();

    if (data) setEvent(data as EventSettings);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  async function handleSave() {
    if (!event) return;
    setSaving(true);

    const supabase = createClient();
    await supabase
      .from("events")
      .update({
        name: event.name,
        description: event.description,
        max_participants: event.max_participants,
        requires_approval: event.requires_approval,
        meeting_duration_minutes: event.meeting_duration_minutes,
        max_meetings_per_participant: event.max_meetings_per_participant,
        break_between_meetings: event.break_between_meetings,
        registration_open: event.registration_open,
        primary_color: event.primary_color,
      })
      .eq("id", eventId);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handlePublish() {
    if (!event) return;
    const supabase = createClient();
    await supabase
      .from("events")
      .update({ status: "published" })
      .eq("id", eventId);

    setEvent({ ...event, status: "published" });
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this event? This cannot be undone.")) return;

    const supabase = createClient();
    await supabase.from("events").delete().eq("id", eventId);
    router.push("/dashboard");
    router.refresh();
  }

  if (loading || !event) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Event settings</h1>
          <p className="mt-1 text-body text-muted-foreground">{event.name}</p>
        </div>
        <div className="flex gap-2 items-center">
          {saved && (
            <span className="flex items-center gap-1 text-caption text-success animate-fade-in">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      {/* General */}
      <Card className="mb-6">
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-caption font-medium">Event name</label>
            <Input value={event.name} onChange={(e) => setEvent({ ...event, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-caption font-medium">Description</label>
            <textarea
              rows={3}
              value={event.description || ""}
              onChange={(e) => setEvent({ ...event, description: e.target.value })}
              className="flex w-full rounded bg-input px-4 py-3 text-body text-foreground border border-border placeholder:text-muted-foreground transition-colors duration-150 hover:border-border-strong focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/20 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Registration */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Registration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-caption font-medium">Max participants</label>
            <Input
              type="number"
              placeholder="Unlimited"
              value={event.max_participants || ""}
              onChange={(e) => setEvent({ ...event, max_participants: e.target.value ? parseInt(e.target.value) : null })}
            />
          </div>

          <ToggleRow
            label="Registration open"
            description="Allow new participants to register"
            checked={event.registration_open}
            onChange={(v) => setEvent({ ...event, registration_open: v })}
          />

          <ToggleRow
            label="Require approval"
            description="Manually approve each registration"
            checked={event.requires_approval}
            onChange={(v) => setEvent({ ...event, requires_approval: v })}
          />
        </CardContent>
      </Card>

      {/* Meetings */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Meeting defaults</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-caption font-medium">Duration (min)</label>
              <Input
                type="number"
                value={event.meeting_duration_minutes}
                onChange={(e) => setEvent({ ...event, meeting_duration_minutes: parseInt(e.target.value) || 30 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-caption font-medium">Max per person</label>
              <Input
                type="number"
                value={event.max_meetings_per_participant}
                onChange={(e) => setEvent({ ...event, max_meetings_per_participant: parseInt(e.target.value) || 20 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-caption font-medium">Break (min)</label>
              <Input
                type="number"
                value={event.break_between_meetings}
                onChange={(e) => setEvent({ ...event, break_between_meetings: parseInt(e.target.value) || 5 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status & Danger */}
      <Card>
        <CardHeader><CardTitle>Event status</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {event.status === "draft" && (
            <div className="flex items-center justify-between rounded-sm border border-border p-4">
              <div>
                <p className="text-body font-medium">Publish event</p>
                <p className="text-caption text-muted-foreground">Make this event visible and open for registration</p>
              </div>
              <Button onClick={handlePublish}>
                <Globe className="mr-2 h-4 w-4" />
                Publish
              </Button>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between rounded-sm border border-destructive/20 p-4">
            <div>
              <p className="text-body font-medium text-destructive">Delete event</p>
              <p className="text-caption text-muted-foreground">Permanently delete this event and all its data</p>
            </div>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-sm border border-border p-4">
      <div>
        <p className="text-body font-medium">{label}</p>
        <p className="text-caption text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
          checked ? "bg-primary" : "bg-border-strong"
        }`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`} />
      </button>
    </div>
  );
}
