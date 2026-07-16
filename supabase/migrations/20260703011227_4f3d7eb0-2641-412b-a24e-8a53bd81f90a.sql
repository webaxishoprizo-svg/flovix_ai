
-- Extend audit_issues
ALTER TABLE public.audit_issues
  ADD COLUMN IF NOT EXISTS revenue_impact_usd numeric,
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS fixed_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_deep_link text,
  ADD COLUMN IF NOT EXISTS fix_steps jsonb;

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc notifications" ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_notifications_store ON public.notifications(store_id, created_at DESC);

-- Competitors
CREATE TABLE IF NOT EXISTS public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  domain text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, domain)
);
GRANT ALL ON public.competitors TO service_role;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc competitors" ON public.competitors FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.competitor_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  performance integer,
  seo integer,
  accessibility integer,
  best_practices integer,
  lcp text,
  cls text,
  tbt text,
  insight text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.competitor_snapshots TO service_role;
ALTER TABLE public.competitor_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc comp_snaps" ON public.competitor_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_snap_comp ON public.competitor_snapshots(competitor_id, created_at DESC);

-- Visual audits
CREATE TABLE IF NOT EXISTS public.visual_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  device text NOT NULL,
  score integer,
  cta_visible boolean,
  reviews_detected boolean,
  trust_badges boolean,
  urgency_detected boolean,
  font_count integer,
  narrative text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.visual_audits TO service_role;
ALTER TABLE public.visual_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc visual_audits" ON public.visual_audits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_visual_store ON public.visual_audits(store_id, created_at DESC);

-- Metrics daily
CREATE TABLE IF NOT EXISTS public.metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  day date NOT NULL,
  revenue_usd numeric DEFAULT 0,
  orders integer DEFAULT 0,
  sessions integer,
  conversion_rate numeric,
  currency text DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, day)
);
GRANT ALL ON public.metrics_daily TO service_role;
ALTER TABLE public.metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc metrics_daily" ON public.metrics_daily FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  kind text NOT NULL,
  period_start date,
  period_end date,
  summary text,
  body_md text,
  pdf_url text,
  emailed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc reports" ON public.reports FOR ALL TO service_role USING (true) WITH CHECK (true);
