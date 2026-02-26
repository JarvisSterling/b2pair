"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface EventOption {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  participant_id: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_HEIGHT = 48; // px per hour

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function formatTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

export default function AvailabilityPage() {
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [saving, setSaving] = useState(false);
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [dragging, setDragging] = useState<{
    date: string;
    startMinute: number;
    currentMinute: number;
  } | null>(null);

  const supabase = createClient();

  // SWR: load user's events with caching
  const { data: events = [], isLoading: loading } = useSWR<EventOption[]>(
    "availability-events",
    async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: participants } = await supabase
        .from("participants")
        .select("id, event_id, events!inner(id, name, start_date, end_date)")
        .eq("user_id", user.id)
        .eq("status", "approved");

      if (!participants?.length) return [];

      return participants.map((p: any) => ({
        id: p.events.id,
        name: p.events.name,
        start_date: p.events.start_date,
        end_date: p.events.end_date,
        participant_id: p.id,
      }));
    },
    { revalidateOnFocus: false }
  );

  // Auto-select first event when loaded
  useEffect(() => {
    if (events.length && !selectedEvent) {
      setSelectedEvent(events[0].id);
      const startDate = events[0].start_date ? new Date(events[0].start_date) : new Date();
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));
      setWeekStart(startDate);
    }
  }, [events, selectedEvent]);

  useEffect(() => {
    if (selectedEvent && weekStart) loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent, weekStart]);

  // When switching events, jump to that event's start week
  useEffect(() => {
    if (!selectedEvent) return;
    const ev = events.find((e) => e.id === selectedEvent);
    if (ev?.start_date) {
      const eventStart = new Date(ev.start_date);
      eventStart.setHours(0, 0, 0, 0);
      eventStart.setDate(eventStart.getDate() - ((eventStart.getDay() + 6) % 7));
      setWeekStart(eventStart);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent]);

  async function loadSlots() {
    if (!weekStart) return;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const event = events.find((e) => e.id === selectedEvent);
    if (!event) return;

    const { data } = await supabase
      .from("availability_slots")
      .select("*")
      .eq("participant_id", event.participant_id)
      .gte("date", weekStart.toISOString().split("T")[0])
      .lte("date", weekEnd.toISOString().split("T")[0])
      .order("date")
      .order("start_time");

    setSlots(data || []);
  }

  async function addSlot(date: string, startTime: string, endTime: string) {
    const event = events.find((e) => e.id === selectedEvent);
    if (!event) return;

    // Check for overlapping slots
    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);
    const hasOverlap = slots.some((s) => {
      if (s.date !== date) return false;
      const sStart = timeToMinutes(s.start_time);
      const sEnd = timeToMinutes(s.end_time);
      return newStart < sEnd && newEnd > sStart;
    });

    if (hasOverlap) {
      toast.error("Time slot overlaps");
      return;
    } // Don't create overlapping slots

    setSaving(true);
    const toastId = toast.loading("Saving...");
    try {
      const { data, error } = await supabase
        .from("availability_slots")
        .insert({
          participant_id: event.participant_id,
          event_id: selectedEvent,
          date,
          start_time: startTime,
          end_time: endTime,
          is_available: true,
        })
        .select()
        .single();
      if (error || !data) throw error || new Error("Failed to save");
      toast.success("Availability saved", { id: toastId });
      setSlots((prev) => [...prev, data]);
    } catch {
      toast.error("Failed to save", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  async function removeSlot(slotId: string) {
    await toast.promise(
      (async () => {
        const { error } = await supabase.from("availability_slots").delete().eq("id", slotId);
        if (error) throw error;
      })(),
      {
        loading: "Removing...",
        success: "Availability removed",
        error: "Failed to remove",
      }
    );
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  }

  // Quick-fill: add slots for common patterns
  async function quickFill(pattern: "morning" | "afternoon" | "full") {
    const event = events.find((e) => e.id === selectedEvent);
    if (!event) return;

    const ranges = {
      morning: { start: "09:00", end: "12:00" },
      afternoon: { start: "13:00", end: "17:00" },
      full: { start: "09:00", end: "17:00" },
    };
    const range = ranges[pattern];

    setSaving(true);
    const days = getEventDays();
    if (!days.length) { setSaving(false); return; }
    const inserts = days
      .map((d) => ({
        participant_id: event.participant_id,
        event_id: selectedEvent,
        date: d.toISOString().split("T")[0],
        start_time: range.start,
        end_time: range.end,
        is_available: true,
      }));

    try {
      await toast.promise(
        (async () => {
          const { error } = await supabase
            .from("availability_slots")
            .upsert(inserts, { onConflict: "participant_id,date,start_time,end_time" });
          if (error) throw error;
          await loadSlots();
        })(),
        {
          loading: "Saving...",
          success: "Availability updated",
          error: "Failed to save",
        }
      );
    } finally {
      setSaving(false);
    }
  }

  function getEventDays(): Date[] {
    const ev = events.find((e) => e.id === selectedEvent);
    if (!ev) return [];
    const start = new Date(ev.start_date);
    const end = new Date(ev.end_date);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const days: Date[] = [];
    const current = new Date(start);
    while (current <= end && days.length < 14) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  function getEventHours(): { startHour: number; endHour: number } {
    const ev = events.find((e) => e.id === selectedEvent);
    if (!ev) return { startHour: 8, endHour: 22 };
    const startHour = Math.max(0, new Date(ev.start_date).getHours() - 1);
    const endHour = Math.min(24, new Date(ev.end_date).getHours() + 2);
    return { startHour: Math.min(startHour, 8), endHour: Math.max(endHour, 20) };
  }

  function navigateWeek(dir: number) {
    setWeekStart((prev) => {
      if (!prev) return prev;
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  }

  // Visible grid derived from event hours
  const { startHour: VISIBLE_START_HOUR, endHour: VISIBLE_END_HOUR } = getEventHours();
  const VISIBLE_START_MIN = VISIBLE_START_HOUR * 60;
  const VISIBLE_HOURS = Array.from({ length: VISIBLE_END_HOUR - VISIBLE_START_HOUR }, (_, i) => VISIBLE_START_HOUR + i);

  const handleMouseDown = useCallback(
    (date: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const minuteInView = Math.floor(y / (SLOT_HEIGHT / 60));
      const minute = minuteInView + VISIBLE_START_MIN;
      const snapped = Math.floor(minute / 30) * 30;
      setDragging({ date, startMinute: snapped, currentMinute: snapped + 30 });
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const minuteInView = Math.floor(y / (SLOT_HEIGHT / 60));
      const minute = minuteInView + VISIBLE_START_MIN;
      const snapped = Math.ceil(minute / 30) * 30;
      if (snapped !== dragging.currentMinute && snapped > dragging.startMinute) {
        setDragging((prev) => prev ? { ...prev, currentMinute: snapped } : null);
      }
    },
    [dragging]
  );

  const handleMouseUp = useCallback(() => {
    if (!dragging) return;
    const start = minutesToTime(dragging.startMinute);
    const end = minutesToTime(Math.min(dragging.currentMinute, 24 * 60));
    if (dragging.currentMinute > dragging.startMinute) {
      addSlot(dragging.date, start, end);
    }
    setDragging(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  // Global mouseup listener so drag completes even if mouse leaves column
  useEffect(() => {
    const handler = () => {
      if (dragging) handleMouseUp();
    };
    window.addEventListener("mouseup", handler);
    return () => window.removeEventListener("mouseup", handler);
  }, [dragging, handleMouseUp]);

  const eventDays = getEventDays();
  const today = new Date().toISOString().split("T")[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="mx-auto max-w-4xl animate-fade-in">
        <div className="mb-8">
          <h1 className="text-h1 font-semibold tracking-tight">Availability</h1>
          <p className="mt-1 text-body text-muted-foreground">Set your meeting availability</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Clock className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-body text-muted-foreground">No events to set availability for.</p>
            <p className="mt-1 text-caption text-muted-foreground">Join an event first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-h1 font-semibold tracking-tight">Availability</h1>
          <p className="mt-1 text-body text-muted-foreground">
            Click and drag to mark when you're free for meetings.
          </p>
        </div>
        {saving && (
          <Badge variant="secondary" className="gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving
          </Badge>
        )}
      </div>

      {/* Event selector + week nav */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {events.length > 1 && (
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          )}
          {events.length === 1 && (
            <Badge variant="outline" className="text-sm py-1 px-3">
              {events[0].name}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick fill buttons */}
          <div className="hidden sm:flex gap-1 mr-3">
            <Button variant="ghost" size="sm" onClick={() => quickFill("morning")} className="text-xs">
              Morning
            </Button>
            <Button variant="ghost" size="sm" onClick={() => quickFill("afternoon")} className="text-xs">
              Afternoon
            </Button>
            <Button variant="ghost" size="sm" onClick={() => quickFill("full")} className="text-xs">
              Full day
            </Button>
          </div>

          <span className="text-xs font-medium text-muted-foreground px-2">
            Event days only
          </span>
          <Button variant="outline" size="sm" onClick={() => navigateWeek(1)} className="invisible">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid border-b" style={{ gridTemplateColumns: `60px repeat(${eventDays.length}, 1fr)` }}>
              <div className="p-2" />
              {eventDays.map((d) => {
                const dateStr = d.toISOString().split("T")[0];
                const isToday = dateStr === today;
                const daySlots = slots.filter((s) => s.date === dateStr);

                return (
                  <div
                    key={dateStr}
                    className={`p-3 text-center border-l ${isToday ? "bg-primary/5" : ""}`}
                  >
                    <p className="text-[11px] font-medium text-muted-foreground uppercase">
                      {d.toLocaleDateString("en-US", { weekday: "short" })}
                    </p>
                    <p
                      className={`text-lg font-semibold mt-0.5 ${
                        isToday ? "text-primary" : ""
                      }`}
                    >
                      {d.getDate()}
                    </p>
                    {daySlots.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {daySlots.length} slot{daySlots.length > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div
              className={`grid relative select-none`}
              style={{
                gridTemplateColumns: `60px repeat(${eventDays.length}, 1fr)`,
                height: SLOT_HEIGHT * VISIBLE_HOURS.length,
              }}
            >
              {/* Hour labels */}
              <div className="relative">
                {VISIBLE_HOURS.map((h) => (
                  <div
                    key={h}
                    className="flex items-start justify-end pr-3 text-[11px] text-muted-foreground"
                    style={{ height: SLOT_HEIGHT }}
                  >
                    {h === 0
                      ? "12 AM"
                      : h < 12
                      ? `${h} AM`
                      : h === 12
                      ? "12 PM"
                      : `${h - 12} PM`}
                  </div>
                ))}
              </div>

              {/* Day columns (visible: 8AM-midnight) */}
              {eventDays.map((d) => {
                const dateStr = d.toISOString().split("T")[0];
                const daySlots = slots.filter((s) => s.date === dateStr);

                return (
                  <div
                    key={dateStr}
                    className="relative border-l cursor-crosshair"
                    onMouseDown={(e) => handleMouseDown(dateStr, e)}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  >
                    {/* Hour grid lines */}
                    {VISIBLE_HOURS.map((h) => (
                      <div
                        key={h}
                        className="absolute w-full border-t border-dashed border-border/40"
                        style={{ top: (h - VISIBLE_START_HOUR) * SLOT_HEIGHT }}
                      />
                    ))}

                    {/* Existing slots */}
                    {daySlots.map((slot) => {
                      const startMin = timeToMinutes(slot.start_time);
                      const endMin = timeToMinutes(slot.end_time);
                      const top = (startMin / 60 - VISIBLE_START_HOUR) * SLOT_HEIGHT;
                      const height = ((endMin - startMin) / 60) * SLOT_HEIGHT;

                      if (top + height < 0) return null; // Before visible range

                      return (
                        <div
                          key={slot.id}
                          className="absolute left-1 right-1 rounded-md bg-primary/15 border border-primary/30 group cursor-pointer transition-colors hover:bg-primary/25 z-10"
                          style={{ top: Math.max(0, top), height: Math.max(height, 24) }}
                          title={`${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <div className="px-2 py-1 flex items-center justify-between h-full">
                            <span className="text-[10px] font-medium text-primary truncate">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </span>
                            <button
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSlot(slot.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Drag preview */}
                    {dragging && dragging.date === dateStr && (
                      <div
                        className="absolute left-1 right-1 rounded-md bg-primary/20 border-2 border-primary/50 border-dashed"
                        style={{
                          top: (dragging.startMinute / 60 - VISIBLE_START_HOUR) * SLOT_HEIGHT,
                          height:
                            ((dragging.currentMinute - dragging.startMinute) / 60) * SLOT_HEIGHT,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-caption text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-primary/15 border border-primary/30" />
          Available
        </div>
        <span>Click and drag on the calendar to add slots. Hover to delete.</span>
      </div>
    </div>
  );
}
