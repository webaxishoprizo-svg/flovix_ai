
-- =====================================================================
-- Flovix schema (Shopify-embedded app; identity = shop_domain via JWT)
-- All tables locked; server-only access via verified Shopify session.
-- =====================================================================

-- Helper: updated_at trigger fn (idempotent)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================
-- 1. stores
-- =========================
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain TEXT NOT NULL UNIQUE,
  access_token_encrypted TEXT,
  scopes TEXT,
  shop_name TEXT,
  shop_email TEXT,
  country_code TEXT,
  currency TEXT,
  plan_name TEXT NOT NULL DEFAULT 'free',
  plan_status TEXT NOT NULL DEFAULT 'active',
  draft_theme_id BIGINT,
  live_theme_id BIGINT,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uninstalled_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_public_access_stores" ON public.stores FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_stores_updated BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_stores_shop_domain ON public.stores(shop_domain);

-- =========================
-- 2. shopify_sessions (Shopify SDK session storage)
-- =========================
CREATE TABLE public.shopify_sessions (
  id TEXT PRIMARY KEY,
  shop_domain TEXT NOT NULL,
  state TEXT,
  is_online BOOLEAN NOT NULL DEFAULT false,
  scope TEXT,
  expires TIMESTAMPTZ,
  access_token TEXT,
  online_access_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.shopify_sessions TO service_role;
ALTER TABLE public.shopify_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_public_access_sessions" ON public.shopify_sessions FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.shopify_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_sessions_shop ON public.shopify_sessions(shop_domain);

-- =========================
-- 3. themes (draft copies we manage)
-- =========================
CREATE TABLE public.themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  shopify_theme_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'unpublished', -- 'unpublished' | 'main' | 'demo'
  source_theme_id BIGINT, -- shopify theme id we duplicated from
  is_flovix_draft BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, shopify_theme_id)
);
GRANT ALL ON public.themes TO service_role;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_public_access_themes" ON public.themes FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_themes_updated BEFORE UPDATE ON public.themes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_themes_store ON public.themes(store_id);

-- =========================
-- 4. theme_files (cache of file tree contents for fast editor loads)
-- =========================
CREATE TABLE public.theme_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  path TEXT NOT NULL, -- e.g. 'sections/header.liquid'
  content TEXT,
  content_hash TEXT,
  size_bytes INTEGER,
  content_type TEXT,
  is_binary BOOLEAN NOT NULL DEFAULT false,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(theme_id, path)
);
GRANT ALL ON public.theme_files TO service_role;
ALTER TABLE public.theme_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_public_access_theme_files" ON public.theme_files FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_theme_files_updated BEFORE UPDATE ON public.theme_files
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_theme_files_theme ON public.theme_files(theme_id);
CREATE INDEX idx_theme_files_path ON public.theme_files(theme_id, path);

-- =========================
-- 5. file_versions (every write; before/after for undo & history)
-- =========================
CREATE TABLE public.file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  before_content TEXT,
  after_content TEXT,
  diff TEXT,
  author TEXT NOT NULL DEFAULT 'user', -- 'user' | 'agent'
  chat_message_id UUID, -- link to the message that produced this write
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.file_versions TO service_role;
ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_public_access_file_versions" ON public.file_versions FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE INDEX idx_file_versions_theme_path ON public.file_versions(theme_id, path, created_at DESC);

-- =========================
-- 6. chats + chat_messages
-- =========================
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled chat',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.chats TO service_role;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_public_access_chats" ON public.chats FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_chats_updated BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_chats_store ON public.chats(store_id, updated_at DESC);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'system' | 'tool'
  parts JSONB NOT NULL, -- AI SDK UIMessage parts
  model TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_public_access_chat_messages" ON public.chat_messages FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE INDEX idx_chat_messages_chat ON public.chat_messages(chat_id, created_at);

-- =========================
-- 7. audits + audit_issues + issue_templates
-- =========================
CREATE TABLE public.issue_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- e.g. 'seo.h1.duplicate'
  category TEXT NOT NULL, -- 'seo' | 'speed' | 'ux' | 'conversion' | 'accessibility' | 'trust' | 'mobile'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'critical'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  detection_hint TEXT, -- how to detect (regex, xpath, LH audit id, etc)
  fix_prompt TEXT, -- prompt template for the coding agent
  impact_score INTEGER NOT NULL DEFAULT 50, -- 0-100
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.issue_templates TO service_role;
ALTER TABLE public.issue_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_public_access_issue_templates" ON public.issue_templates FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_issue_templates_updated BEFORE UPDATE ON public.issue_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_issue_templates_category ON public.issue_templates(category, enabled);

CREATE TABLE public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued' | 'running' | 'done' | 'failed'
  score INTEGER, -- 0-100 overall
  score_speed INTEGER,
  score_seo INTEGER,
  score_conversion INTEGER,
  score_ux INTEGER,
  summary TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'scheduled' | 'webhook'
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.audits TO service_role;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_public_access_audits" ON public.audits FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_audits_updated BEFORE UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_audits_store ON public.audits(store_id, created_at DESC);

CREATE TABLE public.audit_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  template_code TEXT, -- references issue_templates.code
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT, -- URL, file path, section id
  evidence JSONB,
  fix_prompt TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'dismissed' | 'fixed'
  fixed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.audit_issues TO service_role;
ALTER TABLE public.audit_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_public_access_audit_issues" ON public.audit_issues FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_audit_issues_updated BEFORE UPDATE ON public.audit_issues
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_audit_issues_audit ON public.audit_issues(audit_id, severity);
CREATE INDEX idx_audit_issues_store_status ON public.audit_issues(store_id, status);

-- =========================
-- 8. billing_charges (Shopify recurring app subscription)
-- =========================
CREATE TABLE public.billing_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  shopify_charge_id TEXT UNIQUE,
  plan_name TEXT NOT NULL,
  price_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'active' | 'cancelled' | 'expired' | 'declined'
  test BOOLEAN NOT NULL DEFAULT false,
  trial_days INTEGER NOT NULL DEFAULT 0,
  activated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.billing_charges TO service_role;
ALTER TABLE public.billing_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_public_access_billing_charges" ON public.billing_charges FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_billing_charges_updated BEFORE UPDATE ON public.billing_charges
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_billing_charges_store ON public.billing_charges(store_id, status);

-- =========================
-- 9. webhooks_log (debug + audit trail)
-- =========================
CREATE TABLE public.webhooks_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  shop_domain TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.webhooks_log TO service_role;
ALTER TABLE public.webhooks_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_public_access_webhooks_log" ON public.webhooks_log FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE INDEX idx_webhooks_log_topic ON public.webhooks_log(topic, received_at DESC);
CREATE INDEX idx_webhooks_log_shop ON public.webhooks_log(shop_domain, received_at DESC);

-- =========================
-- 10. usage_events (for plan enforcement / analytics)
-- =========================
CREATE TABLE public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'audit_run' | 'ai_message' | 'file_write' | 'file_publish'
  quantity INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_public_access_usage_events" ON public.usage_events FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE INDEX idx_usage_events_store ON public.usage_events(store_id, event_type, created_at DESC);
