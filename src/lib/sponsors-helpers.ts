import { SupabaseClient } from "@supabase/supabase-js";
import { MemberRole, hasPermission } from "@/types/sponsors";

/**
 * Check if user is the organizer (created_by) of an event
 */
export async function isEventOrganizer(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", eventId)
    .single();
  return data?.created_by === userId;
}

/**
 * Get user's company membership and check permission
 */
export async function getCompanyMembership(
  supabase: SupabaseClient,
  companyId: string,
  userId: string
): Promise<{ role: MemberRole; memberId: string } | null> {
  const { data } = await supabase
    .from("company_members")
    .select("id, role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("invite_status", "accepted")
    .single();
  if (!data) return null;
  return { role: data.role as MemberRole, memberId: data.id };
}

/**
 * Check if user can perform action on company
 */
export async function canAccessCompany(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  permission: string
): Promise<boolean> {
  // First check if user is company member with permission
  const membership = await getCompanyMembership(supabase, companyId, userId);
  if (membership && hasPermission(membership.role, permission)) return true;

  // Check if user is event organizer (organizers can do everything)
  const { data: company } = await supabase
    .from("companies")
    .select("event_id")
    .eq("id", companyId)
    .single();
  if (!company) return false;
  return isEventOrganizer(supabase, company.event_id, userId);
}

/**
 * Generate a URL-friendly slug from company name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);
}

/**
 * Ensure slug is unique within event, append number if needed
 */
export async function ensureUniqueSlug(
  supabase: SupabaseClient,
  eventId: string,
  slug: string,
  excludeId?: string
): Promise<string> {
  let candidate = slug;
  let counter = 1;
  while (true) {
    let query = supabase
      .from("companies")
      .select("id")
      .eq("event_id", eventId)
      .eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${slug}-${counter++}`;
  }
}
