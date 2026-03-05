/**
 * TEMPORARY migration endpoint — delete after use.
 * Runs pending DB migrations that can't be executed via the Supabase management API.
 */
import { NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MIGRATIONS = [
  {
    name: "add matching_rules extra columns",
    sql: `
      ALTER TABLE public.matching_rules
        ADD COLUMN IF NOT EXISTS company_size_weight NUMERIC(3,2) DEFAULT 0.10,
        ADD COLUMN IF NOT EXISTS embedding_weight NUMERIC(3,2) DEFAULT 0.20,
        ADD COLUMN IF NOT EXISTS intent_confidence_threshold INTEGER DEFAULT 40,
        ADD COLUMN IF NOT EXISTS use_behavioral_intent BOOLEAN DEFAULT true;
    `,
  },
  {
    name: "enable pgvector",
    sql: `CREATE EXTENSION IF NOT EXISTS vector;`,
  },
  {
    name: "check profile_embeddings embedding column type",
    sql: `
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profile_embeddings';
    `,
  },
  {
    name: "add vector column to profile_embeddings if missing",
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'profile_embeddings'
            AND column_name = 'embedding'
        ) THEN
          ALTER TABLE public.profile_embeddings ADD COLUMN embedding vector(1536);
        END IF;
      END $$;
    `,
  },
  {
    name: "create get_embedding_similarities function",
    sql: `
      CREATE OR REPLACE FUNCTION public.get_embedding_similarities(p_event_id uuid)
      RETURNS TABLE(participant_a uuid, participant_b uuid, similarity float)
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = public
      AS $func$
        SELECT
          LEAST(pe1.participant_id, pe2.participant_id) AS participant_a,
          GREATEST(pe1.participant_id, pe2.participant_id) AS participant_b,
          (1 - (pe1.embedding <=> pe2.embedding))::float AS similarity
        FROM profile_embeddings pe1
        JOIN profile_embeddings pe2 ON pe1.participant_id < pe2.participant_id
        JOIN participants p1 ON p1.id = pe1.participant_id
        JOIN participants p2 ON p2.id = pe2.participant_id
        WHERE p1.event_id = p_event_id
          AND p2.event_id = p_event_id
          AND pe1.embedding IS NOT NULL
          AND pe2.embedding IS NOT NULL
      $func$;
      GRANT EXECUTE ON FUNCTION public.get_embedding_similarities(uuid) TO service_role, authenticated;
    `,
  },
];

export async function POST(request: Request) {
  const { secret } = await request.json();

  // Simple guard — not meant to be a production endpoint
  if (secret !== "run-migrations-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Session pooler — supports DDL, free tier accessible
  const dbUrl = `postgresql://postgres.eemeremqmqsqsxioycka:${encodeURIComponent("B2PairDB2026!Secure")}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`;

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
    statement_timeout: 30000,
  });

  const results: { name: string; status: string; rows?: any[]; error?: string }[] = [];

  try {
    await client.connect();

    for (const m of MIGRATIONS) {
      try {
        const res = await client.query(m.sql);
        results.push({
          name: m.name,
          status: "ok",
          rows: res.rows?.length > 0 ? res.rows : undefined,
        });
      } catch (err: any) {
        results.push({ name: m.name, status: "error", error: err.message });
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Connection failed: ${err.message}`, results }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }

  return NextResponse.json({ success: true, results });
}
