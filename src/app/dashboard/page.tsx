import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("id", user.id)
    .single();

  if (profile?.platform_role === "organizer") {
    // Check if they have a workspace
    const { data: memberships } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1);

    if (memberships && memberships.length > 0) {
      redirect(`/dashboard/w/${memberships[0].organization_id}`);
    } else {
      redirect("/dashboard/w/new");
    }
  }

  // Participant dashboard
  redirect("/dashboard/home");
}
