"use client";

import { useParams } from "next/navigation";

/**
 * Returns the event ID from either:
 * - /dashboard/events/[id]/... (params.id)
 * - /dashboard/w/[workspaceId]/events/[eventId]/... (params.eventId)
 */
export function useEventId(): string {
  const params = useParams();
  return (params.eventId || params.id) as string;
}
