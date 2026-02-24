import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanyDashboardShell } from "@/components/layout/company-dashboard-shell";

export default async function CompanyDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  // Verify user is a member of this company
  const { data: membership } = await supabase
    .from("company_members")
    .select("id, role, company_id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("invite_status", "accepted")
    .single();

  if (!membership) redirect("/dashboard/home");

  // Get company + event info
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, event_id")
    .eq("id", companyId)
    .single();

  if (!company) redirect("/dashboard/home");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  return (
    <CompanyDashboardShell
      profile={profile}
      eventId={company.event_id}
      companyId={companyId}
    >
      {children}
    </CompanyDashboardShell>
  );
}
