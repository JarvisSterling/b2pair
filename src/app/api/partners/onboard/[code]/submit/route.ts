import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ code: string }> };

/**
 * POST /api/partners/onboard/[code]/submit
 * Submit company for review
 */
export async function POST(request: Request, { params }: Params) {
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

  const { data: company } = await admin
    .from("companies")
    .select("*, sponsor_profiles(*), exhibitor_profiles(*)")
    .eq("id", member.company_id)
    .single();

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  if (company.status !== "onboarding" && company.status !== "rejected") {
    return NextResponse.json({ error: `Cannot submit from ${company.status} status` }, { status: 400 });
  }

  const missing: string[] = [];
  if (!company.name) missing.push("Company name");
  if (!company.logo_url) missing.push("Logo");
  if (!company.description_short) missing.push("Short description");

  if (company.capabilities.includes("sponsor")) {
    const sp = Array.isArray(company.sponsor_profiles) ? company.sponsor_profiles[0] : company.sponsor_profiles;
    if (!sp?.cta_buttons?.length) missing.push("At least one CTA button");
  }

  if (company.capabilities.includes("exhibitor")) {
    const ep = Array.isArray(company.exhibitor_profiles) ? company.exhibitor_profiles[0] : company.exhibitor_profiles;
    if (!ep?.products?.length && !company.description_long) {
      missing.push("Product catalog or detailed description");
    }
  }

  if (missing.length > 0) {
    return NextResponse.json({ error: "Missing required fields", missing }, { status: 400 });
  }

  await admin
    .from("companies")
    .update({ status: "submitted", rejection_reason: null, updated_at: new Date().toISOString() })
    .eq("id", member.company_id);

  return NextResponse.json({ success: true });
}
