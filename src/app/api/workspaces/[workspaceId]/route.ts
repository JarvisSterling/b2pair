import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get workspace + events in parallel
  const [{ data: workspace }, { data: events }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", workspaceId).single(),
    supabase.from("events").select("*").eq("organization_id", workspaceId).order("created_at", { ascending: false }),
  ]);

  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get participant counts in parallel
  const eventIds = (events || []).map((e: any) => e.id);
  const participantCounts: Record<string, number> = {};

  if (eventIds.length > 0) {
    const counts = await Promise.all(
      eventIds.map(async (eid: string) => {
        const { count } = await supabase
          .from("participants")
          .select("*", { count: "exact", head: true })
          .eq("event_id", eid)
          .eq("status", "approved");
        return { id: eid, count: count || 0 };
      })
    );
    counts.forEach((c) => { participantCounts[c.id] = c.count; });
  }

  return NextResponse.json({ workspace, events: events || [], participantCounts });
}
