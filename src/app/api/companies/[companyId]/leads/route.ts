import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { canAccessCompany } from "@/lib/sponsors-helpers";

type Params = { params: Promise<{ companyId: string }> };

/**
 * GET /api/companies/[companyId]/leads
 * List leads with optional filters
 */
export async function GET(request: Request, { params }: Params) {
  const { companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessCompany(supabase, companyId, user.id, "view_leads");
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const qualification = searchParams.get("qualification");
  const source = searchParams.get("source");

  let query = supabase
    .from("company_leads")
    .select(`
      *,
      participant:participants(
        id,
        user:users(email, raw_user_meta_data)
      )
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (qualification) query = query.eq("qualification", qualification);
  if (source) query = query.eq("source", source);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data });
}

/**
 * POST /api/companies/[companyId]/leads
 * Capture a lead (manual or automatic)
 * Body: { event_id, participant_id?, source, notes?, qualification?, tags? }
 */
export async function POST(request: Request, { params }: Params) {
  const { companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessCompany(supabase, companyId, user.id, "capture_leads");
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { event_id, participant_id, source, notes, qualification, tags, resource_accessed } = body;

  if (!event_id || !source) {
    return NextResponse.json({ error: "event_id and source required" }, { status: 400 });
  }

  // Upsert: if lead already exists for this company+participant, update
  const { data, error } = await supabase
    .from("company_leads")
    .upsert(
      {
        company_id: companyId,
        event_id,
        participant_id: participant_id || null,
        source,
        notes: notes || null,
        qualification: qualification || null,
        tags: tags || [],
        resource_accessed: resource_accessed || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id,participant_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data }, { status: 201 });
}

/**
 * PATCH /api/companies/[companyId]/leads
 * Update lead (notes, qualification, tags). Body: { id, ...updates }
 */
export async function PATCH(request: Request, { params }: Params) {
  const { companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessCompany(supabase, companyId, user.id, "capture_leads");
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  delete updates.company_id;
  delete updates.event_id;
  delete updates.created_at;
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("company_leads")
    .update(updates)
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/companies/[companyId]/leads?id=xxx
 */
export async function DELETE(request: Request, { params }: Params) {
  const { companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessCompany(supabase, companyId, user.id, "capture_leads");
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("company_leads")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
