ALTER TABLE worlds
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS public_archive boolean NOT NULL DEFAULT true;

ALTER TABLE drops
  ADD COLUMN IF NOT EXISTS early_access_at timestamptz,
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS subheadline text,
  ADD COLUMN IF NOT EXISTS per_variant_limit integer NOT NULL DEFAULT 2
    CHECK (per_variant_limit > 0),
  ADD COLUMN IF NOT EXISTS waitlist_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS archive_on_close boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS drop_products (
  drop_id uuid NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  max_per_customer integer CHECK (max_per_customer IS NULL OR max_per_customer > 0),
  PRIMARY KEY (drop_id, product_id)
);

CREATE TABLE IF NOT EXISTS passport_profiles (
  customer_id uuid PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'MEMBER'
    CHECK (tier IN ('MEMBER','EARLY','VIP')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS passport_world_stamps (
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  world_id uuid NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'ORDER',
  stamped_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, world_id)
);

CREATE TABLE IF NOT EXISTS saved_products (
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, product_id)
);

CREATE TABLE IF NOT EXISTS drop_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id uuid NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  label text,
  code_hash text NOT NULL,
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (drop_id, code_hash)
);

CREATE TABLE IF NOT EXISTS drop_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id uuid NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  email text,
  grant_type text NOT NULL
    CHECK (grant_type IN ('EARLY','VIP','PRIVATE')),
  starts_at timestamptz,
  ends_at timestamptz,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (customer_id IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_drop_access_grants_customer
  ON drop_access_grants(drop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_drop_access_grants_email
  ON drop_access_grants(drop_id, lower(email));

CREATE TABLE IF NOT EXISTS drop_access_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id uuid NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  email text,
  access_level text NOT NULL
    CHECK (access_level IN ('EMAIL','CODE','EARLY','VIP','PRIVATE')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drop_access_sessions_drop_expiry
  ON drop_access_sessions(drop_id, expires_at);

CREATE TABLE IF NOT EXISTS access_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id uuid REFERENCES drops(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  email text NOT NULL,
  signup_type text NOT NULL
    CHECK (signup_type IN ('WORLD','WAITLIST','RESTOCK')),
  status text NOT NULL DEFAULT 'SUBSCRIBED'
    CHECK (status IN ('SUBSCRIBED','UNSUBSCRIBED','NOTIFIED')),
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_access_signups_unique
  ON access_signups (
    lower(email),
    signup_type,
    COALESCE(drop_id::text,''),
    COALESCE(product_id::text,'')
  );

CREATE TABLE IF NOT EXISTS world_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('FILM','EDITORIAL','LOOKBOOK','STORY','SOUND')),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  eyebrow text,
  body text,
  media_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_products (
  campaign_id uuid NOT NULL REFERENCES world_campaigns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (campaign_id, product_id)
);

CREATE TABLE IF NOT EXISTS access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id uuid REFERENCES drops(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  email text,
  event_type text NOT NULL,
  access_level text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

UPDATE worlds SET year=2026 WHERE year IS NULL;
