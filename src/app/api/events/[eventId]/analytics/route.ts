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

  const { data: event } = await supabase
    .from("events")
    .select("id, name, start_date, end_date")
    .eq("id", eventId)
    .single();

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();

  const [
    { count: totalParticipants },
    { count: approvedParticipants },
    { count: pendingParticipants },
    { count: rejectedParticipants },
    { data: typeBreakdown },
    { data: allParticipants },
    { count: totalMatches },
    { count: acceptedMatches },
    { count: savedMatches },
    { count: dismissedMatches },
    { data: matchScores },
    { count: totalMeetings },
    { count: pendingMeetings },
    { count: acceptedMeetings },
    { count: declinedMeetings },
    { count: completedMeetings },
    { count: noShowMeetings },
    { data: ratingData },
    { count: totalConversations },
    { count: totalMessages },
    { data: topParticipants },
  ] = await Promise.all([
    admin.from("participants").select("*", { count: "exact", head: true }).eq("event_id", eventId),
    admin.from("participants").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "approved"),
    admin.from("participants").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "pending"),
    admin.from("participants").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "rejected"),
    admin.from("event_participant_types").select("id, name, color").eq("event_id", eventId).order("sort_order"),
    admin.from("participants").select("role, intent, participant_type_id, status").eq("event_id", eventId).eq("status", "approved"),
    admin.from("matches").select("*", { count: "exact", head: true }).eq("event_id", eventId),
    admin.from("matches").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "accepted"),
    admin.from("matches").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "saved"),
    admin.from("matches").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "dismissed"),
    admin.from("matches").select("score").eq("event_id", eventId),
    admin.from("meetings").select("*", { count: "exact", head: true }).eq("event_id", eventId),
    admin.from("meetings").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "pending"),
    admin.from("meetings").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "accepted"),
    admin.from("meetings").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "declined"),
    admin.from("meetings").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "completed"),
    admin.from("meetings").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "no_show"),
    admin.from("meetings").select("requester_rating, recipient_rating").eq("event_id", eventId).not("requester_rating", "is", null),
    admin.from("conversations").select("*", { count: "exact", head: true }).eq("event_id", eventId),
    admin.from("messages").select("*, conversations!inner(event_id)", { count: "exact", head: true }).eq("conversations.event_id", eventId),
    admin.from("matches").select(`score, participant_a:participants!matches_participant_a_id_fkey(profiles!inner(full_name, company_name)), participant_b:participants!matches_participant_b_id_fkey(profiles!inner(full_name, company_name))`).eq("event_id", eventId).order("score", { ascending: false }).limit(5),
  ]);

  const approvedList = allParticipants || [];
  const typeCounts = (typeBreakdown || []).map((t: any) => ({
    ...t,
    count: approvedList.filter((p: any) => p.participant_type_id === t.id).length,
  }));

  const roleCounts: Record<string, number> = {};
  approvedList.forEach((p: any) => { roleCounts[p.role || "unspecified"] = (roleCounts[p.role || "unspecified"] || 0) + 1; });

  const intentCounts: Record<string, number> = {};
  approvedList.forEach((p: any) => { intentCounts[p.intent || "unspecified"] = (intentCounts[p.intent || "unspecified"] || 0) + 1; });

  const avgScore = matchScores?.length ? Math.round(matchScores.reduce((sum: number, m: any) => sum + m.score, 0) / matchScores.length) : 0;
  const topScore = matchScores?.length ? Math.round(Math.max(...matchScores.map((m: any) => m.score))) : 0;
  const matchAcceptRate = totalMatches ? Math.round(((acceptedMatches || 0) / (totalMatches || 1)) * 100) : 0;

  const allRatings = [
    ...(ratingData || []).map((m: any) => m.requester_rating).filter(Boolean),
    ...(ratingData || []).map((m: any) => m.recipient_rating).filter(Boolean),
  ] as number[];
  const avgRating = allRatings.length ? (allRatings.reduce((s, r) => s + r, 0) / allRatings.length).toFixed(1) : "—";
  const meetingAcceptRate = totalMeetings ? Math.round(((acceptedMeetings || 0) + (completedMeetings || 0)) / (totalMeetings || 1) * 100) : 0;

  return NextResponse.json({
    event,
    participants: { total: totalParticipants || 0, approved: approvedParticipants || 0, pending: pendingParticipants || 0, rejected: rejectedParticipants || 0 },
    matches: { total: totalMatches || 0, accepted: acceptedMatches || 0, saved: savedMatches || 0, dismissed: dismissedMatches || 0, avgScore, topScore, acceptRate: matchAcceptRate },
    meetings: { total: totalMeetings || 0, pending: pendingMeetings || 0, accepted: acceptedMeetings || 0, declined: declinedMeetings || 0, completed: completedMeetings || 0, noShow: noShowMeetings || 0, acceptRate: meetingAcceptRate, avgRating, allRatings },
    engagement: { conversations: totalConversations || 0, messages: totalMessages || 0 },
    typeCounts,
    roleCounts,
    intentCounts,
    topParticipants: topParticipants || [],
  });
}
