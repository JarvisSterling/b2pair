import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_INTENTS = ["buying", "selling", "investing", "partnering", "learning", "networking"];

/**
 * POST /api/events/update-all-participants
 * Updates intents/looking_for/offering on ALL participant records for the current user.
 * Used by the complete-profile page where there's no specific event context.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { intents, lookingFor, offering } = body;

    const admin = createAdminClient();

    const updates: Record<string, any> = {};

    if (intents && Array.isArray(intents)) {
      const validIntents = intents.filter((i: string) => VALID_INTENTS.includes(i));
      if (validIntents.length > 0) {
        updates.intents = validIntents;
        updates.intent = validIntents[0];
      }
    }

    if (lookingFor !== undefined) updates.looking_for = lookingFor || null;
    if (offering !== undefined) updates.offering = offering || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    const { data, error } = await admin
      .from("participants")
      .update(updates)
      .eq("user_id", user.id)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: data?.length || 0 });
  } catch (error) {
    console.error("Update all participants error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
