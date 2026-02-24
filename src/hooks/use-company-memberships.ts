"use client";

import { useEffect, useState } from "react";

export interface CompanyMembership {
  membership_id: string;
  company_id: string;
  company_name: string;
  company_slug: string;
  company_logo: string | null;
  capabilities: ("sponsor" | "exhibitor")[];
  company_status: string;
  role: string;
  event_id: string;
  event_name: string;
  event_slug: string;
}

/**
 * Fetches all company memberships for the current user.
 * Optionally filter by eventId to get only memberships for a specific event.
 */
export function useCompanyMemberships(eventId?: string) {
  const [memberships, setMemberships] = useState<CompanyMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = eventId
      ? `/api/user/companies?eventId=${eventId}`
      : `/api/user/companies`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setMemberships(data.memberships || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [eventId]);

  return { memberships, loading };
}
