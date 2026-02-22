export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FullScreenEditor } from "@/components/page-editor/full-screen-editor";
import type { EventPage, EventTheme } from "@/types/event-pages";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EditorPage({ params }: PageProps) {
  const { eventId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  // Fetch event
  const { data: event } = await admin
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  // Verify organizer membership
  const { data: membership } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", event.organization_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/dashboard");

  // Fetch org name separately
  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", event.organization_id)
    .single();

  const eventWithOrg = { ...event, organizations: org };

  // Load pages and theme
  const [pagesRes, themeRes] = await Promise.all([
    admin
      .from("event_pages")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order"),
    admin
      .from("event_themes")
      .select("*")
      .eq("event_id", eventId)
      .single(),
  ]);

  return (
    <FullScreenEditor
      event={eventWithOrg}
      initialPages={(pagesRes.data || []) as EventPage[]}
      initialTheme={themeRes.data as EventTheme | null}
      workspaceId={event.organization_id}
    />
  );
}
