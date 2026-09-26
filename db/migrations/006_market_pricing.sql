ALTER TABLE carts
  ADD COLUMN IF NOT EXISTS market_code text;

CREATE TABLE IF NOT EXISTS variant_prices (
  variant_id uuid NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  market_code text NOT NULL REFERENCES markets(code) ON DELETE CASCADE,
  price_amount bigint NOT NULL CHECK (price_amount >= 0),
  currency char(3) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (variant_id, market_code)
);

CREATE INDEX IF NOT EXISTS idx_variant_prices_market
  ON variant_prices(market_code, variant_id);
