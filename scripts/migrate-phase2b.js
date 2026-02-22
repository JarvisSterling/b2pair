const { createClient } = require("@supabase/supabase-js");

const c = createClient(
  "https://eemeremqmqsqsxioycka.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbWVyZW1xbXFzcXN4aW95Y2thIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTcxMDQ0MSwiZXhwIjoyMDg3Mjg2NDQxfQ.lVC91lJiD_rj1xJX7bklskVq_3fcuinyeRq0BRRP2o4"
);

async function migrate() {
  // T13-1: event_pages table
  const { error: e1 } = await c.from("event_pages").select("id").limit(0);
  if (e1 && e1.message.includes("Could not find")) {
    console.log("Creating event_pages table via Supabase Management API...");
  } else if (!e1) {
    console.log("event_pages already exists, skipping.");
  }

  // We need to use the Management API to run raw SQL
  const mgmtToken = "sbp_2e7b5f223a191632000fd43c7d2ce6112ed0e17d";
  const projectRef = "eemeremqmqsqsxioycka";

  const sql = `
-- Event pages (tabs on the public event page)
CREATE TABLE IF NOT EXISTS public.event_pages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  page_type text NOT NULL CHECK (page_type IN ('home', 'info', 'network_guide', 'faq', 'custom')) DEFAULT 'custom',
  is_default boolean DEFAULT false,
  is_visible boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  content jsonb DEFAULT '[]'::jsonb,
  seo_title text,
  seo_description text,
  og_image_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(event_id, slug)
);

-- Event themes
CREATE TABLE IF NOT EXISTS public.event_themes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL UNIQUE,
  theme_key text NOT NULL DEFAULT 'light-classic' CHECK (theme_key IN ('light-classic', 'dark-modern', 'warm-elegant')),
  accent_color text,
  custom_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_pages_event ON public.event_pages(event_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_event_themes_event ON public.event_themes(event_id);

-- Updated_at triggers
DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.event_pages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.event_themes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS
ALTER TABLE public.event_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_themes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Public can view event pages" ON public.event_pages;
DROP POLICY IF EXISTS "Org members can manage event pages" ON public.event_pages;
DROP POLICY IF EXISTS "Public can view event themes" ON public.event_themes;
DROP POLICY IF EXISTS "Org members can manage event themes" ON public.event_themes;

-- Public read for published events
CREATE POLICY "Public can view event pages"
  ON public.event_pages FOR SELECT
  USING (
    event_id IN (SELECT id FROM public.events WHERE status IN ('published', 'active'))
  );

-- Org members can insert/update/delete event pages
CREATE POLICY "Org members can manage event pages"
  ON public.event_pages FOR ALL
  TO authenticated
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
    )
  );

-- Public can view event themes for published events
CREATE POLICY "Public can view event themes"
  ON public.event_themes FOR SELECT
  USING (
    event_id IN (SELECT id FROM public.events WHERE status IN ('published', 'active'))
  );

-- Org members can manage event themes
CREATE POLICY "Org members can manage event themes"
  ON public.event_themes FOR ALL
  TO authenticated
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
    )
  );
`;

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mgmtToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Migration failed:", res.status, text);
    return;
  }

  const result = await res.json();
  console.log("Migration result:", JSON.stringify(result).slice(0, 200));

  // Verify tables exist
  const { error: check1 } = await c.from("event_pages").select("id").limit(0);
  const { error: check2 } = await c.from("event_themes").select("id").limit(0);
  console.log("event_pages exists:", !check1);
  console.log("event_themes exists:", !check2);

  // T13-3: Create storage bucket for event media
  const { data: buckets } = await c.storage.listBuckets();
  const hasEventMedia = buckets?.some((b) => b.name === "event-media");
  if (!hasEventMedia) {
    const { data, error } = await c.storage.createBucket("event-media", {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    });
    console.log("Created event-media bucket:", data, error?.message);
  } else {
    console.log("event-media bucket already exists");
  }
}

migrate().catch(console.error);
