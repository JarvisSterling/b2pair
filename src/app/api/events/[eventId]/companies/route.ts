import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isEventOrganizer, generateSlug, ensureUniqueSlug } from "@/lib/sponsors-helpers";

/**
 * GET /api/events/[eventId]/companies
 * List companies for an event (organizer only)
 * Query params: ?status=approved&capability=sponsor
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isOrganizer = await isEventOrganizer(supabase, eventId, user.id);
  if (!isOrganizer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const capability = searchParams.get("capability");

  let query = supabase
    .from("companies")
    .select(`
      *,
      sponsor_profiles(*),
      exhibitor_profiles(*),
      company_members(id, email, role, invite_code, invite_status)
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (capability) query = query.contains("capabilities", [capability]);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add member count and extract admin invite code
  const companies = (data || []).map((c: Record<string, unknown>) => {
    const members = Array.isArray(c.company_members) ? c.company_members : [];
    const adminMember = members.find((m: any) => m.role === "admin" && m.invite_status === "pending");
    return {
      ...c,
      members_count: members.length,
      invite_code: (adminMember as any)?.invite_code || null,
      company_members: undefined,
    };
  });

  return NextResponse.json({ companies });
}

/**
 * POST /api/events/[eventId]/companies
 * Create a new company (organizer creates partner slot)
 * Body: { name, contact_email, capabilities: ['sponsor'|'exhibitor'|both], tier_id?, booth_type? }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isOrganizer = await isEventOrganizer(supabase, eventId, user.id);
  if (!isOrganizer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, contact_email, capabilities, tier_id, booth_type, booth_number, team_limit, company_size, website } = body;

  if (!name || !contact_email || !capabilities?.length) {
    return NextResponse.json({ error: "name, contact_email, and capabilities required" }, { status: 400 });
  }

  const slug = await ensureUniqueSlug(supabase, eventId, generateSlug(name));

  // Create company
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      event_id: eventId,
      name,
      slug,
      capabilities,
      status: "invited",
      team_limit: team_limit || null,
      company_size: company_size || null,
      website: website || null,
    })
    .select()
    .single();

  if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 });

  // Create sponsor profile if sponsor capability
  if (capabilities.includes("sponsor")) {
    await supabase.from("sponsor_profiles").insert({
      company_id: company.id,
      tier_id: tier_id || null,
    });
  }

  // Create exhibitor profile if exhibitor capability
  if (capabilities.includes("exhibitor")) {
    await supabase.from("exhibitor_profiles").insert({
      company_id: company.id,
      booth_type: booth_type || null,
      booth_number: booth_number || null,
    });
  }

  // Create initial company member (the contact) as admin with pending invite
  const { data: member } = await supabase
    .from("company_members")
    .insert({
      company_id: company.id,
      email: contact_email,
      name: name,
      role: "admin",
      invite_status: "pending",
    })
    .select()
    .single();

  return NextResponse.json({
    company,
    invite_code: member?.invite_code,
    invite_url: `/events/${eventId}/partners/onboard/${member?.invite_code}`,
  }, { status: 201 });
}
