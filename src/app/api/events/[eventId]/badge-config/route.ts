import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("badge_config, name, logo_url")
    .eq("id", eventId)
    .single();

  return NextResponse.json({ badgeConfig: event?.badge_config || null, eventName: event?.name, eventLogo: event?.logo_url });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { badgeConfig } = await req.json();

  const admin = createAdminClient();
  const { error } = await admin
    .from("events")
    .update({ badge_config: badgeConfig, updated_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
