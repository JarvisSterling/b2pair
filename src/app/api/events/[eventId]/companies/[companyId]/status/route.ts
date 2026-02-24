import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isEventOrganizer, canAccessCompany } from "@/lib/sponsors-helpers";

type Params = { params: Promise<{ eventId: string; companyId: string }> };

// Valid status transitions
const ORGANIZER_TRANSITIONS: Record<string, string[]> = {
  submitted: ["approved", "rejected"],
  approved: ["live"],
  rejected: ["approved"], // re-approve after rejection
  live: ["approved"], // unpublish
};

const COMPANY_TRANSITIONS: Record<string, string[]> = {
  onboarding: ["submitted"],
  rejected: ["submitted"], // resubmit after fixing
};

/**
 * PATCH /api/events/[eventId]/companies/[companyId]/status
 * Change company status (organizer: approve/reject/publish, company: submit)
 * Body: { status, rejection_reason? }
 */
export async function PATCH(request: Request, { params }: Params) {
  const { eventId, companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { status: newStatus, rejection_reason } = body;
  if (!newStatus) return NextResponse.json({ error: "status required" }, { status: 400 });

  // Get current company
  const { data: company, error } = await supabase
    .from("companies")
    .select("status, event_id")
    .eq("id", companyId)
    .eq("event_id", eventId)
    .single();

  if (error || !company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const isOrganizer = await isEventOrganizer(supabase, eventId, user.id);

  // Check valid transition
  if (isOrganizer) {
    const valid = ORGANIZER_TRANSITIONS[company.status];
    if (!valid?.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${company.status} to ${newStatus}` },
        { status: 400 }
      );
    }
  } else {
    // Company member submitting
    const canAccess = await canAccessCompany(supabase, companyId, user.id, "edit_company");
    if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const valid = COMPANY_TRANSITIONS[company.status];
    if (!valid?.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${company.status} to ${newStatus}` },
        { status: 400 }
      );
    }

    // Validate required fields before submission
    if (newStatus === "submitted") {
      const { data: fullCompany } = await supabase
        .from("companies")
        .select("name, logo_url, description_short, capabilities")
        .eq("id", companyId)
        .single();

      const missing: string[] = [];
      if (!fullCompany?.name) missing.push("Company name");
      if (!fullCompany?.logo_url) missing.push("Logo");
      if (!fullCompany?.description_short) missing.push("Short description");

      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Missing required fields: ${missing.join(", ")}` },
          { status: 400 }
        );
      }
    }
  }

  // Build update
  const update: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (newStatus === "rejected" && rejection_reason) {
    update.rejection_reason = rejection_reason;
  }
  if (newStatus === "approved") {
    update.rejection_reason = null;

    // Check auto-publish
    const { data: event } = await supabase
      .from("events")
      .select("auto_publish_partners")
      .eq("id", eventId)
      .single();

    if (event?.auto_publish_partners) {
      update.status = "live";
    }
  }

  const { error: updateError } = await supabase
    .from("companies")
    .update(update)
    .eq("id", companyId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ success: true, status: update.status });
}
