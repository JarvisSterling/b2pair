import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/sponsors
 * Public list of live sponsors, grouped by tier
 */
export async function GET(request: Request, { params }: Params) {
  const { eventId } = await params;
  const supabase = await createClient();

  // Get tiers
  const { data: tiers } = await supabase
    .from("sponsor_tiers")
    .select("*")
    .eq("event_id", eventId)
    .order("rank", { ascending: true });

  // Get live sponsor companies with profiles
  const { data: companies } = await supabase
    .from("companies")
    .select(`
      id, name, slug, website, industry, description_short, description_long,
      logo_url, banner_url, brand_colors,
      sponsor_profiles(*)
    `)
    .eq("event_id", eventId)
    .eq("status", "live")
    .contains("capabilities", ["sponsor"]);

  // Group by tier
  const grouped = (tiers || []).map((tier) => ({
    tier,
    sponsors: (companies || [])
      .filter((c: Record<string, unknown>) => {
        const sp = Array.isArray(c.sponsor_profiles)
          ? c.sponsor_profiles[0]
          : c.sponsor_profiles;
        return sp?.tier_id === tier.id;
      })
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const spA = Array.isArray(a.sponsor_profiles) ? a.sponsor_profiles[0] : a.sponsor_profiles;
        const spB = Array.isArray(b.sponsor_profiles) ? b.sponsor_profiles[0] : b.sponsor_profiles;
        return ((spA as Record<string, number>)?.sort_order || 0) - ((spB as Record<string, number>)?.sort_order || 0);
      }),
  }));

  // Also include sponsors without a tier
  const untiered = (companies || []).filter((c: Record<string, unknown>) => {
    const sp = Array.isArray(c.sponsor_profiles)
      ? c.sponsor_profiles[0]
      : c.sponsor_profiles;
    return !sp?.tier_id;
  });

  return NextResponse.json({ grouped, untiered, tiers });
}
