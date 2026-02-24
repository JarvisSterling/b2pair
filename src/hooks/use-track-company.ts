"use client";

import { useCallback } from "react";

/**
 * Fire-and-forget analytics tracking for company profiles
 * Used on public sponsor/exhibitor pages
 */
export function useTrackCompany(companyId: string | null) {
  const track = useCallback(
    (type: "profile_view" | "resource_download" | "cta_click" | "meeting_request", eventId: string, extra?: { cta_label?: string }) => {
      if (!companyId) return;
      fetch(`/api/companies/${companyId}/analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, type, ...extra }),
      }).catch(() => {}); // fire and forget
    },
    [companyId]
  );

  return track;
}

/**
 * Auto-capture a lead when viewing a company profile
 */
export function useAutoCaptureLead(companyId: string | null) {
  const capture = useCallback(
    (eventId: string, participantId: string | null, source: string, resourceAccessed?: string) => {
      if (!companyId || !participantId) return;
      fetch(`/api/companies/${companyId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          participant_id: participantId,
          source,
          resource_accessed: resourceAccessed || null,
        }),
      }).catch(() => {});
    },
    [companyId]
  );

  return capture;
}
