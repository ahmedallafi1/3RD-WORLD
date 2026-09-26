CREATE TABLE IF NOT EXISTS content_pages (
  slug text PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PUBLISHED')),
  updated_by text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO content_pages(slug,title,status)
VALUES
  ('shipping','Shipping','DRAFT'),
  ('returns','Returns','DRAFT'),
  ('privacy','Privacy','DRAFT'),
  ('terms','Terms','DRAFT'),
  ('accessibility','Accessibility','DRAFT'),
  ('contact','Contact','DRAFT'),
  ('faq','FAQ','DRAFT'),
  ('size-guide','Size Guide','DRAFT')
ON CONFLICT(slug) DO NOTHING;
