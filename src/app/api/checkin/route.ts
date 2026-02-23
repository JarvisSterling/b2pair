import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

/**
 * GET /api/checkin?eventId=xxx
 * Get check-in stats and list for an event (organizer)
 * OR get participant's own QR token
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const mode = searchParams.get("mode"); // "my-qr" | "stats" | "list"
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (mode === "my-qr") {
    // Get or create participant's QR token
    const { data: participant } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .single();

    if (!participant) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

    let { data: qrToken } = await supabase
      .from("qr_tokens")
      .select("token")
      .eq("event_id", eventId)
      .eq("participant_id", participant.id)
      .single();

    if (!qrToken) {
      const token = `b2p_${randomBytes(16).toString("hex")}`;
      const { data: newToken } = await supabase
        .from("qr_tokens")
        .insert({ event_id: eventId, participant_id: participant.id, token })
        .select("token")
        .single();
      qrToken = newToken;
    }

    // Get check-in status
    const { data: checkIn } = await supabase
      .from("check_ins")
      .select("checked_in_at")
      .eq("event_id", eventId)
      .eq("participant_id", participant.id)
      .is("session_id", null)
      .single();

    return NextResponse.json({
      token: qrToken?.token,
      checkedIn: !!checkIn,
      checkedInAt: checkIn?.checked_in_at || null,
    });
  }

  // Organizer: stats + list
  const { count: totalParticipants } = await supabase
    .from("participants")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "approved");

  const { count: checkedInCount } = await supabase
    .from("check_ins")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .is("session_id", null);

  const { data: checkIns } = await supabase
    .from("check_ins")
    .select(`
      id, checked_in_at, method, notes, session_id,
      participant:participants!check_ins_participant_id_fkey(
        id, profiles!inner(full_name, email, avatar_url, company_name, title)
      )
    `)
    .eq("event_id", eventId)
    .is("session_id", null)
    .order("checked_in_at", { ascending: false });

  return NextResponse.json({
    totalParticipants: totalParticipants || 0,
    checkedInCount: checkedInCount || 0,
    checkIns: checkIns || [],
  });
}

/**
 * POST /api/checkin
 * Check in a participant (by QR token, email, or participant ID)
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { eventId, token, email, participantId, sessionId, method = "qr" } = body;

  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  let resolvedParticipantId = participantId;

  // Resolve by QR token
  if (token && !resolvedParticipantId) {
    const { data: qrToken } = await supabase
      .from("qr_tokens")
      .select("participant_id, event_id")
      .eq("token", token)
      .single();

    if (!qrToken) return NextResponse.json({ error: "Invalid QR code" }, { status: 404 });
    if (qrToken.event_id !== eventId) return NextResponse.json({ error: "QR code is for a different event" }, { status: 400 });
    resolvedParticipantId = qrToken.participant_id;
  }

  // Resolve by email
  if (email && !resolvedParticipantId) {
    const { data: participant } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("profiles.email", email)
      .single();

    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    resolvedParticipantId = participant.id;
  }

  if (!resolvedParticipantId) {
    return NextResponse.json({ error: "Provide token, email, or participantId" }, { status: 400 });
  }

  // Get participant info for response
  const { data: participant } = await supabase
    .from("participants")
    .select("id, profiles!inner(full_name, email, avatar_url, company_name, title)")
    .eq("id", resolvedParticipantId)
    .single();

  if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 });

  // Check if already checked in
  const { data: existing } = await supabase
    .from("check_ins")
    .select("id, checked_in_at")
    .eq("event_id", eventId)
    .eq("participant_id", resolvedParticipantId)
    .is("session_id", sessionId || null)
    .single();

  if (existing) {
    return NextResponse.json({
      success: true,
      alreadyCheckedIn: true,
      checkedInAt: existing.checked_in_at,
      participant: (participant as any).profiles,
    });
  }

  // Check in
  const { data: checkIn, error } = await supabase
    .from("check_ins")
    .insert({
      event_id: eventId,
      participant_id: resolvedParticipantId,
      checked_in_by: user.id,
      method,
      session_id: sessionId || null,
    })
    .select("id, checked_in_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    alreadyCheckedIn: false,
    checkedInAt: checkIn?.checked_in_at,
    participant: (participant as any).profiles,
  });
}

/**
 * DELETE /api/checkin
 * Undo a check-in
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const checkInId = searchParams.get("id");
  if (!checkInId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("check_ins").delete().eq("id", checkInId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
