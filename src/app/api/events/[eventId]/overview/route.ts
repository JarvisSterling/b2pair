import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get event
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Admin client for aggregate queries
  const admin = createAdminClient();

  // Run all counts in parallel
  const [
    { count: participantCount },
    { count: pendingCount },
    { count: matchCount },
    { count: meetingCount },
    { count: typeCount },
    { data: typeBreakdown },
    { count: noTypeCount },
  ] = await Promise.all([
    admin.from("participants").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "approved"),
    admin.from("participants").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "pending"),
    admin.from("matches").select("*", { count: "exact", head: true }).eq("event_id", eventId),
    admin.from("meetings").select("*", { count: "exact", head: true }).eq("event_id", eventId),
    admin.from("event_participant_types").select("*", { count: "exact", head: true }).eq("event_id", eventId),
    admin.from("event_participant_types").select("id, name, color").eq("event_id", eventId).order("sort_order"),
    admin.from("participants").select("*", { count: "exact", head: true }).eq("event_id", eventId).is("participant_type_id", null).eq("status", "approved"),
  ]);

  // Get breakdown counts in parallel
  const breakdownWithCounts = await Promise.all(
    (typeBreakdown || []).map(async (t: any) => {
      const { count } = await admin
        .from("participants")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("participant_type_id", t.id)
        .eq("status", "approved");
      return { ...t, count: count || 0 };
    })
  );

  return NextResponse.json({
    event,
    stats: {
      participantCount: participantCount || 0,
      pendingCount: pendingCount || 0,
      matchCount: matchCount || 0,
      meetingCount: meetingCount || 0,
      typeCount: typeCount || 0,
      noTypeCount: noTypeCount || 0,
    },
    breakdownWithCounts,
  });
}
