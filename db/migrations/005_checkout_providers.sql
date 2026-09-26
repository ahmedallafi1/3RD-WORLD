ALTER TABLE checkout_quotes
  ADD COLUMN IF NOT EXISTS tax_provider text,
  ADD COLUMN IF NOT EXISTS tax_provider_ref text,
  ADD COLUMN IF NOT EXISTS shipping_provider text,
  ADD COLUMN IF NOT EXISTS shipping_provider_ref text,
  ADD COLUMN IF NOT EXISTS shipping_rate_id text,
  ADD COLUMN IF NOT EXISTS duty_provider text,
  ADD COLUMN IF NOT EXISTS duty_provider_ref text;

ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS actor_id text,
  ADD COLUMN IF NOT EXISTS reason text;
