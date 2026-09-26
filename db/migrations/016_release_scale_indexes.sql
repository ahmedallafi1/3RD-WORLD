CREATE INDEX IF NOT EXISTS idx_drop_products_product_drop
  ON drop_products(product_id,drop_id);

CREATE INDEX IF NOT EXISTS idx_drops_lifecycle
  ON drops(status,opens_at,closes_at);

CREATE INDEX IF NOT EXISTS idx_access_signups_drop_status
  ON access_signups(drop_id,signup_type,status,created_at);

CREATE INDEX IF NOT EXISTS idx_access_signups_product_status
  ON access_signups(product_id,signup_type,status,created_at);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_cart_active
  ON inventory_reservations(cart_id,status,expires_at);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_unowned_expiry
  ON inventory_reservations(expires_at)
  WHERE status='ACTIVE' AND order_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_order_status
  ON payment_attempts(order_id,status,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry
  ON admin_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_expiry
  ON customer_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_drop_access_sessions_expiry
  ON drop_access_sessions(expires_at);
