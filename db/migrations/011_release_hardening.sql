CREATE INDEX IF NOT EXISTS idx_access_events_denied_recent
  ON access_events(event_type,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_events_fingerprint
  ON access_events((payload->>'fingerprint'))
  WHERE event_type='ACCESS_DENIED';
