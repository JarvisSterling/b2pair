import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/exhibitors
 * Public list of live exhibitors, filterable by product category
 */
export async function GET(request: Request, { params }: Params) {
  const { eventId } = await params;
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  const admin = createAdminClient();

  let query = admin
    .from("companies")
    .select(`
      id, name, slug, website, industry, description_short, description_long,
      logo_url, banner_url,
      exhibitor_profiles(*)
    `)
    .eq("event_id", eventId)
    .eq("status", "live")
    .contains("capabilities", ["exhibitor"]);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data: companies, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let result = companies || [];

  // Filter by product category (post-query since it's in jsonb)
  if (category) {
    result = result.filter((c: Record<string, unknown>) => {
      const ep = Array.isArray(c.exhibitor_profiles)
        ? c.exhibitor_profiles[0]
        : c.exhibitor_profiles;
      return (ep as Record<string, string[]>)?.product_categories?.includes(category);
    });
  }

  // Sort by exhibitor sort_order
  result.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    const epA = Array.isArray(a.exhibitor_profiles) ? a.exhibitor_profiles[0] : a.exhibitor_profiles;
    const epB = Array.isArray(b.exhibitor_profiles) ? b.exhibitor_profiles[0] : b.exhibitor_profiles;
    return ((epA as Record<string, number>)?.sort_order || 0) - ((epB as Record<string, number>)?.sort_order || 0);
  });

  // Get all unique categories for filter UI
  const allCategories = new Set<string>();
  (companies || []).forEach((c: Record<string, unknown>) => {
    const ep = Array.isArray(c.exhibitor_profiles)
      ? c.exhibitor_profiles[0]
      : c.exhibitor_profiles;
    ((ep as Record<string, string[]>)?.product_categories || []).forEach((cat: string) =>
      allCategories.add(cat)
    );
  });

  return NextResponse.json({
    exhibitors: result,
    categories: Array.from(allCategories).sort(),
  });
}
