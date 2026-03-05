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

  // Optionally create a participant record for the admin
  const body = await request.json().catch(() => ({}));
  const { personal_profile } = body;

  if (personal_profile?.title && personal_profile?.intents?.length > 0) {
    const validIntents = ["buying", "selling", "investing", "partnering", "learning", "networking"];
    const cleanIntents = (personal_profile.intents as string[]).filter((i) => validIntents.includes(i));

    // Determine role
    const companyRole = company.capabilities.includes("sponsor") ? "sponsor_rep"
      : company.capabilities.includes("exhibitor") ? "exhibitor_staff"
      : "attendee";
    const participantRole = company.capabilities.includes("sponsor") ? "sponsor"
      : company.capabilities.includes("exhibitor") ? "exhibitor"
      : "attendee";

    // Upsert participant (admin may already have one if they registered separately)
    const { data: existing } = await admin
      .from("participants")
      .select("id")
      .eq("event_id", company.event_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await admin.from("participants").update({
        company_id: company.id,
        company_role: companyRole,
        intents: cleanIntents,
        intent: cleanIntents[0] || "networking",
        looking_for: personal_profile.looking_for || null,
        offering: personal_profile.offering || null,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await admin.from("participants").insert({
        event_id: company.event_id,
        user_id: user.id,
        role: participantRole,
        status: "approved",
        company_id: company.id,
        company_role: companyRole,
        intent: cleanIntents[0] || "networking",
        intents: cleanIntents,
        looking_for: personal_profile.looking_for || null,
        offering: personal_profile.offering || null,
      });
    }

    // Also update the profile table with their title
    await admin.from("profiles").upsert({
      id: user.id,
      title: personal_profile.title,
      company_name: company.name,
      onboarding_completed: true,
    }, { onConflict: "id" });
  }

  return NextResponse.json({ success: true });
}
