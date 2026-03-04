import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; matchId: string }> }
) {
  const { eventId, matchId } = await params;

  // Verify organizer
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: participant } = await supabase
    .from("participants")
    .select("id, role")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  if (!participant || participant.role !== "organizer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { recommended } = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("matches")
    .update({ organizer_recommended: recommended })
    .eq("id", matchId)
    .eq("event_id", eventId)
    .select("id, organizer_recommended")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ match: data });
}
