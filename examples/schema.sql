-- Reduced sample schema, not an application migration. All test data is synthetic.
CREATE TABLE platform_connections (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  account_id TEXT NOT NULL,
  workspace_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected'
);

CREATE TABLE webhook_inbox (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  event_key TEXT NOT NULL,
  account_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'quarantined', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_token UUID,
  lease_until TIMESTAMPTZ,
  error_code TEXT,
  UNIQUE (provider, event_key)
);

CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL,
  webhook_event_id INTEGER UNIQUE REFERENCES webhook_inbox(id),
  notes TEXT NOT NULL,
  lead_score INTEGER,
  effective_score INTEGER,
  manual_score_override INTEGER,
  ai_score_status TEXT,
  last_scored_hash TEXT
);

CREATE TABLE lead_scores (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id),
  final_score INTEGER NOT NULL CHECK (final_score BETWEEN 0 AND 100),
  ai_score_status TEXT NOT NULL,
  reasoning TEXT NOT NULL
);
