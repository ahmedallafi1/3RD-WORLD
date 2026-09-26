UPDATE markets
SET countries=ARRAY[
  'AT','BE','BG','HR','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HU',
  'IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK'
],
updated_at=now()
WHERE code='EU';

INSERT INTO markets
  (code,name,currency,countries,free_shipping_threshold_amount,standard_shipping_amount,duties_mode)
VALUES
  ('JP','Japan','JPY',ARRAY['JP'],25000,2500,'CALCULATED_AT_CHECKOUT'),
  ('SG','Singapore','SGD',ARRAY['SG'],22000,2200,'CALCULATED_AT_CHECKOUT'),
  ('ROW','Rest of World','USD',ARRAY[]::text[],20000,2500,'CALCULATED_AT_CHECKOUT')
ON CONFLICT(code)
DO UPDATE SET
  name=EXCLUDED.name,
  currency=EXCLUDED.currency,
  countries=EXCLUDED.countries,
  updated_at=now();
