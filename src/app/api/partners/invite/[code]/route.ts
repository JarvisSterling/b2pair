import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ code: string }> };

/**
 * GET /api/partners/invite/[code]
 * Validate member invite, return company + event info
 */
export async function GET(request: Request, { params }: Params) {
  const { code } = await params;
  const admin = createAdminClient();

  const { data: member, error } = await admin
    .from("company_members")
    .select(`
      id, email, name, role, invite_status,
      company:companies(
        id, name, slug, logo_url, capabilities, status, event_id, website, company_size,
        event:events(id, name, slug, logo_url, banner_url)
      )
    `)
    .eq("invite_code", code)
    .single();

  if (error || !member) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  const company = Array.isArray(member.company) ? member.company[0] : member.company;
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  if (member.invite_status === "expired") {
    return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
  }

  if (member.invite_status === "accepted") {
    return NextResponse.json({ error: "This invite has already been used", alreadyAccepted: true }, { status: 409 });
  }

  const event = Array.isArray(company.event) ? company.event[0] : company.event;

  return NextResponse.json({
    member: { id: member.id, email: member.email, name: member.name, role: member.role },
    company: { id: company.id, name: company.name, slug: company.slug, logo_url: company.logo_url, capabilities: company.capabilities, website: company.website || null, company_size: company.company_size || null },
    event: event ? { id: event.id, name: event.name, slug: event.slug, logo_url: event.logo_url } : null,
  });
}

/**
 * POST /api/partners/invite/[code]
 * Accept invite: link user to company member, create participant record
 * Body: { full_name, bio, title, interests, avatar_url }
 */
export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first" }, { status: 401 });

  const admin = createAdminClient();

  // Find member
  const { data: member } = await admin
    .from("company_members")
    .select(`
      id, invite_status, role, company_id,
      company:companies(id, name, event_id, capabilities)
    `)
    .eq("invite_code", code)
    .single();

  if (!member) return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  if (member.invite_status !== "pending") {
    return NextResponse.json({ error: "Invite already used or expired" }, { status: 400 });
  }

  const company = Array.isArray(member.company) ? member.company[0] : member.company;
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const body = await request.json();
  const { full_name, bio, title, interests, avatar_url, intents, looking_for, offering, expertise_areas, user_interests } = body;

  // Update user profile metadata
  if (full_name) {
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        full_name,
        avatar_url: avatar_url || user.user_metadata?.avatar_url,
      },
    });
  }

  // Update profile in profiles table
  await admin
    .from("profiles")
    .upsert({
      id: user.id,
      full_name: full_name || user.user_metadata?.full_name,
      avatar_url: avatar_url || user.user_metadata?.avatar_url,
      bio: bio || null,
      title: title || null,
      company_name: company.name || null,
      expertise_areas: expertise_areas || [],
      interests: user_interests || [],
      onboarding_completed: true,
    }, { onConflict: "id" });

  // Determine company_role based on capabilities
  let companyRole = "sponsor_rep";
  if (company.capabilities.includes("exhibitor") && !company.capabilities.includes("sponsor")) {
    companyRole = "exhibitor_staff";
  }
  if (member.role === "speaker") {
    companyRole = "speaker";
  }

  // Check if participant already exists for this user+event
  const { data: existingParticipant } = await admin
    .from("participants")
    .select("id")
    .eq("event_id", company.event_id)
    .eq("user_id", user.id)
    .maybeSingle();

  let participantId: string;

  if (existingParticipant) {
    // Update existing participant with company info AND profile data from the form
    const validIntents = ["buying", "selling", "investing", "partnering", "learning", "networking"];
    const cleanIntents = (intents || []).filter((i: string) => validIntents.includes(i));

    const participantUpdate: Record<string, any> = {
      company_id: company.id,
      company_role: companyRole,
      updated_at: new Date().toISOString(),
    };

    if (cleanIntents.length > 0) {
      participantUpdate.intents = cleanIntents;
      participantUpdate.intent = cleanIntents[0];
    }
    if (looking_for) participantUpdate.looking_for = looking_for;
    if (offering) participantUpdate.offering = offering;

    await admin
      .from("participants")
      .update(participantUpdate)
      .eq("id", existingParticipant.id);
    participantId = existingParticipant.id;
  } else {
    // Validate intents
    const validIntents = ["buying", "selling", "investing", "partnering", "learning", "networking"];
    const cleanIntents = (intents || []).filter((i: string) => validIntents.includes(i));

    // Create new participant
    const { data: newParticipant, error: pError } = await admin
      .from("participants")
      .insert({
        event_id: company.event_id,
        user_id: user.id,
        role: company.capabilities.includes("sponsor") ? "sponsor" : company.capabilities.includes("exhibitor") ? "exhibitor" : "attendee",
        status: "approved",
        company_id: company.id,
        company_role: companyRole,
        intent: cleanIntents[0] || "networking",
        intents: cleanIntents.length > 0 ? cleanIntents : ["networking"],
        looking_for: looking_for || null,
        offering: offering || null,
      })
      .select("id")
      .single();

    if (pError) return NextResponse.json({ error: pError.message }, { status: 500 });
    participantId = newParticipant.id;
  }

  // Accept the invite and link participant
  await admin
    .from("company_members")
    .update({
      user_id: user.id,
      participant_id: participantId,
      invite_status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", member.id);

  return NextResponse.json({
    success: true,
    participant_id: participantId,
    event_id: company.event_id,
  });
}
