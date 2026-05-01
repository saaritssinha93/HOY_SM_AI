-- HOY_SM_AI · Migration 0001 · Initial schema
-- Apply via Supabase SQL editor or `supabase db push`.
-- Idempotent: safe to re-run (uses IF NOT EXISTS).

-- ============================================================================
-- Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ============================================================================
-- Helper: updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. employees — agent registry
-- ============================================================================

CREATE TABLE IF NOT EXISTS employees (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role                TEXT NOT NULL UNIQUE,                       -- 'ceo', 'sales_head', etc.
  prompt_path         TEXT NOT NULL,                              -- '/employees/ceo.md'
  prompt_version      TEXT NOT NULL,                              -- git sha or '0.1'
  model_tier          TEXT NOT NULL CHECK (model_tier IN ('haiku', 'sonnet', 'opus')),
  autonomy_level      SMALLINT NOT NULL DEFAULT 0 CHECK (autonomy_level IN (0, 1, 2)),
  daily_token_budget  INTEGER NOT NULL DEFAULT 100000,
  daily_action_limit  INTEGER NOT NULL DEFAULT 50,
  daily_inr_budget    NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 2. runs — every agent invocation
-- ============================================================================

CREATE TABLE IF NOT EXISTS runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  request_id      TEXT NOT NULL,
  model_used      TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  input           JSONB NOT NULL,
  output          JSONB,
  error           TEXT,
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  cache_tokens    INTEGER NOT NULL DEFAULT 0,
  cost_inr        NUMERIC(10,4) NOT NULL DEFAULT 0,
  duration_ms     INTEGER,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_runs_employee_started ON runs(employee_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_request_id ON runs(request_id);

-- ============================================================================
-- 3. actions — proposed/executed actions w/ state machine
-- ============================================================================

CREATE TABLE IF NOT EXISTS actions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  run_id            UUID REFERENCES runs(id) ON DELETE SET NULL,
  type              TEXT NOT NULL,                                  -- 'send_dm', 'edit_product', 'send_email', etc.
  payload           JSONB NOT NULL,                                 -- the proposed action's content
  state             TEXT NOT NULL DEFAULT 'proposed'
                    CHECK (state IN ('proposed', 'reviewing', 'approved', 'rejected', 'edited', 'executing', 'succeeded', 'failed')),
  idempotency_key   TEXT NOT NULL UNIQUE,
  proposed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at       TIMESTAMPTZ,
  executed_at       TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  result            JSONB,
  error             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actions_state ON actions(state);
CREATE INDEX IF NOT EXISTS idx_actions_employee_state ON actions(employee_id, state);
CREATE INDEX IF NOT EXISTS idx_actions_proposed_at ON actions(proposed_at DESC);

CREATE TRIGGER trg_actions_updated_at BEFORE UPDATE ON actions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 4. approvals — Vanshika's decisions on proposed actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS approvals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id     UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  decided_by    TEXT NOT NULL DEFAULT 'vanshika',
  decision      TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'edited')),
  edits         JSONB,                                              -- diff if edited
  reason        TEXT,
  decided_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms    INTEGER                                             -- proposed_at → decided_at
);

CREATE INDEX IF NOT EXISTS idx_approvals_action ON approvals(action_id);
CREATE INDEX IF NOT EXISTS idx_approvals_decided_at ON approvals(decided_at DESC);

-- ============================================================================
-- 5. audit_log — APPEND-ONLY record of everything that touched the outside world
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  employee_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  action_id     UUID REFERENCES actions(id) ON DELETE SET NULL,
  event         TEXT NOT NULL,                                      -- 'state_change', 'api_call', 'escalation'
  payload       JSONB NOT NULL,
  request_id    TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_ts ON audit_log(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_employee ON audit_log(employee_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action_id);

-- audit_log is APPEND-ONLY: enforce no UPDATE / DELETE via RLS (set up after auth in next migration)

-- ============================================================================
-- 6. leads — the 20-strangers funnel
-- ============================================================================

CREATE TABLE IF NOT EXISTS leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ig_handle             TEXT NOT NULL UNIQUE,
  profile_snapshot      JSONB,                                      -- bio, follower count, location at sourcing time
  source                TEXT,                                       -- 'hashtag_jewelry', 'lookalike', etc.
  status                TEXT NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new', 'contacted', 'replied', 'visited_site', 'converted', 'dead')),
  contact_attempt_at    TIMESTAMPTZ,
  contact_message       TEXT,
  replied_at            TIMESTAMPTZ,
  reply_summary         TEXT,
  visited_site_at       TIMESTAMPTZ,
  converted_at          TIMESTAMPTZ,
  conversion_order_id   TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);

CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 7. customers — Shopify + DM history merged
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_customer_id   TEXT UNIQUE,
  ig_handle             TEXT,
  email_hash            TEXT,                                       -- SHA-256 of lowercase email
  phone_hash            TEXT,                                       -- SHA-256 of normalized phone
  display_name          TEXT,                                       -- first name only OK to store
  ltv_inr               NUMERIC(10,2) NOT NULL DEFAULT 0,
  order_count           INTEGER NOT NULL DEFAULT 0,
  is_repeat             BOOLEAN NOT NULL DEFAULT FALSE,
  first_order_at        TIMESTAMPTZ,
  last_order_at         TIMESTAMPTZ,
  last_dm_at            TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_shopify ON customers(shopify_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_ig ON customers(ig_handle);
CREATE INDEX IF NOT EXISTS idx_customers_last_order ON customers(last_order_at DESC);

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 8. orders — Shopify mirror with enrichment
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id      TEXT NOT NULL UNIQUE,
  customer_id           UUID REFERENCES customers(id) ON DELETE SET NULL,
  total_inr             NUMERIC(10,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'INR',
  items                 JSONB NOT NULL,                             -- line items
  fulfillment_status    TEXT,                                       -- 'unfulfilled', 'fulfilled', 'partial'
  financial_status      TEXT,                                       -- 'paid', 'pending', 'refunded'
  channel               TEXT,                                       -- 'web', 'instagram_dm', 'whatsapp'
  is_stranger           BOOLEAN,                                    -- enriched: not in friends list
  placed_at             TIMESTAMPTZ NOT NULL,
  fulfilled_at          TIMESTAMPTZ,
  enrichment            JSONB,                                      -- LTV at time of order, repeat flag, etc.
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_placed_at ON orders(placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_stranger ON orders(is_stranger, placed_at DESC);

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 9. products — catalog + naming-system status
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_product_id    TEXT UNIQUE,
  sku                   TEXT,
  name                  TEXT NOT NULL,
  handle                TEXT,                                       -- URL slug
  price_inr             NUMERIC(10,2),
  naming_system         TEXT CHECK (naming_system IN ('hindi_urdu', 'english_legacy')),
  needs_rename          BOOLEAN NOT NULL DEFAULT FALSE,
  has_worn_shot         BOOLEAN NOT NULL DEFAULT FALSE,
  has_heic_image        BOOLEAN NOT NULL DEFAULT FALSE,             -- flag for re-upload
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_needs_rename ON products(needs_rename) WHERE needs_rename = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_missing_worn ON products(has_worn_shot) WHERE has_worn_shot = FALSE;

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 10. knowledge — FAQ / KB the agents read from
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category            TEXT NOT NULL,                                -- 'sizing', 'returns', 'shipping', 'care'
  question            TEXT NOT NULL,
  answer              TEXT NOT NULL,
  source              TEXT,                                         -- 'shopify_policy', 'vanshika_note', etc.
  last_verified_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge(category);

CREATE TRIGGER trg_knowledge_updated_at BEFORE UPDATE ON knowledge
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 11. costs — per-agent daily token / INR spend
-- ============================================================================

CREATE TABLE IF NOT EXISTS costs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date          DATE NOT NULL,
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tokens_in     INTEGER NOT NULL DEFAULT 0,
  tokens_out    INTEGER NOT NULL DEFAULT 0,
  cache_tokens  INTEGER NOT NULL DEFAULT 0,
  cost_inr      NUMERIC(10,4) NOT NULL DEFAULT 0,
  action_count  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (date, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_costs_date ON costs(date DESC);

CREATE TRIGGER trg_costs_updated_at BEFORE UPDATE ON costs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 12. settings — global system flags (singleton-ish, key/value)
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings (
  key           TEXT PRIMARY KEY,
  value         JSONB NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed default settings
INSERT INTO settings (key, value) VALUES
  ('pause_all',             'false'::jsonb),
  ('daily_inr_budget_total','200'::jsonb),
  ('approval_batch_min',    '5'::jsonb),
  ('approval_batch_max_age_min', '120'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Seed: register the 9 employees from the org chart
-- ============================================================================

INSERT INTO employees (role, prompt_path, prompt_version, model_tier, autonomy_level, daily_token_budget, daily_action_limit, daily_inr_budget, active, notes) VALUES
  ('ceo',              '/employees/ceo.md',              '0.1', 'sonnet', 0, 80000, 30, 30.00, TRUE,  'Opus on Mondays only'),
  ('marketing_head',   '/employees/marketing_head.md',   '0.0', 'sonnet', 0, 60000, 40, 25.00, FALSE, 'Phase 1 — not yet built'),
  ('sales_head',       '/employees/sales_head.md',       '0.0', 'sonnet', 0, 80000, 30, 30.00, FALSE, 'Phase 1 — built next'),
  ('operations_head',  '/employees/operations_head.md',  '0.0', 'sonnet', 1, 60000, 80, 20.00, FALSE, 'Phase 2'),
  ('research_analyst', '/employees/research_analyst.md', '0.0', 'sonnet', 2, 50000, 10, 15.00, FALSE, 'Phase 3'),
  ('finance',          '/employees/finance.md',          '0.0', 'haiku',  2, 40000, 20, 5.00,  FALSE, 'Phase 3'),
  ('web_developer',    '/employees/web_developer.md',    '0.0', 'sonnet', 1, 60000, 30, 20.00, FALSE, 'Phase 2'),
  ('exec_assistant',   '/employees/exec_assistant.md',   '0.0', 'haiku',  2, 40000, 100, 10.00, FALSE, 'Phase 1'),
  ('hr',               '/employees/hr.md',               '0.0', 'haiku',  0, 10000, 5,  2.00,  FALSE, 'DORMANT — activate when team ≥4')
ON CONFLICT (role) DO NOTHING;
