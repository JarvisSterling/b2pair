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
    const { eventId, title, companyName, intents, lookingFor, offering, companySize, companyWebsite } = body;

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check event exists
    const { data: event } = await admin
      .from("events")
      .select("id, requires_approval")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if already registered
    const { data: existing } = await admin
      .from("participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // Already registered — just update
      const updates: Record<string, any> = {};
      if (intents) {
        const validIntents = (intents as string[]).filter((i) => VALID_INTENTS.includes(i));
        updates.intents = validIntents;
        updates.intent = validIntents[0] || null;
      }
      if (lookingFor !== undefined) updates.looking_for = lookingFor || null;
      if (offering !== undefined) updates.offering = offering || null;

      await admin.from("participants").update(updates).eq("id", existing.id);

      return NextResponse.json({ success: true, alreadyRegistered: true });
    }

    // Build participant intents
    const validIntents = intents
      ? (intents as string[]).filter((i) => VALID_INTENTS.includes(i))
      : [];

    // Register as participant
    const { error: insertError } = await admin.from("participants").insert({
      event_id: eventId,
      user_id: user.id,
      status: event.requires_approval ? "pending" : "approved",
      role: "attendee",
      intent: validIntents[0] || "networking",
      intents: validIntents,
      looking_for: lookingFor || null,
      offering: offering || null,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update profile
    const profileUpdates: Record<string, any> = {};
    if (title) profileUpdates.title = title;
    if (companyName) profileUpdates.company_name = companyName;
    if (companySize) profileUpdates.company_size = companySize;
    if (companyWebsite) profileUpdates.company_website = companyWebsite;
    if (Object.keys(profileUpdates).length > 0) {
      await admin.from("profiles").update(profileUpdates).eq("id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Register participant error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
