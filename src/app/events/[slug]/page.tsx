export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventPageShell } from "@/components/events/event-page-shell";
import type { EventPage, EventTheme, ThemeKey } from "@/types/event-pages";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function PublicEventPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const admin = createAdminClient();
  const supabase = await createClient();

  // Fetch event
  const { data: event } = await admin
    .from("events")
    .select("*")
    .eq("slug", slug)
    .in("status", ["published", "active"])
    .single();

  if (!event) {
    notFound();
  }

  // Fetch pages, theme, participant types, count in parallel
  const [pagesRes, themeRes, typesRes, countRes, userRes] = await Promise.all([
    admin
      .from("event_pages")
      .select("*")
      .eq("event_id", event.id)
      .eq("is_visible", true)
      .order("sort_order"),
    admin
      .from("event_themes")
      .select("*")
      .eq("event_id", event.id)
      .single(),
    admin
      .from("event_participant_types")
      .select("*")
      .eq("event_id", event.id)
      .order("sort_order"),
    admin
      .from("participants")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("status", "approved"),
    supabase.auth.getUser(),
  ]);

  const pages = (pagesRes.data || []) as EventPage[];
  const theme = themeRes.data as EventTheme | null;
  const participantTypes = typesRes.data || [];
  const participantCount = countRes.count || 0;
  const user = userRes.data?.user;

  // Check registration status
  let isRegistered = false;
  if (user) {
    const { data: existing } = await admin
      .from("participants")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .limit(1)
      .single();
    isRegistered = !!existing;
  }

  return (
    <EventPageShell
      event={event}
      pages={pages}
      theme={theme}
      activeTab={tab || "home"}
      participantTypes={participantTypes}
      participantCount={participantCount}
      isRegistered={isRegistered}
      isLoggedIn={!!user}
    />
  );
}
