import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_ACTIONS = [
  "profile_view",       // Viewed a participant's profile
  "profile_click",      // Clicked on a participant card
  "search",             // Searched directory
  "filter_applied",     // Applied a filter
  "meeting_request",    // Requested a meeting
  "meeting_accepted",   // Accepted a meeting request
  "meeting_declined",   // Declined a meeting request
  "meeting_rated",      // Rated a meeting
  "message_sent",       // Sent a message
  "match_saved",        // Saved a match
  "match_dismissed",    // Dismissed a match
  "session_attended",   // Attended an agenda session
  "document_downloaded",// Downloaded a resource
];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId, actionType, targetParticipantId, metadata } = await req.json();

    if (!eventId || !actionType) {
      return NextResponse.json({ error: "Missing eventId or actionType" }, { status: 400 });
    }

    if (!VALID_ACTIONS.includes(actionType)) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    // Get participant ID
    const { data: participant } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .single();

    if (!participant) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    // Insert activity
    const { error } = await supabase
      .from("participant_activity")
      .insert({
        participant_id: participant.id,
        event_id: eventId,
        action_type: actionType,
        target_participant_id: targetParticipantId || null,
        metadata: metadata || {},
      });

    if (error) {
      console.error("Activity track error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
