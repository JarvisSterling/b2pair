import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ code: string }> };

/**
 * GET /api/partners/onboard/[code]
 * Validate invite code, return company + event info (no eventId needed)
 */
export async function GET(request: Request, { params }: Params) {
  const { code } = await params;
  const admin = createAdminClient();

  const { data: member, error } = await admin
    .from("company_members")
    .select(`
      id, email, name, role, invite_status,
      company:companies(
        id, name, slug, event_id, capabilities, status,
        logo_url, banner_url, description_short, description_long,
        website, industry, hq_location, brand_colors,
        sponsor_profiles(*),
        exhibitor_profiles(*)
      )
    `)
    .eq("invite_code", code)
    .single();

  if (error || !member) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  const company = Array.isArray(member.company) ? member.company[0] : member.company;
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  if (member.invite_status === "expired") {
    return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
  }

  if (member.invite_status === "accepted") {
    return NextResponse.json({ error: "This invite has already been used", alreadyAccepted: true }, { status: 409 });
  }

  // Get event info using admin client (bypasses RLS)
  const { data: event } = await admin
    .from("events")
    .select("id, name, slug, banner_url, logo_url")
    .eq("id", company.event_id)
    .single();

  return NextResponse.json({
    member: { id: member.id, email: member.email, name: member.name, role: member.role },
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      capabilities: company.capabilities,
      status: company.status,
      logo_url: company.logo_url,
      banner_url: company.banner_url,
      description_short: company.description_short,
      description_long: company.description_long,
      website: company.website,
      industry: company.industry,
      hq_location: company.hq_location,
      brand_colors: company.brand_colors,
      sponsor_profile: Array.isArray(company.sponsor_profiles) ? company.sponsor_profiles[0] : company.sponsor_profiles,
      exhibitor_profile: Array.isArray(company.exhibitor_profiles) ? company.exhibitor_profiles[0] : company.exhibitor_profiles,
    },
    event: event || { id: company.event_id, name: "Event", slug: "" },
  });
}

/**
 * POST /api/partners/onboard/[code]
 * Start onboarding — link authenticated user to company
 */
export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first" }, { status: 401 });

  const admin = createAdminClient();

  const { data: member } = await admin
    .from("company_members")
    .select("id, company_id, invite_status")
    .eq("invite_code", code)
    .single();

  if (!member) return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  if (member.invite_status !== "pending") {
    return NextResponse.json({ error: "Invite already used or expired" }, { status: 400 });
  }

  await admin
    .from("company_members")
    .update({
      user_id: user.id,
      invite_status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", member.id);

  const { data: company } = await admin
    .from("companies")
    .select("status")
    .eq("id", member.company_id)
    .single();

  if (company?.status === "invited") {
    await admin
      .from("companies")
      .update({
        admin_user_id: user.id,
        status: "onboarding",
        updated_at: new Date().toISOString(),
      })
      .eq("id", member.company_id);
  }

  return NextResponse.json({ success: true, company_id: member.company_id });
}

/**
 * PATCH /api/partners/onboard/[code]
 * Save wizard progress
 */
export async function PATCH(request: Request, { params }: Params) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: member } = await admin
    .from("company_members")
    .select("id, company_id, user_id")
    .eq("invite_code", code)
    .single();

  if (!member || member.user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { company: companyUpdates, sponsor_profile, exhibitor_profile } = body;

  if (companyUpdates && Object.keys(companyUpdates).length > 0) {
    delete companyUpdates.id;
    delete companyUpdates.event_id;
    delete companyUpdates.capabilities;
    delete companyUpdates.status;
    companyUpdates.updated_at = new Date().toISOString();
    await admin.from("companies").update(companyUpdates).eq("id", member.company_id);
  }

  if (sponsor_profile) {
    delete sponsor_profile.id;
    delete sponsor_profile.company_id;
    sponsor_profile.updated_at = new Date().toISOString();
    await admin.from("sponsor_profiles").update(sponsor_profile).eq("company_id", member.company_id);
  }

  if (exhibitor_profile) {
    delete exhibitor_profile.id;
    delete exhibitor_profile.company_id;
    exhibitor_profile.updated_at = new Date().toISOString();
    await admin.from("exhibitor_profiles").update(exhibitor_profile).eq("company_id", member.company_id);
  }

  return NextResponse.json({ success: true });
}
