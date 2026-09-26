ALTER TABLE order_lines
  ADD COLUMN IF NOT EXISTS drop_id uuid REFERENCES drops(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_lines_drop_variant
  ON order_lines(drop_id,variant_id);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'EMAIL'
    CHECK (channel IN ('EMAIL')),
  notification_type text NOT NULL
    CHECK (notification_type IN ('DROP_EARLY','DROP_LIVE','RESTOCK')),
  recipient text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  dedupe_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','SENDING','SENT','FAILED','CANCELLED')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  provider text,
  provider_ref text,
  last_error text,
  available_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending
  ON notification_outbox(status,available_at,created_at);

CREATE TABLE IF NOT EXISTS lifecycle_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL DEFAULT 'WORLD_ENGINE',
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
