import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/contacts/exchange
 * Request contact card exchange with another participant.
 * Creates a notification for the other user.
 */
export async function POST(request: Request) {
  const { participantId, eventId } = await request.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get the other participant's user_id
  const { data: otherParticipant } = await supabase
    .from("participants")
    .select("user_id, profiles!inner(full_name)")
    .eq("id", participantId)
    .single();

  if (!otherParticipant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  // Get my name
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Create notification for the other user
  const { error } = await supabase.from("notifications").insert({
    user_id: (otherParticipant as any).user_id,
    type: "contact_exchange",
    title: `${myProfile?.full_name || "Someone"} wants to exchange contacts`,
    body: "View their profile to accept the exchange.",
    link: `/dashboard/profile/${user.id}`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * GET /api/contacts/exchange?userId=xxx
 * Get contact card for a connected user (respects visibility settings).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if they're connected (have an accepted match)
  const { data: myParticipants } = await supabase
    .from("participants")
    .select("id")
    .eq("user_id", user.id);

  const { data: theirParticipants } = await supabase
    .from("participants")
    .select("id")
    .eq("user_id", userId);

  const myIds = (myParticipants || []).map((p) => p.id);
  const theirIds = (theirParticipants || []).map((p) => p.id);

  const { data: connection } = await supabase
    .from("matches")
    .select("id")
    .or(`and(participant_a_id.in.(${myIds.join(",")}),participant_b_id.in.(${theirIds.join(",")})),and(participant_a_id.in.(${theirIds.join(",")}),participant_b_id.in.(${myIds.join(",")}))`)
    .eq("status", "accepted")
    .limit(1)
    .single();

  const isConnected = !!connection;

  // Get profile with visibility settings
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, title, company_name, industry, email, phone, linkedin_url, twitter_url, website_url, visibility_email, visibility_phone, visibility_company, visibility_social")
    .eq("id", userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Apply visibility rules
  const card: Record<string, string | null> = {
    full_name: profile.full_name,
    industry: profile.industry,
  };

  const canSee = (visibility: string) =>
    visibility === "everyone" || (visibility === "connections" && isConnected);

  if (canSee(profile.visibility_company || "everyone")) {
    card.title = profile.title;
    card.company_name = profile.company_name;
  }
  if (canSee(profile.visibility_email || "connections")) {
    card.email = profile.email;
  }
  if (canSee(profile.visibility_phone || "nobody")) {
    card.phone = profile.phone;
  }
  if (canSee(profile.visibility_social || "connections")) {
    card.linkedin_url = profile.linkedin_url;
    card.twitter_url = profile.twitter_url;
    card.website_url = profile.website_url;
  }

  return NextResponse.json({ card, isConnected });
}
