# Phase 04 — Live Checkout Checklist

Do not set `CHECKOUT_MODE=live` until each applicable item is complete.

## Database
- set production `DATABASE_URL`
- run `npm run db:migrate`
- run `npm run db:seed` if bootstrapping the current catalog
- set real inventory through admin
- verify every international item has an accurate weight, HS code and country of origin

## Stripe
- set live secret and publishable keys
- configure enabled payment methods in Stripe
- optionally set `STRIPE_PAYMENT_METHOD_CONFIGURATION`
- create webhook endpoint for `/api/webhooks/stripe`
- set webhook signing secret
- test success, decline, 3DS / redirect, processing and cancellation paths

## Tax
- activate Stripe Tax only after the business has the required registrations
- set `STRIPE_TAX_ENABLED=true`
- configure the correct apparel tax category
- verify tax calculations in every market being launched

## Shipping
- set EasyPost API key
- configure the real ship-from address
- connect the intended carrier accounts
- verify weights and parcel dimensions
- test domestic and international rates
- if using prepaid duties, complete EasyPost / Zonos landed-cost onboarding before enabling it

## Currency
- either enter explicit market prices or configure Open Exchange Rates
- review `FX_MARGIN_BPS`
- verify customer-facing prices and payment currency match

## Final launch
- test each enabled market
- test Apple Pay / Google Pay / cards / redirect methods that are enabled and eligible
- test full and partial refunds
- test payment webhook retries
- test reservation expiry and cancelled checkout
- confirm admin COMMERCE page reports required systems ready
- switch `CHECKOUT_MODE` from `test` to `live`
