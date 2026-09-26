UPDATE worlds
SET
  title=CASE WHEN title='WORLD 001' THEN 'NO BORDERS' ELSE title END,
  tagline=COALESCE(tagline,'NO BORDERS.'),
  description=COALESCE(description,'The first transmission from 3RD WORLD.'),
  year=COALESCE(year,2026)
WHERE code='WORLD 001';

UPDATE worlds
SET
  tagline=COALESCE(tagline,'NEXT TRANSMISSION.'),
  year=COALESCE(year,2026)
WHERE code='WORLD 002';
