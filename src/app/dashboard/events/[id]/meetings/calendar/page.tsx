"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";

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
  pending:   "bg-amber-100 border-amber-300 text-amber-900",
  accepted:  "bg-emerald-100 border-emerald-300 text-emerald-900",
  declined:  "bg-red-100 border-red-200 text-red-800",
  completed: "bg-muted border-border text-muted-foreground",
  cancelled: "bg-muted border-border text-muted-foreground line-through",
};

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

/** Display meeting time using UTC to match how it was stored (wall-clock UTC). */
function formatTimeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

/** Extract YYYY-MM-DD in UTC from an ISO string. */
function utcDateStr(iso: string): string {
  return iso.slice(0, 10);
}

/** Get Monday of the week containing the given UTC date string. */
function mondayOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Add `n` days to a YYYY-MM-DD string. */
function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Format a date string for display. */
function fmtDate(dateStr: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

export default function EventMeetingsCalendarPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [allMeetings, setAllMeetings] = useState<CalendarMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"week" | "day">("week");
  // currentDateStr is always YYYY-MM-DD in UTC
  const [currentDateStr, setCurrentDateStr] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [selectedMeeting, setSelectedMeeting] = useState<CalendarMeeting | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  // Close popover on outside click or Escape key
  const closePopover = useCallback(() => {
    setSelectedMeeting(null);
    setPopoverPos(null);
  }, []);

  useEffect(() => {
    if (!selectedMeeting) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") closePopover(); }
    function onOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) closePopover();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onOutside);
    };
  }, [selectedMeeting, closePopover]);

  // Load all meetings for this event once on mount, then navigate to first meeting date
  useEffect(() => {
    loadAllMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAllMeetings() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: myParticipants } = await supabase
      .from("participants")
      .select("id")
      .eq("user_id", user.id)
      .eq("event_id", eventId);

    if (!myParticipants?.length) { setLoading(false); return; }

    const myIds = myParticipants.map((p: any) => p.id);

    const [{ data: asRequester }, { data: asRecipient }] = await Promise.all([
      supabase
        .from("meetings")
        .select(`
          id, start_time, duration_minutes, status, meeting_type, location, agenda_note,
          recipient:participants!meetings_recipient_id_fkey(profiles!inner(full_name, title, company_name, avatar_url))
        `)
        .eq("event_id", eventId)
        .in("requester_id", myIds)
        .not("start_time", "is", null)
        .in("status", ["pending", "accepted", "completed"]),

      supabase
        .from("meetings")
        .select(`
          id, start_time, duration_minutes, status, meeting_type, location, agenda_note,
          requester:participants!meetings_requester_id_fkey(profiles!inner(full_name, title, company_name, avatar_url))
        `)
        .eq("event_id", eventId)
        .in("recipient_id", myIds)
        .not("start_time", "is", null)
        .in("status", ["pending", "accepted", "completed"]),
    ]);

    const combined: CalendarMeeting[] = [
      ...(asRequester || []).map((m: any) => ({
        id: m.id,
        start_time: m.start_time,
        duration_minutes: m.duration_minutes ?? 30,
        status: m.status,
        meeting_type: m.meeting_type,
        location: m.location,
        agenda_note: m.agenda_note,
        is_requester: true,
        other_person: m.recipient?.profiles ?? { full_name: "Unknown" },
      })),
      ...(asRecipient || []).map((m: any) => ({
        id: m.id,
        start_time: m.start_time,
        duration_minutes: m.duration_minutes ?? 30,
        status: m.status,
        meeting_type: m.meeting_type,
        location: m.location,
        agenda_note: m.agenda_note,
        is_requester: false,
        other_person: m.requester?.profiles ?? { full_name: "Unknown" },
      })),
    ];

    setAllMeetings(combined);

    // Navigate to the week of the first upcoming/pending meeting automatically
    if (combined.length > 0) {
      const sorted = [...combined].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      const firstDate = utcDateStr(sorted[0].start_time);
      setCurrentDateStr(view === "week" ? mondayOfWeek(firstDate) : firstDate);
    }

    setLoading(false);
  }

  function navigate(dir: number) {
    setCurrentDateStr((prev) =>
      addDays(view === "week" ? mondayOfWeek(prev) : prev, dir * (view === "week" ? 7 : 1))
    );
  }

  function goToday() {
    const today = new Date().toISOString().slice(0, 10);
    setCurrentDateStr(view === "week" ? mondayOfWeek(today) : today);
  }

  function getWeekDays(): string[] {
    const monday = mondayOfWeek(currentDateStr);
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }

  function getMeetingsForDate(dateStr: string): CalendarMeeting[] {
    return allMeetings.filter((m) => utcDateStr(m.start_time) === dateStr);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const visibleDays = view === "week" ? getWeekDays() : [currentDateStr];
  const hours = Array.from({ length: VISIBLE_END - VISIBLE_START }, (_, i) => VISIBLE_START + i);

  const headerText = view === "week"
    ? (() => {
        const days = getWeekDays();
        const s = days[0], e = days[6];
        const sMonth = fmtDate(s, { month: "short" });
        const eMonth = fmtDate(e, { month: "short" });
        const year = fmtDate(e, { year: "numeric" });
        if (sMonth === eMonth) {
          return `${fmtDate(s, { month: "long" })} ${fmtDate(s, { day: "numeric" })} – ${fmtDate(e, { day: "numeric" })}, ${year}`;
        }
        return `${sMonth} ${fmtDate(s, { day: "numeric" })} – ${eMonth} ${fmtDate(e, { day: "numeric" })}, ${year}`;
      })()
    : fmtDate(currentDateStr, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/events/${eventId}/meetings`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-h2 font-semibold tracking-tight">Calendar</h1>
            <p className="text-caption text-muted-foreground">{headerText}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
      ) : allMeetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Clock className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-body">No scheduled meetings yet</p>
          <p className="text-caption mt-1">Accepted meetings with a time slot will appear here</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className={view === "week" ? "min-w-[700px]" : ""}>
              {/* Day headers */}
              <div className={`grid border-b ${view === "week" ? "grid-cols-[60px_repeat(7,1fr)]" : "grid-cols-[60px_1fr]"}`}>
                <div className="p-2" />
                {visibleDays.map((dateStr) => {
                  const isToday = dateStr === todayStr;
                  const dayMeetings = getMeetingsForDate(dateStr);
                  return (
                    <div
                      key={dateStr}
                      className={`p-3 text-center border-l cursor-pointer ${isToday ? "bg-primary/5" : ""}`}
                      onClick={() => { setView("day"); setCurrentDateStr(dateStr); }}
                    >
                      <p className="text-[11px] font-medium text-muted-foreground uppercase">
                        {fmtDate(dateStr, { weekday: "short" })}
                      </p>
                      <p className={`text-lg font-semibold mt-0.5 ${isToday ? "text-primary" : ""}`}>
                        {fmtDate(dateStr, { day: "numeric" })}
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
                {visibleDays.map((dateStr) => {
                  const dayMeetings = getMeetingsForDate(dateStr);
                  const isToday = dateStr === todayStr;

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
                        const nowUTCHours = now.getUTCHours() + now.getUTCMinutes() / 60;
                        const top = (nowUTCHours - VISIBLE_START) * SLOT_HEIGHT;
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
                        const startUTCMinutes = start.getUTCHours() * 60 + start.getUTCMinutes();
                        const top = ((startUTCMinutes / 60) - VISIBLE_START) * SLOT_HEIGHT;
                        const height = ((meeting.duration_minutes ?? 30) / 60) * SLOT_HEIGHT;
                        const colors = STATUS_COLORS[meeting.status] ?? STATUS_COLORS.pending;

                        return (
                          <button
                            key={meeting.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedMeeting?.id === meeting.id) {
                                closePopover();
                              } else {
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setSelectedMeeting(meeting);
                                setPopoverPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
                              }
                            }}
                            className={`absolute left-1 right-1 rounded-lg border p-2 text-left transition-shadow hover:shadow-md z-20 ${colors}`}
                            style={{ top: Math.max(0, top), height: Math.max(height, 28) }}
                          >
                            <p className="text-[11px] font-semibold truncate">
                              {meeting.other_person.full_name}
                            </p>
                            {height > 36 && (
                              <p className="text-[10px] opacity-75 truncate">
                                {formatTimeShort(meeting.start_time)} · {meeting.duration_minutes ?? 30}min
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
      {selectedMeeting && popoverPos && (() => {
        const POP_W = 320;
        const POP_H = 160; // estimated
        const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
        const vh = typeof window !== "undefined" ? window.innerHeight : 800;

        // Horizontal: center on click, clamp to viewport
        let left = popoverPos.x - POP_W / 2;
        if (left + POP_W > vw - 12) left = vw - POP_W - 12;
        if (left < 12) left = 12;

        // Vertical: below block by default, flip above if near bottom
        let top = popoverPos.y;
        const flipUp = top + POP_H > vh - 12;
        if (flipUp) top = popoverPos.y - POP_H - 60;

        return (
          <div
            ref={popoverRef}
            className="fixed z-50 animate-fade-in"
            style={{ left, top, width: POP_W }}
          >
            <Card className="shadow-2xl border-border/80">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-start gap-3">
                  {selectedMeeting.other_person.avatar_url ? (
                    <SafeImage
                      src={selectedMeeting.other_person.avatar_url}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover shrink-0"
                      width={40}
                      height={40}
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
                      {(selectedMeeting.other_person.full_name || "?").charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-semibold truncate">{selectedMeeting.other_person.full_name}</p>
                        <Badge
                          variant={selectedMeeting.status === "accepted" ? "default" : "secondary"}
                          className="capitalize shrink-0 text-[10px]"
                        >
                          {selectedMeeting.status}
                        </Badge>
                      </div>
                      <button
                        onClick={closePopover}
                        className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none shrink-0"
                      >
                        &times;
                      </button>
                    </div>

                    {selectedMeeting.other_person.title && (
                      <p className="text-caption text-muted-foreground truncate mt-0.5">
                        {[selectedMeeting.other_person.title, selectedMeeting.other_person.company_name]
                          .filter(Boolean)
                          .join(" at ")}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2.5 text-caption text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeShort(selectedMeeting.start_time)} · {selectedMeeting.duration_minutes ?? 30} min
                      </span>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {selectedMeeting.meeting_type}
                      </Badge>
                    </div>

                    {selectedMeeting.agenda_note && (
                      <p className="mt-2 text-caption text-muted-foreground italic line-clamp-2">
                        &ldquo;{selectedMeeting.agenda_note}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}
    </div>
  );
}
