import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { canAccessCompany } from "@/lib/sponsors-helpers";

type Params = { params: Promise<{ companyId: string }> };

/**
 * GET /api/companies/[companyId]/members
 * List company members
 */
export async function GET(request: Request, { params }: Params) {
  const { companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessCompany(supabase, companyId, user.id, "view_leads");
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("company_members")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data });
}

/**
 * POST /api/companies/[companyId]/members
 * Invite a new team member
 * Body: { email, name, role }
 */
export async function POST(request: Request, { params }: Params) {
  const { companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessCompany(supabase, companyId, user.id, "invite_members");
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { email, name, role } = body;

  if (!email || !role) {
    return NextResponse.json({ error: "email and role required" }, { status: 400 });
  }

  // Check seat limit
  const { data: company } = await supabase
    .from("companies")
    .select("capabilities, sponsor_profiles(tier:sponsor_tiers(seat_limit))")
    .eq("id", companyId)
    .single();

  const { count: currentMembers } = await supabase
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  // Get seat limit from tier or default to 10
  let seatLimit = 10;
  if (company?.sponsor_profiles) {
    const sp = Array.isArray(company.sponsor_profiles)
      ? company.sponsor_profiles[0]
      : company.sponsor_profiles;
    if (sp?.tier?.seat_limit) seatLimit = sp.tier.seat_limit;
  }

  if ((currentMembers || 0) >= seatLimit) {
    return NextResponse.json(
      { error: `Seat limit reached (${seatLimit}). Upgrade your package for more seats.` },
      { status: 400 }
    );
  }

  const { data: member, error } = await supabase
    .from("company_members")
    .insert({
      company_id: companyId,
      email,
      name: name || null,
      role,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes("duplicate")) {
      return NextResponse.json({ error: "This email is already invited" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member, invite_code: member.invite_code }, { status: 201 });
}

/**
 * PATCH /api/companies/[companyId]/members
 * Update member role. Body: { id, role }
 */
export async function PATCH(request: Request, { params }: Params) {
  const { companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessCompany(supabase, companyId, user.id, "invite_members");
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { id, role } = body;

  if (!id || !role) return NextResponse.json({ error: "id and role required" }, { status: 400 });

  const { error } = await supabase
    .from("company_members")
    .update({ role })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/companies/[companyId]/members
 * Remove a member. Query: ?id=xxx
 */
export async function DELETE(request: Request, { params }: Params) {
  const { companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessCompany(supabase, companyId, user.id, "invite_members");
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Don't allow removing the last admin
  const { data: member } = await supabase
    .from("company_members")
    .select("role")
    .eq("id", id)
    .single();

  if (member?.role === "admin") {
    const { count } = await supabase
      .from("company_members")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("role", "admin");
    if ((count || 0) <= 1) {
      return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from("company_members")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
