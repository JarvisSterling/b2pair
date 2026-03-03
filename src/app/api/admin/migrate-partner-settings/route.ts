import { NextResponse } from "next/server";

/**
 * One-time migration: add partner_settings column to events table.
 * DELETE this file after running once.
 */
export async function POST() {
  const projectRef = "akbrlbortxvoluuzxhby";
  const mgmtToken = "sbp_da5d8e0f7c4c74211675ef6aeaeddb78258b5e64";

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
