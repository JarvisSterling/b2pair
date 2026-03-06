import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ participantId: string }> };

/**
 * GET /api/participants/[participantId]
 * Returns full participant + profile data for a given participant ID.
 * Used by the exhibitor team member panel to show participant details.
 */
export async function GET(_request: Request, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { participantId } = await params;
  const admin = createAdminClient();

  const { data: participant, error } = await admin
    .from("participants")
    .select(
      `
      id, role, intent, tags, company_role, looking_for, offering,
      profiles!inner(full_name, email, avatar_url, title, company_name, company_size, industry, bio, expertise_areas)
    `
    )
    .eq("id", participantId)
    .single();

  if (error || !participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  return NextResponse.json({ participant });
}
