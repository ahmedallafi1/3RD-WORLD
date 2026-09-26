ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS totp_secret text,
  ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

CREATE TABLE IF NOT EXISTS auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('ADMIN','CUSTOMER')),
  fingerprint text NOT NULL,
  email_hash text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_rate
  ON auth_attempts(scope,fingerprint,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_email
  ON auth_attempts(scope,email_hash,created_at DESC);

CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor_type text,
  actor_id text,
  fingerprint text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type_created
  ON security_events(event_type,created_at DESC);

ALTER TABLE admin_sessions
  ADD COLUMN IF NOT EXISTS ip_hash text,
  ADD COLUMN IF NOT EXISTS user_agent_hash text;

ALTER TABLE customer_sessions
  ADD COLUMN IF NOT EXISTS ip_hash text,
  ADD COLUMN IF NOT EXISTS user_agent_hash text;
