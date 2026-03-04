import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { matchId } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json();
  const allowed = ["suggested", "viewed", "saved", "dismissed", "connected"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Verify the user is a participant in this match
  const { data: match } = await admin
    .from("matches")
    .select("id, participant_a_id, participant_b_id")
    .eq("id", matchId)
    .single();

  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: myParticipant } = await supabase
    .from("participants")
    .select("id")
    .eq("user_id", user.id)
    .in("id", [match.participant_a_id, match.participant_b_id])
    .maybeSingle();

  if (!myParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await admin
    .from("matches")
    .update({ status })
    .eq("id", matchId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
