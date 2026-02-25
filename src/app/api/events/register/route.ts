import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    eventId,
    participantTypeId,
    mode, // "signup", "signin", or "authenticated"
    email,
    password,
    fullName,
    title,
    companyName,
  } = body;

  if (!eventId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (mode !== "authenticated" && (!email || !password)) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Verify the event exists and is open for registration
  const { data: event } = await admin
    .from("events")
    .select("id, requires_approval, registration_open, status")
    .eq("id", eventId)
    .in("status", ["published", "active"])
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.registration_open === false) {
    return NextResponse.json(
      { error: "Registration is closed for this event" },
      { status: 400 }
    );
  }

  let userId: string;

  if (mode === "signup") {
    if (!fullName?.trim()) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 }
      );
    }

    // Create user with admin client (auto-confirms, no email verification)
    const { data: newUser, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (createError) {
      if (createError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Try signing in instead." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    userId = newUser.user.id;

    // Set up their profile
    await admin.from("profiles").update({
      full_name: fullName.trim(),
      title: title?.trim() || null,
      company_name: companyName?.trim() || null,
      platform_role: "participant",
      onboarding_completed: true,
    }).eq("id", userId);

  } else if (mode === "authenticated") {
    // Already logged in — get user from session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated. Please sign in." },
        { status: 401 }
      );
    }
    userId = user.id;
  } else {
    // Sign in mode
    const supabase = await createClient();
    const { data: session, error: sessionError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (sessionError) {
      return NextResponse.json(
        { error: sessionError.message },
        { status: 401 }
      );
    }

    userId = session.user.id;
  }

  // Check if already registered
  const { data: existing } = await admin
    .from("participants")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "You are already registered for this event", alreadyRegistered: true },
      { status: 409 }
    );
  }

  // Check if per-type approval is required
  let needsApproval = event.requires_approval;
  if (participantTypeId) {
    const { data: pType } = await admin
      .from("event_participant_types")
      .select("permissions")
      .eq("id", participantTypeId)
      .single();
    if (pType?.permissions?.requires_approval) {
      needsApproval = true;
    }
  }

  // Register as participant
  const { error: insertError } = await admin.from("participants").insert({
    event_id: eventId,
    user_id: userId,
    status: needsApproval ? "pending" : "approved",
    role: "attendee",
    participant_type_id: participantTypeId || null,
  });

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  // For signup mode, sign the user in so they get a session
  if (mode === "signup") {
    const supabase = await createClient();
    await supabase.auth.signInWithPassword({ email, password });
  }

  // Check if profile needs completion (signin users may have sparse profiles)
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, title, company_name, industry")
    .eq("id", userId)
    .single();

  const needsProfile =
    !profile?.full_name || !profile?.title || !profile?.company_name;

  return NextResponse.json({
    success: true,
    requiresApproval: needsApproval,
    needsProfile,
    userId,
  });
}
