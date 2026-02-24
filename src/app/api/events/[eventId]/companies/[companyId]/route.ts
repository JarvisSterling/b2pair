import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { canAccessCompany, isEventOrganizer } from "@/lib/sponsors-helpers";

type Params = { params: Promise<{ eventId: string; companyId: string }> };

/**
 * GET /api/events/[eventId]/companies/[companyId]
 * Get company detail with profiles
 */
export async function GET(request: Request, { params }: Params) {
  const { eventId, companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessCompany(supabase, companyId, user.id, "edit_company");
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("companies")
    .select(`
      *,
      sponsor_profiles(*, tier:sponsor_tiers(*)),
      exhibitor_profiles(*),
      company_members(id, email, name, role, invite_status, invite_code, accepted_at)
    `)
    .eq("id", companyId)
    .eq("event_id", eventId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ company: data });
}

/**
 * PATCH /api/events/[eventId]/companies/[companyId]
 * Update company details
 */
export async function PATCH(request: Request, { params }: Params) {
  const { eventId, companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessCompany(supabase, companyId, user.id, "edit_company");
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { sponsor_profile, exhibitor_profile, ...companyUpdates } = body;

  // Prevent changing protected fields
  delete companyUpdates.id;
  delete companyUpdates.event_id;
  delete companyUpdates.capabilities;
  delete companyUpdates.status;
  delete companyUpdates.created_at;

  // Update company
  if (Object.keys(companyUpdates).length > 0) {
    companyUpdates.updated_at = new Date().toISOString();
    const { error } = await supabase
      .from("companies")
      .update(companyUpdates)
      .eq("id", companyId)
      .eq("event_id", eventId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update sponsor profile if provided
  if (sponsor_profile) {
    delete sponsor_profile.id;
    delete sponsor_profile.company_id;
    sponsor_profile.updated_at = new Date().toISOString();
    const { error } = await supabase
      .from("sponsor_profiles")
      .update(sponsor_profile)
      .eq("company_id", companyId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update exhibitor profile if provided
  if (exhibitor_profile) {
    delete exhibitor_profile.id;
    delete exhibitor_profile.company_id;
    exhibitor_profile.updated_at = new Date().toISOString();
    const { error } = await supabase
      .from("exhibitor_profiles")
      .update(exhibitor_profile)
      .eq("company_id", companyId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/events/[eventId]/companies/[companyId]
 * Delete company (organizer only)
 */
export async function DELETE(request: Request, { params }: Params) {
  const { eventId, companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isOrganizer = await isEventOrganizer(supabase, eventId, user.id);
  if (!isOrganizer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", companyId)
    .eq("event_id", eventId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
