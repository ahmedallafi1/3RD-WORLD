CREATE INDEX IF NOT EXISTS idx_drop_products_product
  ON drop_products(product_id,drop_id);

CREATE INDEX IF NOT EXISTS idx_drops_release_window
  ON drops(status,opens_at,closes_at);

CREATE INDEX IF NOT EXISTS idx_access_signups_drop_type
  ON access_signups(drop_id,signup_type,status,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_signups_product_type
  ON access_signups(product_id,signup_type,status,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_drop_access_sessions_token_expiry
  ON drop_access_sessions(token_hash,expires_at);

CREATE INDEX IF NOT EXISTS idx_orders_email_status
  ON orders(lower(email),status,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_lines_drop_customer_limit
  ON order_lines(drop_id,variant_id,order_id);

CREATE INDEX IF NOT EXISTS idx_saved_products_customer_created
  ON saved_products(customer_id,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_world_campaigns_public
  ON world_campaigns(world_id,status,position,published_at);

CREATE INDEX IF NOT EXISTS idx_payment_events_provider_created
  ON payment_events(provider,created_at DESC);
