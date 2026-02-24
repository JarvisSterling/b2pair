"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  companyId: string;
  eventId: string;
  type: "profile_view" | "resource_download" | "cta_click" | "meeting_request";
}

/**
 * Invisible component that fires a tracking event + auto-captures lead on mount.
 * Drop into sponsor/exhibitor profile pages.
 */
export function CompanyTracker({ companyId, eventId, type }: Props) {
  useEffect(() => {
    // Track the view
    fetch(`/api/companies/${companyId}/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, type }),
    }).catch(() => {});

    // Auto-capture lead if user is a participant
    async function captureLead() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: participant } = await supabase
          .from("participants")
          .select("id")
          .eq("event_id", eventId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!participant) return;

        await fetch(`/api/companies/${companyId}/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: eventId,
            participant_id: participant.id,
            source: type,
          }),
        });
      } catch {}
    }

    captureLead();
  }, [companyId, eventId, type]);

  return null;
}

/**
 * Wrapper for CTA click tracking. Wraps a link/button.
 */
export function TrackCtaClick({
  companyId,
  eventId,
  ctaLabel,
  children,
}: {
  companyId: string;
  eventId: string;
  ctaLabel: string;
  children: React.ReactNode;
}) {
  function handleClick() {
    fetch(`/api/companies/${companyId}/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, type: "cta_click", cta_label: ctaLabel }),
    }).catch(() => {});
  }

  return <span onClick={handleClick}>{children}</span>;
}

/**
 * Track resource download
 */
export function TrackDownload({
  companyId,
  eventId,
  resourceName,
  children,
}: {
  companyId: string;
  eventId: string;
  resourceName: string;
  children: React.ReactNode;
}) {
  function handleClick() {
    fetch(`/api/companies/${companyId}/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, type: "resource_download" }),
    }).catch(() => {});

    // Also capture as lead
    async function capture() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: participant } = await supabase
          .from("participants")
          .select("id")
          .eq("event_id", eventId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!participant) return;
        await fetch(`/api/companies/${companyId}/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: eventId,
            participant_id: participant.id,
            source: "resource_download",
            resource_accessed: resourceName,
          }),
        });
      } catch {}
    }
    capture();
  }

  return <span onClick={handleClick}>{children}</span>;
}
