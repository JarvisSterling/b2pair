"use client";

import { useCallback, useEffect, useState } from "react";
import { useEventId } from "@/hooks/use-event-id";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Mic2,
  Users,
  BookmarkPlus,
  BookmarkCheck,
  Coffee,
  Filter,
} from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";

interface Track {
  id: string;
  name: string;
  color: string;
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
    speaker: {
      id: string;
      full_name: string;
      title: string | null;
      company: string | null;
      avatar_url: string | null;
    };
  }[];
}

interface Room {
  id: string;
  name: string;
}

export default function ParticipantAgendaPage() {
  const eventId = useEventId();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [savedSessionIds, setSavedSessionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [filterTrack, setFilterTrack] = useState<string>("all");
  const [filterView, setFilterView] = useState<"all" | "my-schedule">("all");

  const loadData = useCallback(async () => {
    const [agendaRes, scheduleRes] = await Promise.all([
      fetch(`/api/agenda?eventId=${eventId}`),
      fetch(`/api/agenda/schedule?eventId=${eventId}`),
    ]);
    const agenda = await agendaRes.json();
    const schedule = await scheduleRes.json();

    setTracks(agenda.tracks || []);
    setSessions(agenda.sessions || []);
    setRooms(agenda.rooms || []);
    setSavedSessionIds(schedule.sessionIds || []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function toggleSession(sessionId: string) {
    setToggling(sessionId);
    const res = await fetch("/api/agenda/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, sessionId }),
    });
    const { saved } = await res.json();

    setSavedSessionIds((prev) =>
      saved ? [...prev, sessionId] : prev.filter((id) => id !== sessionId)
    );
    setToggling(null);
  }

  // Group sessions by date
  const sessionsByDate: Record<string, Session[]> = {};
  const filtered = sessions.filter((s) => {
    if (filterTrack !== "all" && s.track_id !== filterTrack) return false;
    if (filterView === "my-schedule" && !savedSessionIds.includes(s.id)) return false;
    return true;
  });

  filtered.forEach((s) => {
    const date = new Date(s.start_time).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!sessionsByDate[date]) sessionsByDate[date] = [];
    sessionsByDate[date].push(s);
  });

  const savedCount = savedSessionIds.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Agenda</h1>
          <p className="mt-1 text-body text-muted-foreground">
            {sessions.length} sessions
            {savedCount > 0 && ` · ${savedCount} in your schedule`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1">
          <button
            onClick={() => setFilterView("all")}
            className={`rounded-sm px-3 py-2 text-caption font-medium transition-all ${
              filterView === "all"
                ? "bg-primary/5 text-primary"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            All sessions
          </button>
          <button
            onClick={() => setFilterView("my-schedule")}
            className={`rounded-sm px-3 py-2 text-caption font-medium transition-all ${
              filterView === "my-schedule"
                ? "bg-primary/5 text-primary"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            My schedule
            {savedCount > 0 && (
              <span className="ml-1.5 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px]">
                {savedCount}
              </span>
            )}
          </button>
        </div>

        {tracks.length > 0 && (
          <div className="flex gap-1 ml-auto">
            <button
              onClick={() => setFilterTrack("all")}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all ${
                filterTrack === "all"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-border-strong"
              }`}
            >
              All tracks
            </button>
            {tracks.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterTrack(t.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all flex items-center gap-1 ${
                  filterTrack === t.id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-border-strong"
                }`}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sessions */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-body text-muted-foreground">
              {filterView === "my-schedule"
                ? "No sessions in your schedule yet."
                : "No sessions match your filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(sessionsByDate).map(([date, daySessions]) => (
            <div key={date}>
              <h3 className="text-caption font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1 z-10">
                {date}
              </h3>
              <div className="space-y-2">
                {daySessions.map((session) => {
                  const track = tracks.find((t) => t.id === session.track_id);
                  const room = rooms.find((r) => r.id === session.room_id);
                  const isSaved = savedSessionIds.includes(session.id);
                  const startTime = new Date(session.start_time).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const endTime = new Date(session.end_time).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const durationMin = Math.round(
                    (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000
                  );

                  return (
                    <Card
                      key={session.id}
                      className={`transition-all ${
                        session.is_break ? "opacity-60" : isSaved ? "ring-1 ring-primary/30" : ""
                      }`}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <div className="text-right shrink-0 w-16">
                            <p className="text-caption font-medium">{startTime}</p>
                            <p className="text-small text-muted-foreground">{durationMin}min</p>
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
                              <p className="text-caption text-muted-foreground mb-2">
                                {session.description}
                              </p>
                            )}

                            {/* Speakers */}
                            {session.session_speakers?.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {session.session_speakers.map((ss) => (
                                  <div
                                    key={ss.speaker.id}
                                    className="flex items-center gap-1.5 text-caption"
                                  >
                                    {ss.speaker.avatar_url ? (
                                      <SafeImage src={ss.speaker.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" width={20} height={20} />
                                    ) : (
                                      <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-medium">
                                        {ss.speaker.full_name[0]}
                                      </div>
                                    )}
                                    <span className="font-medium">{ss.speaker.full_name}</span>
                                    {ss.speaker.company && (
                                      <span className="text-muted-foreground">
                                        {ss.speaker.company}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
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
                            </div>
                          </div>

                          {!session.is_break && (
                            <Button
                              variant={isSaved ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleSession(session.id)}
                              disabled={toggling === session.id}
                              className="shrink-0"
                            >
                              {toggling === session.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : isSaved ? (
                                <>
                                  <BookmarkCheck className="mr-1 h-3.5 w-3.5" />
                                  Saved
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus className="mr-1 h-3.5 w-3.5" />
                                  Save
                                </>
                              )}
                            </Button>
                          )}
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
  );
}
