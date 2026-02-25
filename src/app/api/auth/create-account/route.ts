import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/auth/create-account
 * Server-side account creation with auto-confirm (no email verification).
 * Used by partner invite and other flows that need consistent behavior
 * with the main registration flow.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password, fullName } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: newUser, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || "" },
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

  // Set up profile
  if (fullName) {
    await admin.from("profiles").update({
      full_name: fullName.trim(),
      platform_role: "participant",
      onboarding_completed: true,
    }).eq("id", newUser.user.id);
  }

  return NextResponse.json({
    success: true,
    userId: newUser.user.id,
  });
}
