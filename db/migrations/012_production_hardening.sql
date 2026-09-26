ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS checkout_token_hash text;

CREATE INDEX IF NOT EXISTS idx_orders_checkout_token
  ON orders(id,checkout_token_hash);

CREATE TABLE IF NOT EXISTS security_rate_limits (
  key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 0 CHECK (hits >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_rate_limits_updated
  ON security_rate_limits(updated_at);

CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  key_hash text,
  actor_type text,
  actor_id text,
  route text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type_created
  ON security_events(event_type,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_key_created
  ON security_events(key_hash,created_at DESC);
