import type { SupabaseClient } from "@supabase/supabase-js";

export interface CreateNotificationInput {
  userId: string;
  eventId?: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

/**
 * Insert a single notification row.
 * Silently ignores errors so callers don't need to handle them.
 */
export async function createNotification(
  supabase: SupabaseClient,
  input: CreateNotificationInput
) {
  await supabase.from("notifications").insert({
    user_id: input.userId,
    event_id: input.eventId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
  });
}

/**
 * Insert multiple notifications in a single batch.
 */
export async function createNotifications(
  supabase: SupabaseClient,
  inputs: CreateNotificationInput[]
) {
  if (!inputs.length) return;
  await supabase.from("notifications").insert(
    inputs.map((i) => ({
      user_id: i.userId,
      event_id: i.eventId ?? null,
      type: i.type,
      title: i.title,
      body: i.body ?? null,
      link: i.link ?? null,
    }))
  );
}
