ALTER TABLE inventory_reservations
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order
  ON inventory_reservations(order_id, status);

CREATE TABLE IF NOT EXISTS markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  currency char(3) NOT NULL,
  countries text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  free_shipping_threshold_amount bigint,
  standard_shipping_amount bigint NOT NULL DEFAULT 0,
  duties_mode text NOT NULL DEFAULT 'UNPAID'
    CHECK (duties_mode IN ('PAID','UNPAID','CALCULATED_AT_CHECKOUT')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_payment_id text,
  status text NOT NULL DEFAULT 'CREATED'
    CHECK (status IN (
      'CREATED','REQUIRES_ACTION','PROCESSING','SUCCEEDED','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED'
    )),
  amount bigint NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL,
  payment_method_type text,
  client_reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_order
  ON payment_attempts(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  payment_attempt_id uuid REFERENCES payment_attempts(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS checkout_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid REFERENCES carts(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  market_code text,
  currency char(3) NOT NULL,
  subtotal_amount bigint NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  discount_amount bigint NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  shipping_amount bigint NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  tax_amount bigint NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  duty_amount bigint NOT NULL DEFAULT 0 CHECK (duty_amount >= 0),
  total_amount bigint NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  tax_status text NOT NULL DEFAULT 'ESTIMATED'
    CHECK (tax_status IN ('ESTIMATED','FINAL','NOT_CONFIGURED')),
  duty_status text NOT NULL DEFAULT 'ESTIMATED'
    CHECK (duty_status IN ('ESTIMATED','FINAL','NOT_CONFIGURED')),
  shipping_service text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO markets
  (code,name,currency,countries,free_shipping_threshold_amount,standard_shipping_amount,duties_mode)
VALUES
  ('US','United States','USD',ARRAY['US'],15000,1200,'UNPAID'),
  ('CA','Canada','CAD',ARRAY['CA'],20000,1800,'CALCULATED_AT_CHECKOUT'),
  ('UK','United Kingdom','GBP',ARRAY['GB'],15000,1500,'CALCULATED_AT_CHECKOUT'),
  ('EU','European Union','EUR',ARRAY['AT','BE','DE','ES','FI','FR','IE','IT','NL','PT'],15000,1600,'CALCULATED_AT_CHECKOUT'),
  ('AE','United Arab Emirates','AED',ARRAY['AE'],55000,6000,'CALCULATED_AT_CHECKOUT'),
  ('AU','Australia','AUD',ARRAY['AU'],22000,2200,'CALCULATED_AT_CHECKOUT')
ON CONFLICT (code) DO NOTHING;
