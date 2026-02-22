import { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PAGES } from "@/types/event-pages";

/**
 * Seed default pages for a new event.
 * Called after event creation. Uses admin client to bypass RLS.
 */
export async function seedDefaultPages(
  adminClient: SupabaseClient,
  eventId: string
) {
  // Check if pages already exist
  const { count } = await adminClient
    .from("event_pages")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (count && count > 0) return; // Already seeded

  const pages = DEFAULT_PAGES.map((page) => ({
    ...page,
    event_id: eventId,
  }));

  const { error } = await adminClient.from("event_pages").insert(pages);
  if (error) {
    console.error("Failed to seed default pages:", error);
  }

  // Also create default theme
  const { error: themeError } = await adminClient
    .from("event_themes")
    .upsert({
      event_id: eventId,
      theme_key: "light-classic",
    });
  if (themeError) {
    console.error("Failed to create default theme:", themeError);
  }
}
