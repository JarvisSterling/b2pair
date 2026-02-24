"use client";

import { useParams, redirect } from "next/navigation";

/**
 * Redirect old /sponsors URL to /partners
 */
export default function OldSponsorsRedirect() {
  const params = useParams();
  redirect(`/dashboard/w/${params.workspaceId}/events/${params.eventId}/partners`);
}
