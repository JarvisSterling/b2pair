"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, AlertCircle, CalendarX } from "lucide-react";
import { cn } from "@/lib/utils";

interface RawSlot {
  id: string;
  date: string;       // "YYYY-MM-DD"
  start_time: string; // "HH:MM:SS" or "HH:MM"
  end_time: string;
}

export interface SelectedSlot {
  date: string;
  startTime: string; // "HH:MM"
  endTime: string;
  iAmFree: boolean;
}

interface Props {
  eventId: string;
  recipientParticipantId: string;
  onSelect: (slot: SelectedSlot | null) => void;
  selected: SelectedSlot | null;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00"); // noon to avoid TZ offset issues
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

/** Generate duration-sized chunks from a slot range */
function generateChunks(
  date: string,
  startTime: string,
  endTime: string,
  durationMinutes: number
): Array<{ date: string; startTime: string; endTime: string }> {
  const start = timeToMinutes(startTime.slice(0, 5));
  const end = timeToMinutes(endTime.slice(0, 5));
  const chunks = [];
  for (let t = start; t + durationMinutes <= end; t += durationMinutes) {
    chunks.push({ date, startTime: minutesToTime(t), endTime: minutesToTime(t + durationMinutes) });
  }
  return chunks;
}

/** Check whether a chunk falls within any of the user's own slots */
function isFreeAt(
  date: string,
  startTime: string,
  endTime: string,
  mySlots: RawSlot[]
): boolean {
  const chunkStart = timeToMinutes(startTime);
  const chunkEnd = timeToMinutes(endTime);
  return mySlots.some((s) => {
    if (s.date !== date) return false;
    const sStart = timeToMinutes(s.start_time.slice(0, 5));
    const sEnd = timeToMinutes(s.end_time.slice(0, 5));
    return chunkStart >= sStart && chunkEnd <= sEnd;
  });
}

export function MeetingSlotPicker({ eventId, recipientParticipantId, onSelect, selected }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chunks, setChunks] = useState<Array<SelectedSlot & { label: string; dayLabel: string }>>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/events/${eventId}/slots?recipientId=${recipientParticipantId}`)
      .then((r) => r.json())
      .then(({ recipientSlots, mySlots, durationMinutes, error: apiErr }) => {
        if (apiErr) { setError(apiErr); return; }

        const generated: Array<SelectedSlot & { label: string; dayLabel: string }> = [];
        for (const slot of (recipientSlots as RawSlot[])) {
          const raw = generateChunks(slot.date, slot.start_time, slot.end_time, durationMinutes);
          for (const c of raw) {
            generated.push({
              ...c,
              iAmFree: isFreeAt(c.date, c.startTime, c.endTime, mySlots as RawSlot[]),
              label: `${formatTime(c.startTime)} – ${formatTime(c.endTime)}`,
              dayLabel: formatDate(c.date),
            });
          }
        }
        setChunks(generated);
      })
      .catch(() => setError("Failed to load availability"))
      .finally(() => setLoading(false));
  }, [eventId, recipientParticipantId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading availability…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        {error}
      </div>
    );
  }

  if (chunks.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground rounded-lg border border-dashed border-border px-3">
        <CalendarX className="h-3.5 w-3.5 shrink-0" />
        <span>This person hasn&apos;t set their availability yet. You can still send a request without a time.</span>
      </div>
    );
  }

  // Group by day
  const days = Array.from(new Set(chunks.map((c) => c.date)));

  return (
    <div className="space-y-3">
      {days.map((day) => {
        const dayChunks = chunks.filter((c) => c.date === day);
        return (
          <div key={day}>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              {dayChunks[0].dayLabel}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {dayChunks.map((chunk) => {
                const isSelected =
                  selected?.date === chunk.date &&
                  selected?.startTime === chunk.startTime;

                return (
                  <button
                    key={`${chunk.date}-${chunk.startTime}`}
                    type="button"
                    onClick={() =>
                      onSelect(isSelected ? null : chunk)
                    }
                    className={cn(
                      "relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-150",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/30"
                        : chunk.iAmFree
                        ? "border-success/40 bg-success/5 text-foreground hover:border-success/60 hover:bg-success/10"
                        : "border-border bg-background text-muted-foreground hover:border-border-strong hover:text-foreground"
                    )}
                  >
                    {isSelected ? (
                      <Check className="h-3 w-3 shrink-0" />
                    ) : chunk.iAmFree ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                    )}
                    {chunk.label}
                  </button>
                );
              })}
            </div>
            {/* Legend hint — show once per day if there are mixed types */}
            {dayChunks.some((c) => c.iAmFree) && dayChunks.some((c) => !c.iAmFree) && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-success mr-1 translate-y-[-1px]" />
                You&apos;re free &nbsp;·&nbsp;
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mr-1 translate-y-[-1px]" />
                You&apos;re busy
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
