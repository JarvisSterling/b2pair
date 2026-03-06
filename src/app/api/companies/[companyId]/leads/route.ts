import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Use admin client to bypass RLS — company members may not be event participants
  const admin = createAdminClient();
  let query = admin
    .from("company_leads")
    .select(`
      *,
      participant:participants(
        id,
        user_id,
        profiles(full_name, avatar_url, title, company_name)
      )
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (qualification) query = query.eq("qualification", qualification);
  if (source) query = query.eq("source", source);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Batch fetch emails from auth for all participant user_ids
  const userIds = [...new Set((data || []).map((l: any) => l.participant?.user_id).filter(Boolean))];
  const emailMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of authUsers?.users || []) {
      if (userIds.includes(u.id)) emailMap[u.id] = u.email || "";
    }
  }

  // Merge email into each lead's participant data
  const enriched = (data || []).map((lead: any) => ({
    ...lead,
    participant: lead.participant
      ? { ...lead.participant, email: emailMap[lead.participant.user_id] || "" }
      : null,
  }));

  return NextResponse.json({ leads: enriched });
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

  const body = await request.json();
  const { event_id, participant_id, source, notes, qualification, tags, resource_accessed } = body;

  if (!event_id || !source) {
    return NextResponse.json({ error: "event_id and source required" }, { status: 400 });
  }

  // Allow self-capture (visitor auto-captured when viewing a company profile)
  // Otherwise require capture_leads permission on the company
  const admin = createAdminClient();
  let isSelfCapture = false;
  if (participant_id) {
    const { data: part } = await admin
      .from("participants")
      .select("user_id")
      .eq("id", participant_id)
      .single();
    isSelfCapture = part?.user_id === user.id;
  }

  if (!isSelfCapture) {
    const canAccess = await canAccessCompany(supabase, companyId, user.id, "capture_leads");
    if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Upsert: if lead already exists for this company+participant, update
  const { data, error } = await admin
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

  // Increment leads_captured in analytics (fire-and-forget)
  const today = new Date().toISOString().split("T")[0];
  const { data: existing } = await admin
    .from("company_analytics")
    .select("id, leads_captured")
    .eq("company_id", companyId)
    .eq("date", today)
    .maybeSingle();

  if (existing) {
    await admin.from("company_analytics").update({
      leads_captured: (existing.leads_captured || 0) + 1,
    }).eq("id", existing.id);
  } else {
    await admin.from("company_analytics").insert({
      company_id: companyId,
      event_id,
      date: today,
      leads_captured: 1,
      profile_views: 0,
      unique_visitors: 0,
      resource_downloads: 0,
      cta_clicks: {},
      meeting_requests_received: 0,
    });
  }

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

  const admin = createAdminClient();
  const { error } = await admin
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

  const admin = createAdminClient();
  const { error } = await admin
    .from("company_leads")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
