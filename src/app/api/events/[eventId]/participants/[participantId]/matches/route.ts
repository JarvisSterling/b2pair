import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string; participantId: string }> }
) {
  const { eventId, participantId } = await params;

  // Verify organizer
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: caller } = await supabase
    .from("participants")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  if (!caller || caller.role !== "organizer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Fetch all matches for this participant (they can be on either side)
  const { data: rawA, error: errA } = await admin
    .from("matches")
    .select(`
      id, score, intent_score, industry_score, interest_score,
      complementarity_score, embedding_score, match_reasons,
      status, organizer_recommended,
      participant_b_id,
      participants!matches_participant_b_id_fkey(
        id, role, intent,
        profiles(full_name, avatar_url, title, company_name, industry)
      )
    `)
    .eq("event_id", eventId)
    .eq("participant_a_id", participantId)
    .order("score", { ascending: false });

  const { data: rawB, error: errB } = await admin
    .from("matches")
    .select(`
      id, score, intent_score, industry_score, interest_score,
      complementarity_score, embedding_score, match_reasons,
      status, organizer_recommended,
      participant_a_id,
      participants!matches_participant_a_id_fkey(
        id, role, intent,
        profiles(full_name, avatar_url, title, company_name, industry)
      )
    `)
    .eq("event_id", eventId)
    .eq("participant_b_id", participantId)
    .order("score", { ascending: false });

  if (errA || errB) {
    return NextResponse.json({ error: errA?.message || errB?.message }, { status: 500 });
  }

  // Normalize both sides to a unified shape
  const matchesA = (rawA || []).map((m: any) => ({
    id: m.id,
    score: m.score,
    intent_score: m.intent_score,
    industry_score: m.industry_score,
    interest_score: m.interest_score,
    complementarity_score: m.complementarity_score,
    embedding_score: m.embedding_score,
    match_reasons: m.match_reasons || [],
    status: m.status,
    organizer_recommended: m.organizer_recommended,
    other: m.participants,
  }));

  const matchesB = (rawB || []).map((m: any) => ({
    id: m.id,
    score: m.score,
    intent_score: m.intent_score,
    industry_score: m.industry_score,
    interest_score: m.interest_score,
    complementarity_score: m.complementarity_score,
    embedding_score: m.embedding_score,
    match_reasons: m.match_reasons || [],
    status: m.status,
    organizer_recommended: m.organizer_recommended,
    other: m.participants,
  }));

  // Merge and sort by score
  const all = [...matchesA, ...matchesB].sort((a, b) => b.score - a.score);

  return NextResponse.json({ matches: all });
}
