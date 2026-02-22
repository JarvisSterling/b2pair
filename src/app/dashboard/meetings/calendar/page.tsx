"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Loader2,
  ArrowLeft,
  User,
} from "lucide-react";
import Link from "next/link";

interface CalendarMeeting {
  id: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  meeting_type: string;
  location: string | null;
  agenda_note: string | null;
  is_requester: boolean;
  other_person: {
    full_name: string;
    title: string | null;
    company_name: string | null;
    avatar_url: string | null;
  };
}

const SLOT_HEIGHT = 56;
const VISIBLE_START = 8;
const VISIBLE_END = 20;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 border-amber-300 text-amber-900",
  accepted: "bg-emerald-100 border-emerald-300 text-emerald-900",
  declined: "bg-red-100 border-red-200 text-red-800",
  completed: "bg-muted border-border text-muted-foreground",
  cancelled: "bg-muted border-border text-muted-foreground line-through",
};

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function MeetingsCalendarPage() {
  const [meetings, setMeetings] = useState<CalendarMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"week" | "day">("week");
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedMeeting, setSelectedMeeting] = useState<CalendarMeeting | null>(null);

  const supabase = createBrowserClient();

  useEffect(() => {
    loadMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, view]);

  async function loadMeetings() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: myParticipants } = await supabase
      .from("participants")
      .select("id")
      .eq("user_id", user.id);

    if (!myParticipants?.length) {
      setLoading(false);
      return;
    }

    const myIds = myParticipants.map((p) => p.id);

    // Date range
    let rangeStart: Date, rangeEnd: Date;
    if (view === "week") {
      rangeStart = new Date(currentDate);
      rangeStart.setDate(rangeStart.getDate() - rangeStart.getDay() + 1);
      rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeEnd.getDate() + 7);
    } else {
      rangeStart = new Date(currentDate);
      rangeEnd = new Date(currentDate);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
    }

    const startIso = rangeStart.toISOString();
    const endIso = rangeEnd.toISOString();

    const { data: asRequester } = await supabase
      .from("meetings")
      .select(`
        id, start_time, duration_minutes, status, meeting_type, location, agenda_note,
        recipient:participants!meetings_recipient_id_fkey(profiles!inner(full_name, title, company_name, avatar_url))
      `)
      .in("requester_id", myIds)
      .not("start_time", "is", null)
      .gte("start_time", startIso)
      .lt("start_time", endIso)
      .in("status", ["pending", "accepted", "completed"]);

    const { data: asRecipient } = await supabase
      .from("meetings")
      .select(`
        id, start_time, duration_minutes, status, meeting_type, location, agenda_note,
        requester:participants!meetings_requester_id_fkey(profiles!inner(full_name, title, company_name, avatar_url))
      `)
      .in("recipient_id", myIds)
      .not("start_time", "is", null)
      .gte("start_time", startIso)
      .lt("start_time", endIso)
      .in("status", ["pending", "accepted", "completed"]);

    const combined: CalendarMeeting[] = [
      ...(asRequester || []).map((m: any) => ({
        id: m.id,
        start_time: m.start_time,
        duration_minutes: m.duration_minutes,
        status: m.status,
        meeting_type: m.meeting_type,
        location: m.location,
        agenda_note: m.agenda_note,
        is_requester: true,
        other_person: m.recipient?.profiles || { full_name: "Unknown" },
      })),
      ...(asRecipient || []).map((m: any) => ({
        id: m.id,
        start_time: m.start_time,
        duration_minutes: m.duration_minutes,
        status: m.status,
        meeting_type: m.meeting_type,
        location: m.location,
        agenda_note: m.agenda_note,
        is_requester: false,
        other_person: m.requester?.profiles || { full_name: "Unknown" },
      })),
    ];

    setMeetings(combined);
    setLoading(false);
  }

  function navigate(dir: number) {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + (view === "week" ? dir * 7 : dir));
      return d;
    });
  }

  function goToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCurrentDate(d);
  }

  function getWeekDays(): Date[] {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }

  function getMeetingsForDate(dateStr: string) {
    return meetings.filter((m) => {
      const mDate = new Date(m.start_time).toISOString().split("T")[0];
      return mDate === dateStr;
    });
  }

  const today = new Date().toISOString().split("T")[0];
  const weekDays = view === "week" ? getWeekDays() : [currentDate];
  const hours = Array.from({ length: VISIBLE_END - VISIBLE_START }, (_, i) => VISIBLE_START + i);

  const headerText = view === "week"
    ? (() => {
        const days = getWeekDays();
        const s = days[0];
        const e = days[6];
        if (s.getMonth() === e.getMonth()) {
          return `${s.toLocaleDateString("en-US", { month: "long" })} ${s.getDate()} - ${e.getDate()}, ${s.getFullYear()}`;
        }
        return `${s.toLocaleDateString("en-US", { month: "short" })} ${s.getDate()} - ${e.toLocaleDateString("en-US", { month: "short" })} ${e.getDate()}, ${e.getFullYear()}`;
      })()
    : currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/meetings" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-h2 font-semibold tracking-tight">Calendar</h1>
            <p className="text-caption text-muted-foreground">{headerText}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "week" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              Week
            </button>
            <button
              onClick={() => setView("day")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "day" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              Day
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="text-xs font-medium">
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className={view === "week" ? "min-w-[700px]" : ""}>
              {/* Day headers */}
              <div className={`grid border-b ${view === "week" ? "grid-cols-[60px_repeat(7,1fr)]" : "grid-cols-[60px_1fr]"}`}>
                <div className="p-2" />
                {weekDays.map((d) => {
                  const dateStr = d.toISOString().split("T")[0];
                  const isToday = dateStr === today;
                  const dayMeetings = getMeetingsForDate(dateStr);

                  return (
                    <div
                      key={dateStr}
                      className={`p-3 text-center border-l ${isToday ? "bg-primary/5" : ""}`}
                      onClick={() => { setView("day"); setCurrentDate(d); }}
                      role="button"
                    >
                      <p className="text-[11px] font-medium text-muted-foreground uppercase">
                        {d.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <p className={`text-lg font-semibold mt-0.5 ${isToday ? "text-primary" : ""}`}>
                        {d.getDate()}
                      </p>
                      {dayMeetings.length > 0 && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">
                          {dayMeetings.length}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Time grid */}
              <div
                className={`grid relative ${view === "week" ? "grid-cols-[60px_repeat(7,1fr)]" : "grid-cols-[60px_1fr]"}`}
                style={{ height: SLOT_HEIGHT * hours.length }}
              >
                {/* Hour labels */}
                <div className="relative">
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className="absolute right-0 pr-3 text-[11px] text-muted-foreground w-full text-right"
                      style={{ top: i * SLOT_HEIGHT }}
                    >
                      {formatHour(h)}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map((d) => {
                  const dateStr = d.toISOString().split("T")[0];
                  const dayMeetings = getMeetingsForDate(dateStr);
                  const isToday = dateStr === today;

                  return (
                    <div key={dateStr} className={`relative border-l ${isToday ? "bg-primary/[0.02]" : ""}`}>
                      {/* Hour lines */}
                      {hours.map((h, i) => (
                        <div
                          key={h}
                          className="absolute w-full border-t border-dashed border-border/40"
                          style={{ top: i * SLOT_HEIGHT }}
                        />
                      ))}

                      {/* Now indicator */}
                      {isToday && (() => {
                        const now = new Date();
                        const nowMinutes = now.getHours() * 60 + now.getMinutes();
                        const top = ((nowMinutes / 60) - VISIBLE_START) * SLOT_HEIGHT;
                        if (top < 0 || top > hours.length * SLOT_HEIGHT) return null;
                        return (
                          <div className="absolute left-0 right-0 z-10" style={{ top }}>
                            <div className="flex items-center">
                              <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1" />
                              <div className="flex-1 h-px bg-red-500" />
                            </div>
                          </div>
                        );
                      })()}

                      {/* Meeting blocks */}
                      {dayMeetings.map((meeting) => {
                        const start = new Date(meeting.start_time);
                        const startMinutes = start.getHours() * 60 + start.getMinutes();
                        const top = ((startMinutes / 60) - VISIBLE_START) * SLOT_HEIGHT;
                        const height = (meeting.duration_minutes / 60) * SLOT_HEIGHT;
                        const colors = STATUS_COLORS[meeting.status] || STATUS_COLORS.pending;

                        return (
                          <button
                            key={meeting.id}
                            onClick={() => setSelectedMeeting(selectedMeeting?.id === meeting.id ? null : meeting)}
                            className={`absolute left-1 right-1 rounded-lg border p-2 text-left transition-shadow hover:shadow-md z-20 ${colors}`}
                            style={{ top: Math.max(0, top), height: Math.max(height, 28) }}
                          >
                            <p className="text-[11px] font-semibold truncate">
                              {meeting.other_person.full_name}
                            </p>
                            {height > 36 && (
                              <p className="text-[10px] opacity-75 truncate">
                                {formatTimeShort(meeting.start_time)} · {meeting.duration_minutes}min
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Meeting detail popover */}
      {selectedMeeting && (
        <Card className="mt-4 animate-fade-in">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start gap-4">
              {selectedMeeting.other_person.avatar_url ? (
                <img
                  src={selectedMeeting.other_person.avatar_url}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {(selectedMeeting.other_person.full_name || "?").charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{selectedMeeting.other_person.full_name}</p>
                  <Badge variant={selectedMeeting.status === "accepted" ? "default" : "secondary"} className="capitalize">
                    {selectedMeeting.status}
                  </Badge>
                </div>
                {selectedMeeting.other_person.title && (
                  <p className="text-sm text-muted-foreground">
                    {[selectedMeeting.other_person.title, selectedMeeting.other_person.company_name].filter(Boolean).join(" at ")}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTimeShort(selectedMeeting.start_time)} · {selectedMeeting.duration_minutes} min
                  </span>
                  {selectedMeeting.location && (
                    <span>{selectedMeeting.location}</span>
                  )}
                  <Badge variant="outline" className="capitalize text-xs">{selectedMeeting.meeting_type}</Badge>
                </div>
                {selectedMeeting.agenda_note && (
                  <p className="mt-2 text-sm text-muted-foreground italic">
                    &ldquo;{selectedMeeting.agenda_note}&rdquo;
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMeeting(null)}>
                &times;
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
