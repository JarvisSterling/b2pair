import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_INTENTS = ["buying", "selling", "investing", "partnering", "learning", "networking"];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      eventId,
      participantTypeId,
      title,
      companyName,
      industry,
      bio,
      intents,
      lookingFor,
      offering,
      companySize,
      companyWebsite,
      expertiseAreas,
      interests,
    } = body;

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Find the participant record
    const { data: participant, error: findError } = await admin
      .from("participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .single();

    if (!participant || findError) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    // Build update object
    const updates: Record<string, any> = {};

    if (participantTypeId !== undefined) {
      updates.participant_type_id = participantTypeId;
    }

    if (intents !== undefined) {
      // Validate intents
      const validIntents = (intents as string[]).filter((i) => VALID_INTENTS.includes(i));
      updates.intents = validIntents;
      // Also set legacy intent field to first selection for backward compatibility
      updates.intent = validIntents[0] || null;
    }

    if (lookingFor !== undefined) {
      updates.looking_for = lookingFor || null;
    }

    if (offering !== undefined) {
      updates.offering = offering || null;
    }

    // Update participant
    const { error: updateError } = await admin
      .from("participants")
      .update(updates)
      .eq("id", participant.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update profile if any profile fields provided
    const profileUpdates: Record<string, any> = {};
    if (title) profileUpdates.title = title;
    if (companyName) profileUpdates.company_name = companyName;
    if (companySize) profileUpdates.company_size = companySize;
    if (companyWebsite) profileUpdates.company_website = companyWebsite;
    if (industry) profileUpdates.industry = industry;
    if (bio !== undefined) profileUpdates.bio = bio || null;
    if (expertiseAreas !== undefined) profileUpdates.expertise_areas = expertiseAreas;
    if (interests !== undefined) profileUpdates.interests = interests;
    if (Object.keys(profileUpdates).length > 0) {
      await admin.from("profiles").update(profileUpdates).eq("id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update participant error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
