import { NextResponse } from "next/server";

/**
 * One-time migration: add partner_settings column to events table.
 * DELETE this file after running once.
 */
export async function POST() {
  const projectRef = "eemeremqmqsqsxioycka"; // B2Pair project
  const mgmtToken = "sbp_2e7b5f223a191632000fd43c7d2ce6112ed0e17d";

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mgmtToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "ALTER TABLE events ADD COLUMN IF NOT EXISTS partner_settings JSONB NOT NULL DEFAULT '{}';",
      }),
    }
  );

  const data = await res.json().catch(() => null);
  return NextResponse.json({ ok: res.ok, status: res.status, data });
}
