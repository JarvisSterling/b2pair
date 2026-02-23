export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { RegistrationFlow } from "./registration-flow";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function RegisterPage({ params }: PageProps) {
  const { slug } = await params;
  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: event } = await admin
    .from("events")
    .select("id, name, slug, start_date, end_date, banner_url, banner_layout, banner_settings, requires_approval, registration_open, status")
    .eq("slug", slug)
    .in("status", ["published", "active"])
    .single();

  if (!event) notFound();

  const [typesRes, userRes] = await Promise.all([
    admin
      .from("event_participant_types")
      .select("*")
      .eq("event_id", event.id)
      .order("sort_order"),
    supabase.auth.getUser(),
  ]);

  const participantTypes = typesRes.data || [];
  const user = userRes.data?.user;

  // If already registered, redirect
  if (user) {
    const { data: existing } = await admin
      .from("participants")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .single();
    if (existing) {
      return (
        <RegistrationFlow
          event={event}
          participantTypes={participantTypes}
          isLoggedIn={true}
          alreadyRegistered={true}
        />
      );
    }
  }

  return (
    <RegistrationFlow
      event={event}
      participantTypes={participantTypes}
      isLoggedIn={!!user}
      alreadyRegistered={false}
    />
  );
}
