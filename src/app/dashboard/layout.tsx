import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed) {
    // Check if user has any company memberships — if so, they came through
    // sponsor/exhibitor onboarding and should skip platform onboarding for now
    const { data: companyMemberships } = await supabase
      .from("company_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("invite_status", "accepted")
      .limit(1);

    const hasCompanyAccess = companyMemberships && companyMemberships.length > 0;
    if (!hasCompanyAccess) redirect("/onboarding");
  }

  // Get workspaces for organizers
  let workspaces: { id: string; name: string }[] = [];
  if (profile.platform_role === "organizer") {
    const { data: memberships } = await supabase
      .from("organization_members")
      .select("organization_id, organizations!inner(id, name)")
      .eq("user_id", user.id);

    workspaces = (memberships || []).map((m: any) => ({
      id: m.organizations.id,
      name: m.organizations.name,
    }));
  }

  return (
    <DashboardShell profile={profile} workspaces={workspaces}>
      {children}
    </DashboardShell>
  );
}
