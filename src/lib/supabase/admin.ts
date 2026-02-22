import { createClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client using service role key.
 * Bypasses RLS. Use only in server-side code for trusted operations.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
