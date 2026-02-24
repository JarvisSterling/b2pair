import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ companyId: string }> };

async function getSeatLimit(admin: any, companyId: string): Promise<number> {
  // Check company-level override first
  const { data: company } = await admin
    .from("companies")
    .select("team_limit")
    .eq("id", companyId)
    .single();

  if (company?.team_limit) return company.team_limit;

  // Fall back to tier seat_limit
  const { data: sp } = await admin
    .from("sponsor_profiles")
    .select("tier_id")
    .eq("company_id", companyId)
    .single();

  if (sp?.tier_id) {
    const { data: tier } = await admin
      .from("sponsor_tiers")
      .select("seat_limit")
      .eq("id", sp.tier_id)
      .single();
    if (tier?.seat_limit) return tier.seat_limit;
  }

  return 5; // default
}

/**
 * GET /api/companies/[companyId]/members
 */
export async function GET(request: Request, { params }: Params) {
  const { companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Verify membership
  const { data: membership } = await admin
    .from("company_members")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("invite_status", "accepted")
    .single();

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: members, error } = await admin
    .from("company_members")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const seatLimit = await getSeatLimit(admin, companyId);

  return NextResponse.json({ members: members || [], seat_limit: seatLimit });
}

/**
 * POST /api/companies/[companyId]/members
 * Invite a new team member
 */
export async function POST(request: Request, { params }: Params) {
  const { companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Verify admin/manager role
  const { data: membership } = await admin
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("invite_status", "accepted")
    .single();

  if (!membership || !["admin", "manager"].includes(membership.role)) {
    return NextResponse.json({ error: "Only admins and managers can invite members" }, { status: 403 });
  }

  const body = await request.json();
  const { email, name, role } = body;

  if (!email || !role) {
    return NextResponse.json({ error: "email and role required" }, { status: 400 });
  }

  // Check seat limit
  const seatLimit = await getSeatLimit(admin, companyId);

  const { count: currentMembers } = await admin
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if ((currentMembers || 0) >= seatLimit) {
    return NextResponse.json(
      { error: `Seat limit reached (${seatLimit}). Contact the event organizer to increase your limit.` },
      { status: 400 }
    );
  }

  // Generate invite code
  const inviteCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  const { data: member, error } = await admin
    .from("company_members")
    .insert({
      company_id: companyId,
      email,
      name: name || null,
      role,
      invite_code: inviteCode,
      invite_status: "pending",
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
 * Update member role
 */
export async function PATCH(request: Request, { params }: Params) {
  const { companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("invite_status", "accepted")
    .single();

  if (!membership || !["admin", "manager"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { id, role } = body;

  if (!id || !role) return NextResponse.json({ error: "id and role required" }, { status: 400 });

  const { error } = await admin
    .from("company_members")
    .update({ role })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/companies/[companyId]/members
 * Remove a member
 */
export async function DELETE(request: Request, { params }: Params) {
  const { companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("invite_status", "accepted")
    .single();

  if (!membership || !["admin", "manager"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Don't allow removing the last admin
  const { data: targetMember } = await admin
    .from("company_members")
    .select("role")
    .eq("id", id)
    .single();

  if (targetMember?.role === "admin") {
    const { count } = await admin
      .from("company_members")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("role", "admin");
    if ((count || 0) <= 1) {
      return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 });
    }
  }

  const { error } = await admin
    .from("company_members")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
