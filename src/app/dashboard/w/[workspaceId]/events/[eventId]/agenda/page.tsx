"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Clock,
  Users,
  Mic2,
  MapPin,
  ChevronDown,
  ChevronRight,
  Pencil,
  X,
  Save,
  Coffee,
} from "lucide-react";

interface Track {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
}

interface Speaker {
  id: string;
  full_name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  avatar_url: string | null;
}

interface Room {
  id: string;
  name: string;
  capacity: number | null;
  location_note: string | null;
}

interface Session {
  id: string;
  track_id: string | null;
  room_id: string | null;
  title: string;
  description: string | null;
  session_type: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  session_speakers: {
    id: string;
    speaker: Speaker;
  }[];
}

const SESSION_TYPES = [
  { value: "talk", label: "Talk", icon: Mic2 },
  { value: "panel", label: "Panel", icon: Users },
  { value: "workshop", label: "Workshop", icon: Calendar },
  { value: "break", label: "Break", icon: Coffee },
  { value: "networking", label: "Networking", icon: Users },
  { value: "keynote", label: "Keynote", icon: Mic2 },
];

export default function AgendaBuilderPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [tracks, setTracks] = useState<Track[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState<"sessions" | "speakers" | "tracks" | "rooms">("sessions");
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showSpeakerForm, setShowSpeakerForm] = useState(false);
  const [showTrackForm, setShowTrackForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [sessionForm, setSessionForm] = useState({
    title: "",
    description: "",
    session_type: "talk",
    start_time: "",
    end_time: "",
    track_id: "",
    room_id: "",
    is_break: false,
    speaker_ids: [] as string[],
  });

  const [speakerForm, setSpeakerForm] = useState({
    full_name: "",
    title: "",
    company: "",
    bio: "",
  });

  const [trackForm, setTrackForm] = useState({ name: "", color: "#0071E3", description: "" });
  const [roomForm, setRoomForm] = useState({ name: "", capacity: "", location_note: "" });

  const loadAgenda = useCallback(async () => {
    const res = await fetch(`/api/agenda?eventId=${eventId}`);
    const data = await res.json();
    setTracks(data.tracks || []);
    setSessions(data.sessions || []);
    setSpeakers(data.speakers || []);
    setRooms(data.rooms || []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadAgenda();
  }, [loadAgenda]);

  function resetSessionForm() {
    setSessionForm({
      title: "", description: "", session_type: "talk",
      start_time: "", end_time: "", track_id: "", room_id: "",
      is_break: false, speaker_ids: [],
    });
    setEditingSession(null);
    setShowSessionForm(false);
  }

  function resetSpeakerForm() {
    setSpeakerForm({ full_name: "", title: "", company: "", bio: "" });
    setEditingSpeaker(null);
    setShowSpeakerForm(false);
  }

  function editSession(s: Session) {
    setSessionForm({
      title: s.title,
      description: s.description || "",
      session_type: s.session_type,
      start_time: s.start_time ? new Date(s.start_time).toISOString().slice(0, 16) : "",
      end_time: s.end_time ? new Date(s.end_time).toISOString().slice(0, 16) : "",
      track_id: s.track_id || "",
      room_id: s.room_id || "",
      is_break: s.is_break,
      speaker_ids: s.session_speakers?.map((ss) => ss.speaker?.id).filter(Boolean) || [],
    });
    setEditingSession(s);
    setShowSessionForm(true);
  }

  function editSpeaker(sp: Speaker) {
    setSpeakerForm({
      full_name: sp.full_name,
      title: sp.title || "",
      company: sp.company || "",
      bio: sp.bio || "",
    });
    setEditingSpeaker(sp);
    setShowSpeakerForm(true);
  }

  async function saveSession() {
    if (!sessionForm.title || !sessionForm.start_time || !sessionForm.end_time) return;
    setSaving(true);

    const payload = {
      type: "session",
      event_id: eventId,
      title: sessionForm.title,
      description: sessionForm.description || null,
      session_type: sessionForm.session_type,
      start_time: new Date(sessionForm.start_time).toISOString(),
      end_time: new Date(sessionForm.end_time).toISOString(),
      track_id: sessionForm.track_id || null,
      room_id: sessionForm.room_id || null,
      is_break: sessionForm.session_type === "break",
      speaker_ids: sessionForm.speaker_ids,
    };

    if (editingSession) {
      await fetch("/api/agenda", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id: editingSession.id }),
      });
    } else {
      await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    await loadAgenda();
    resetSessionForm();
    setSaving(false);
  }

  async function saveSpeaker() {
    if (!speakerForm.full_name) return;
    setSaving(true);

    const payload = {
      type: "speaker",
      event_id: eventId,
      ...speakerForm,
    };

    if (editingSpeaker) {
      await fetch("/api/agenda", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id: editingSpeaker.id }),
      });
    } else {
      await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    await loadAgenda();
    resetSpeakerForm();
    setSaving(false);
  }

  async function saveTrack() {
    if (!trackForm.name) return;
    setSaving(true);
    await fetch("/api/agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "track", event_id: eventId, ...trackForm }),
    });
    await loadAgenda();
    setTrackForm({ name: "", color: "#0071E3", description: "" });
    setShowTrackForm(false);
    setSaving(false);
  }

  async function saveRoom() {
    if (!roomForm.name) return;
    setSaving(true);
    await fetch("/api/agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "room",
        event_id: eventId,
        name: roomForm.name,
        capacity: roomForm.capacity ? parseInt(roomForm.capacity) : null,
        location_note: roomForm.location_note || null,
      }),
    });
    await loadAgenda();
    setRoomForm({ name: "", capacity: "", location_note: "" });
    setShowRoomForm(false);
    setSaving(false);
  }

  async function handleDelete(type: string, id: string) {
    setDeleting(id);
    await fetch(`/api/agenda?type=${type}&id=${id}`, { method: "DELETE" });
    await loadAgenda();
    setDeleting(null);
  }

  function toggleSpeaker(speakerId: string) {
    setSessionForm((prev) => ({
      ...prev,
      speaker_ids: prev.speaker_ids.includes(speakerId)
        ? prev.speaker_ids.filter((id) => id !== speakerId)
        : [...prev.speaker_ids, speakerId],
    }));
  }

  // Group sessions by date
  const sessionsByDate: Record<string, Session[]> = {};
  sessions.forEach((s) => {
    const date = new Date(s.start_time).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!sessionsByDate[date]) sessionsByDate[date] = [];
    sessionsByDate[date].push(s);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Agenda Builder</h1>
          <p className="mt-1 text-body text-muted-foreground">
            {sessions.length} sessions · {speakers.length} speakers · {tracks.length} tracks
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {[
          { key: "sessions", label: "Sessions", count: sessions.length },
          { key: "speakers", label: "Speakers", count: speakers.length },
          { key: "tracks", label: "Tracks", count: tracks.length },
          { key: "rooms", label: "Rooms", count: rooms.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 text-caption font-medium border-b-2 -mb-px transition-all ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* SESSIONS TAB */}
      {activeTab === "sessions" && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => { resetSessionForm(); setShowSessionForm(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add session
            </Button>
          </div>

          {/* Session form */}
          {showSessionForm && (
            <Card className="mb-6 animate-fade-in">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-body font-semibold">
                    {editingSession ? "Edit session" : "New session"}
                  </h3>
                  <button onClick={resetSessionForm}>
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-caption font-medium mb-1.5 block">Title</label>
                    <Input
                      value={sessionForm.title}
                      onChange={(e) => setSessionForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Session title"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-caption font-medium mb-1.5 block">Description</label>
                    <textarea
                      value={sessionForm.description}
                      onChange={(e) => setSessionForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="What's this session about?"
                      rows={2}
                      className="flex w-full rounded bg-input px-4 py-3 text-body text-foreground border border-border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/20 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Type</label>
                    <select
                      value={sessionForm.session_type}
                      onChange={(e) => setSessionForm((f) => ({ ...f, session_type: e.target.value }))}
                      className="flex h-10 w-full rounded bg-input px-3 text-body border border-border focus-visible:outline-none focus-visible:border-primary/50"
                    >
                      {SESSION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Track</label>
                    <select
                      value={sessionForm.track_id}
                      onChange={(e) => setSessionForm((f) => ({ ...f, track_id: e.target.value }))}
                      className="flex h-10 w-full rounded bg-input px-3 text-body border border-border focus-visible:outline-none focus-visible:border-primary/50"
                    >
                      <option value="">No track</option>
                      {tracks.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Start time</label>
                    <Input
                      type="datetime-local"
                      value={sessionForm.start_time}
                      onChange={(e) => setSessionForm((f) => ({ ...f, start_time: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-caption font-medium mb-1.5 block">End time</label>
                    <Input
                      type="datetime-local"
                      value={sessionForm.end_time}
                      onChange={(e) => setSessionForm((f) => ({ ...f, end_time: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Room</label>
                    <select
                      value={sessionForm.room_id}
                      onChange={(e) => setSessionForm((f) => ({ ...f, room_id: e.target.value }))}
                      className="flex h-10 w-full rounded bg-input px-3 text-body border border-border focus-visible:outline-none focus-visible:border-primary/50"
                    >
                      <option value="">No room</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  {speakers.length > 0 && sessionForm.session_type !== "break" && (
                    <div className="sm:col-span-2">
                      <label className="text-caption font-medium mb-1.5 block">Speakers</label>
                      <div className="flex flex-wrap gap-2">
                        {speakers.map((sp) => (
                          <button
                            key={sp.id}
                            type="button"
                            onClick={() => toggleSpeaker(sp.id)}
                            className={`rounded-full border px-3 py-1.5 text-caption transition-all ${
                              sessionForm.speaker_ids.includes(sp.id)
                                ? "border-primary bg-primary/5 text-primary font-medium"
                                : "border-border text-muted-foreground hover:border-border-strong"
                            }`}
                          >
                            {sp.full_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-5">
                  <Button onClick={saveSession} disabled={saving || !sessionForm.title}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {editingSession ? "Update" : "Create"} session
                  </Button>
                  <Button variant="outline" onClick={resetSessionForm}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sessions list grouped by date */}
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Calendar className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                <p className="text-body text-muted-foreground">No sessions yet.</p>
                <p className="mt-1 text-caption text-muted-foreground">
                  Add tracks and speakers first, then create your sessions.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(sessionsByDate).map(([date, daySessions]) => (
                <div key={date}>
                  <h3 className="text-caption font-semibold text-muted-foreground mb-3">{date}</h3>
                  <div className="space-y-2">
                    {daySessions.map((session) => {
                      const track = tracks.find((t) => t.id === session.track_id);
                      const room = rooms.find((r) => r.id === session.room_id);
                      const startTime = new Date(session.start_time).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      });
                      const endTime = new Date(session.end_time).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      });

                      return (
                        <Card
                          key={session.id}
                          className={`group ${session.is_break ? "opacity-60" : ""}`}
                        >
                          <CardContent className="py-4">
                            <div className="flex items-start gap-3">
                              <div className="text-right shrink-0 w-20">
                                <p className="text-caption font-medium">{startTime}</p>
                                <p className="text-small text-muted-foreground">{endTime}</p>
                              </div>

                              {track && (
                                <div
                                  className="w-1 self-stretch rounded-full shrink-0"
                                  style={{ backgroundColor: track.color }}
                                />
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-body font-medium">{session.title}</p>
                                  <Badge variant="outline" className="text-[10px]">
                                    {session.session_type}
                                  </Badge>
                                </div>

                                {session.description && (
                                  <p className="text-caption text-muted-foreground line-clamp-1 mb-1">
                                    {session.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-3 text-small text-muted-foreground">
                                  {track && (
                                    <span className="flex items-center gap-1">
                                      <div
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: track.color }}
                                      />
                                      {track.name}
                                    </span>
                                  )}
                                  {room && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {room.name}
                                    </span>
                                  )}
                                  {session.session_speakers?.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Mic2 className="h-3 w-3" />
                                      {session.session_speakers.map((ss) => ss.speaker?.full_name).join(", ")}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={() => editSession(session)}
                                  className="p-1.5 rounded hover:bg-secondary"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={() => handleDelete("session", session.id)}
                                  className="p-1.5 rounded hover:bg-secondary"
                                  disabled={deleting === session.id}
                                >
                                  {deleting === session.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SPEAKERS TAB */}
      {activeTab === "speakers" && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => { resetSpeakerForm(); setShowSpeakerForm(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add speaker
            </Button>
          </div>

          {showSpeakerForm && (
            <Card className="mb-6 animate-fade-in">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-body font-semibold">
                    {editingSpeaker ? "Edit speaker" : "New speaker"}
                  </h3>
                  <button onClick={resetSpeakerForm}><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Name</label>
                    <Input
                      value={speakerForm.full_name}
                      onChange={(e) => setSpeakerForm((f) => ({ ...f, full_name: e.target.value }))}
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Title</label>
                    <Input
                      value={speakerForm.title}
                      onChange={(e) => setSpeakerForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Job title"
                    />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Company</label>
                    <Input
                      value={speakerForm.company}
                      onChange={(e) => setSpeakerForm((f) => ({ ...f, company: e.target.value }))}
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Bio</label>
                    <Input
                      value={speakerForm.bio}
                      onChange={(e) => setSpeakerForm((f) => ({ ...f, bio: e.target.value }))}
                      placeholder="Short bio"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <Button onClick={saveSpeaker} disabled={saving || !speakerForm.full_name}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {editingSpeaker ? "Update" : "Create"} speaker
                  </Button>
                  <Button variant="outline" onClick={resetSpeakerForm}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {speakers.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Mic2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                <p className="text-body text-muted-foreground">No speakers yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {speakers.map((sp) => (
                <Card key={sp.id} className="group">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-small font-medium shrink-0">
                        {sp.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-medium">{sp.full_name}</p>
                        <p className="text-caption text-muted-foreground truncate">
                          {[sp.title, sp.company].filter(Boolean).join(" at ")}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => editSpeaker(sp)} className="p-1.5 rounded hover:bg-secondary">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleDelete("speaker", sp.id)}
                          className="p-1.5 rounded hover:bg-secondary"
                          disabled={deleting === sp.id}
                        >
                          {deleting === sp.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          )}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TRACKS TAB */}
      {activeTab === "tracks" && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowTrackForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add track
            </Button>
          </div>

          {showTrackForm && (
            <Card className="mb-6 animate-fade-in">
              <CardContent className="pt-6">
                <h3 className="text-body font-semibold mb-4">New track</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Name</label>
                    <Input
                      value={trackForm.name}
                      onChange={(e) => setTrackForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g., Main Stage"
                    />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={trackForm.color}
                        onChange={(e) => setTrackForm((f) => ({ ...f, color: e.target.value }))}
                        className="h-10 w-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={trackForm.color}
                        onChange={(e) => setTrackForm((f) => ({ ...f, color: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Description</label>
                    <Input
                      value={trackForm.description}
                      onChange={(e) => setTrackForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <Button onClick={saveTrack} disabled={saving || !trackForm.name}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create track
                  </Button>
                  <Button variant="outline" onClick={() => setShowTrackForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {tracks.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Calendar className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                <p className="text-body text-muted-foreground">No tracks yet.</p>
                <p className="mt-1 text-caption text-muted-foreground">
                  Tracks help organize sessions into parallel streams.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tracks.map((track) => {
                const trackSessions = sessions.filter((s) => s.track_id === track.id);
                return (
                  <Card key={track.id} className="group">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-8 rounded-full shrink-0"
                          style={{ backgroundColor: track.color }}
                        />
                        <div className="flex-1">
                          <p className="text-body font-medium">{track.name}</p>
                          <p className="text-caption text-muted-foreground">
                            {trackSessions.length} session{trackSessions.length !== 1 ? "s" : ""}
                            {track.description ? ` · ${track.description}` : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete("track", track.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-secondary transition-opacity"
                          disabled={deleting === track.id}
                        >
                          {deleting === track.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          )}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ROOMS TAB */}
      {activeTab === "rooms" && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowRoomForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add room
            </Button>
          </div>

          {showRoomForm && (
            <Card className="mb-6 animate-fade-in">
              <CardContent className="pt-6">
                <h3 className="text-body font-semibold mb-4">New room</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Name</label>
                    <Input
                      value={roomForm.name}
                      onChange={(e) => setRoomForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g., Hall A"
                    />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Capacity</label>
                    <Input
                      type="number"
                      value={roomForm.capacity}
                      onChange={(e) => setRoomForm((f) => ({ ...f, capacity: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="text-caption font-medium mb-1.5 block">Location note</label>
                    <Input
                      value={roomForm.location_note}
                      onChange={(e) => setRoomForm((f) => ({ ...f, location_note: e.target.value }))}
                      placeholder="e.g., 2nd floor"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <Button onClick={saveRoom} disabled={saving || !roomForm.name}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create room
                  </Button>
                  <Button variant="outline" onClick={() => setShowRoomForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {rooms.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <MapPin className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                <p className="text-body text-muted-foreground">No rooms yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <Card key={room.id} className="group">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="text-body font-medium">{room.name}</p>
                        <p className="text-caption text-muted-foreground">
                          {[
                            room.capacity ? `${room.capacity} seats` : null,
                            room.location_note,
                          ].filter(Boolean).join(" · ") || "No details"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete("room", room.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-secondary transition-opacity"
                        disabled={deleting === room.id}
                      >
                        {deleting === room.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
