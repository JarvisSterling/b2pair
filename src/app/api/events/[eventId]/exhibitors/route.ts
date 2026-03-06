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
      exhibitor_profiles(*),
      company_members(id, name, role, user_id, invite_status)
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

  // Enrich team members with profile data (title) and participant IDs for messaging
  const allUserIds = result.flatMap((c: any) =>
    (c.company_members || [])
      .filter((m: any) => m.user_id && m.invite_status === "accepted")
      .map((m: any) => m.user_id)
  );

  if (allUserIds.length > 0) {
    const [{ data: profiles }, { data: participants }] = await Promise.all([
      admin.from("profiles").select("id, full_name, title, avatar_url").in("id", allUserIds),
      admin.from("participants").select("id, user_id").eq("event_id", eventId).in("user_id", allUserIds),
    ]);

    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
    const participantMap = Object.fromEntries((participants || []).map((p: any) => [p.user_id, p.id]));

    result = result.map((c: any) => ({
      ...c,
      team: (c.company_members || [])
        .filter((m: any) => m.user_id && m.invite_status === "accepted")
        .map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          participant_id: participantMap[m.user_id] || null,
          name: profileMap[m.user_id]?.full_name || m.name,
          title: profileMap[m.user_id]?.title || null,
          avatar_url: profileMap[m.user_id]?.avatar_url || null,
          role: m.role,
        })),
    }));
  } else {
    result = result.map((c: any) => ({ ...c, team: [] }));
  }

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
