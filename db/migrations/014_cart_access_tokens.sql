ALTER TABLE carts
  ADD COLUMN IF NOT EXISTS access_token_hash text;

CREATE INDEX IF NOT EXISTS idx_carts_access_token
  ON carts(id,access_token_hash);
