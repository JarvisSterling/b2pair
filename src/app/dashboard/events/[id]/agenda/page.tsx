"use client";

import { useState } from "react";
import { useSWRMultiFetch } from "@/hooks/use-swr-fetch";
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
  BookmarkPlus,
  BookmarkCheck,
  X,
  ChevronRight,
} from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { toast } from "sonner";

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
    role: string | null;
    speaker: {
      id: string;
      full_name: string;
      title: string | null;
      company: string | null;
      bio: string | null;
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
  const { data: agendaData, isLoading: loading, mutate } = useSWRMultiFetch(
    eventId ? `agenda-${eventId}` : null,
    [`/api/agenda?eventId=${eventId}`, `/api/agenda/schedule?eventId=${eventId}`],
    ([agenda, schedule]) => ({
      tracks: agenda.tracks || [],
      sessions: agenda.sessions || [],
      rooms: agenda.rooms || [],
      savedSessionIds: schedule.sessionIds || [],
    })
  );

  const tracks: Track[] = agendaData?.tracks || [];
  const sessions: Session[] = agendaData?.sessions || [];
  const rooms: Room[] = agendaData?.rooms || [];
  const [localSavedIds, setLocalSavedIds] = useState<string[] | null>(null);
  const savedSessionIds = localSavedIds ?? agendaData?.savedSessionIds ?? [];

  const [toggling, setToggling] = useState<string | null>(null);
  const [filterTrack, setFilterTrack] = useState<string>("all");
  const [filterView, setFilterView] = useState<"all" | "my-schedule">("all");
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  async function toggleSession(sessionId: string) {
    setToggling(sessionId);
    const toastId = toast.loading("Saving...");
    try {
      const res = await fetch("/api/agenda/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, sessionId }),
      });
      if (!res.ok) throw new Error("Failed to update schedule");
      const { saved } = await res.json();
      toast.success("Schedule updated", { id: toastId });

      setLocalSavedIds((prev) => {
        const current = prev ?? savedSessionIds;
        return saved ? [...current, sessionId] : current.filter((id: string) => id !== sessionId);
      });
    } catch {
      toast.error("Failed to save", { id: toastId });
    } finally {
      setToggling(null);
    }
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
                        session.is_break ? "opacity-60" : isSaved ? "ring-1 ring-primary/30" : "cursor-pointer hover:border-border-strong hover:shadow-sm"
                      }`}
                      onClick={() => !session.is_break && setSelectedSession(session)}
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
                                      <SafeImage src={ss.speaker.avatar_url}
 alt=""
 className="h-5 w-5 rounded-full object-cover" width={20} height={20} />
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
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                variant={isSaved ? "default" : "outline"}
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); toggleSession(session.id); }}
                                disabled={toggling === session.id}
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
                              <ChevronRight className="h-4 w-4 text-muted-foreground/40 hidden sm:block" />
                            </div>
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

      {/* Session detail modal */}
      {selectedSession && (() => {
        const s = selectedSession;
        const track = tracks.find((t) => t.id === s.track_id);
        const room = rooms.find((r) => r.id === s.room_id);
        const isSaved = savedSessionIds.includes(s.id);
        const startTime = new Date(s.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        const endTime = new Date(s.end_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        const date = new Date(s.start_time).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
        const durationMin = Math.round((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000);

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedSession(null)}>
            <div className="w-full max-w-lg rounded-xl bg-card border border-border shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              {track && (
                <div className="h-1.5 w-full" style={{ backgroundColor: track.color }} />
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{s.session_type}</Badge>
                      {track && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: track.color }} />
                          {track.name}
                        </span>
                      )}
                    </div>
                    <h2 className="text-h3 font-semibold">{s.title}</h2>
                  </div>
                  <button onClick={() => setSelectedSession(null)} className="text-muted-foreground hover:text-foreground shrink-0 p-1">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Time + room */}
                <div className="flex flex-wrap gap-4 text-caption text-muted-foreground mb-4">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> {date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> {startTime} – {endTime} <span className="text-muted-foreground/60">({durationMin} min)</span>
                  </span>
                  {room && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> {room.name}
                    </span>
                  )}
                </div>

                {/* Description */}
                {s.description && (
                  <p className="text-body text-muted-foreground mb-4 leading-relaxed">{s.description}</p>
                )}

                {/* Speakers */}
                {s.session_speakers?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-caption font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Mic2 className="h-3.5 w-3.5" /> Speakers
                    </p>
                    <div className="space-y-3">
                      {s.session_speakers.map((ss) => (
                        <div key={ss.speaker.id} className="flex items-start gap-3">
                          {ss.speaker.avatar_url ? (
                            <SafeImage src={ss.speaker.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0 mt-0.5" width={40} height={40} />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-body font-semibold shrink-0 mt-0.5">
                              {ss.speaker.full_name[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-body font-medium">{ss.speaker.full_name}</p>
                              {ss.role && (
                                <Badge variant="secondary" className="text-[10px] capitalize">{ss.role}</Badge>
                              )}
                            </div>
                            {(ss.speaker.title || ss.speaker.company) && (
                              <p className="text-caption text-muted-foreground">
                                {[ss.speaker.title, ss.speaker.company].filter(Boolean).join(" · ")}
                              </p>
                            )}
                            {ss.speaker.bio && (
                              <p className="text-caption text-muted-foreground mt-1 leading-relaxed">{ss.speaker.bio}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save button */}
                <Button
                  variant={isSaved ? "default" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={() => toggleSession(s.id)}
                  disabled={toggling === s.id}
                >
                  {toggling === s.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : isSaved ? (
                    <><BookmarkCheck className="mr-2 h-4 w-4" /> Saved to my schedule</>
                  ) : (
                    <><BookmarkPlus className="mr-2 h-4 w-4" /> Save to my schedule</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
