# Phase 05 — WORLD Engine Live Checklist

## Database
- run `npm run db:migrate`
- verify migrations 008–011 are applied
- assign real products to the intended drop
- verify real inventory per variant
- verify product WORLD matches the drop WORLD

## Private access
- set a strong random `DROP_ACCESS_SECRET`
- create test CODE access and verify expiration / usage limits
- test PUBLIC / EMAIL / CODE / PRIVATE modes
- test MEMBER / EARLY / VIP Passport behavior
- test unauthorized direct product URL and checkout attempts

## Email
- verify sender domain with the email provider
- set `RESEND_API_KEY`
- set `NOTIFICATION_FROM_EMAIL`
- set the production `PUBLIC_SITE_URL`
- test magic-link email access
- test waitlist live notification
- test restock notification

## Lifecycle
- set `CRON_SECRET`
- confirm deployment scheduler can call `/api/system/world-engine/tick`
- verify early-access time
- verify public-open time
- verify close time
- verify archive delay
- run one manual authenticated tick before release day

## Release limits
- confirm the default per-variant limit
- confirm any product override
- test two concurrent checkout attempts for the same Passport/email
- test cancellation releases stock but does not bypass active order limits
- test closed drop items cannot checkout

## Public visibility
- private pieces absent from Shop
- private pieces absent from Search
- private pieces absent from sitemap
- private WORLD absent from Archive until allowed
- closed WORLD remains browseable as history without reopening sales
