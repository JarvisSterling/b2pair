import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/user/companies
 * Returns all company memberships for the current user, grouped by event.
 * Optionally filter by ?eventId=xxx
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  const admin = createAdminClient();

  // Get all company_members rows for this user (using admin to bypass RLS)
  const { data: memberships, error: memErr } = await admin
    .from("company_members")
    .select("id, company_id, role, invite_status")
    .eq("user_id", user.id)
    .eq("invite_status", "accepted");

  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });
  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ memberships: [] });
  }

  // Get company details for each membership
  const companyIds = memberships.map((m) => m.company_id);
  let companyQuery = admin
    .from("companies")
    .select("id, event_id, name, slug, logo_url, capabilities, status")
    .in("id", companyIds);

  if (eventId) {
    companyQuery = companyQuery.eq("event_id", eventId);
  }

  const { data: companies, error: compErr } = await companyQuery;
  if (compErr) return NextResponse.json({ error: compErr.message }, { status: 500 });

  // Get event names
  const eventIds = [...new Set((companies || []).map((c) => c.event_id))];
  const { data: events } = eventIds.length > 0
    ? await admin.from("events").select("id, name, slug").in("id", eventIds)
    : { data: [] };

  const eventsMap = Object.fromEntries((events || []).map((e) => [e.id, e]));
  const companiesMap = Object.fromEntries((companies || []).map((c) => [c.id, c]));

  // Build response: membership + company + event info
  const result = memberships
    .filter((m) => companiesMap[m.company_id])
    .map((m) => {
      const company = companiesMap[m.company_id];
      const event = eventsMap[company.event_id];
      return {
        membership_id: m.id,
        company_id: company.id,
        company_name: company.name,
        company_slug: company.slug,
        company_logo: company.logo_url,
        capabilities: company.capabilities,
        company_status: company.status,
        role: m.role,
        event_id: company.event_id,
        event_name: event?.name || "Unknown Event",
        event_slug: event?.slug || "",
      };
    });

  return NextResponse.json({ memberships: result });
}
