INSERT INTO locations (code,name)
VALUES ('nyc-main','NYC Main')
ON CONFLICT (code) DO NOTHING;

INSERT INTO worlds (code,title,slug,status)
VALUES
  ('WORLD 001','WORLD 001','001','LIVE'),
  ('WORLD 002','WORLD 002','002','SCHEDULED')
ON CONFLICT (code) DO NOTHING;
