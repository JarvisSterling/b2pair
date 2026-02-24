import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { canAccessCompany } from "@/lib/sponsors-helpers";

type Params = { params: Promise<{ companyId: string }> };

/**
 * GET /api/companies/[companyId]/analytics
 * Get analytics dashboard data (last 30 days by default)
 */
export async function GET(request: Request, { params }: Params) {
  const { companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessCompany(supabase, companyId, user.id, "view_analytics");
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30");
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("company_analytics")
    .select("*")
    .eq("company_id", companyId)
    .gte("date", since.toISOString().split("T")[0])
    .order("date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute totals
  const totals = (data || []).reduce(
    (acc, row) => ({
      profile_views: acc.profile_views + (row.profile_views || 0),
      unique_visitors: acc.unique_visitors + (row.unique_visitors || 0),
      resource_downloads: acc.resource_downloads + (row.resource_downloads || 0),
      meeting_requests_received: acc.meeting_requests_received + (row.meeting_requests_received || 0),
      leads_captured: acc.leads_captured + (row.leads_captured || 0),
    }),
    { profile_views: 0, unique_visitors: 0, resource_downloads: 0, meeting_requests_received: 0, leads_captured: 0 }
  );

  return NextResponse.json({ daily: data, totals });
}

/**
 * POST /api/companies/[companyId]/analytics/track
 * Track an event (fire-and-forget from client)
 * Body: { event_id, type: 'profile_view'|'resource_download'|'cta_click'|'meeting_request', cta_label?, resource_name? }
 */
export async function POST(request: Request, { params }: Params) {
  const { companyId } = await params;
  const supabase = await createClient();

  const body = await request.json();
  const { event_id, type, cta_label } = body;

  if (!event_id || !type) {
    return NextResponse.json({ error: "event_id and type required" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Upsert today's analytics row
  const { data: existing } = await supabase
    .from("company_analytics")
    .select("id, profile_views, resource_downloads, cta_clicks, meeting_requests_received, leads_captured")
    .eq("company_id", companyId)
    .eq("date", today)
    .maybeSingle();

  if (existing) {
    const updates: Record<string, unknown> = {};
    switch (type) {
      case "profile_view":
        updates.profile_views = (existing.profile_views || 0) + 1;
        break;
      case "resource_download":
        updates.resource_downloads = (existing.resource_downloads || 0) + 1;
        break;
      case "cta_click": {
        const clicks = existing.cta_clicks || {};
        (clicks as Record<string, number>)[cta_label || "unknown"] =
          ((clicks as Record<string, number>)[cta_label || "unknown"] || 0) + 1;
        updates.cta_clicks = clicks;
        break;
      }
      case "meeting_request":
        updates.meeting_requests_received = (existing.meeting_requests_received || 0) + 1;
        break;
    }
    await supabase.from("company_analytics").update(updates).eq("id", existing.id);
  } else {
    const row: Record<string, unknown> = {
      company_id: companyId,
      event_id,
      date: today,
      profile_views: type === "profile_view" ? 1 : 0,
      resource_downloads: type === "resource_download" ? 1 : 0,
      cta_clicks: type === "cta_click" ? { [cta_label || "unknown"]: 1 } : {},
      meeting_requests_received: type === "meeting_request" ? 1 : 0,
      leads_captured: 0,
    };
    await supabase.from("company_analytics").insert(row);
  }

  return NextResponse.json({ success: true });
}
