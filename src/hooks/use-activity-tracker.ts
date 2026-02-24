import { useCallback, useRef } from "react";

type ActionType =
  | "profile_view"
  | "profile_click"
  | "search"
  | "filter_applied"
  | "meeting_request"
  | "meeting_accepted"
  | "meeting_declined"
  | "meeting_rated"
  | "message_sent"
  | "match_saved"
  | "match_dismissed"
  | "session_attended"
  | "document_downloaded";

/**
 * Lightweight activity tracker hook.
 * Fire-and-forget: doesn't block UI, deduplicates rapid events.
 */
export function useActivityTracker(eventId: string) {
  const recentRef = useRef<Set<string>>(new Set());

  const track = useCallback(
    (
      actionType: ActionType,
      targetParticipantId?: string,
      metadata?: Record<string, any>
    ) => {
      // Deduplicate: same action + target within 5 seconds
      const dedupeKey = `${actionType}:${targetParticipantId || ""}`;
      if (recentRef.current.has(dedupeKey)) return;
      recentRef.current.add(dedupeKey);
      setTimeout(() => recentRef.current.delete(dedupeKey), 5000);

      // Fire and forget — don't await, don't block UI
      fetch("/api/activity/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          actionType,
          targetParticipantId,
          metadata,
        }),
      }).catch(() => {
        // Silently ignore tracking failures
      });
    },
    [eventId]
  );

  return track;
}
