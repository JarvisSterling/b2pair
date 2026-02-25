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

  let alreadyRegistered = false;
  let existingProfile: {
    full_name: string | null;
    title: string | null;
    company_name: string | null;
    company_size: string | null;
    company_website: string | null;
    expertise_areas: string[] | null;
    interests: string[] | null;
  } | null = null;
  let existingParticipant: {
    intents: string[] | null;
    looking_for: string | null;
    offering: string | null;
  } | null = null;

  if (user) {
    const { data: existing } = await admin
      .from("participants")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      alreadyRegistered = true;
    }

    // Fetch existing profile data for pre-fill
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, title, company_name, company_size, company_website, expertise_areas, interests")
      .eq("id", user.id)
      .single();

    if (profile) existingProfile = profile;

    // Fetch latest participant record for intents/looking_for/offering
    const { data: latestParticipant } = await admin
      .from("participants")
      .select("intents, looking_for, offering")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (latestParticipant) existingParticipant = latestParticipant;
  }

  return (
    <RegistrationFlow
      event={event}
      participantTypes={participantTypes}
      isLoggedIn={!!user}
      alreadyRegistered={alreadyRegistered}
      existingProfile={existingProfile}
      existingParticipant={existingParticipant}
    />
  );
}
