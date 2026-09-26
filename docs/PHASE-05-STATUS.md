# Phase 05 Status

Status: **COMPLETE**

## Drop Engine
- WORLD / drop database model
- scheduled, early-access, live, closed and archived phases
- data-driven /drop routing
- PUBLIC / EMAIL / CODE / PRIVATE release modes
- private code sessions with hashed tokens
- one-time email magic-link access for approved waitlist addresses
- expiring access sessions
- scheduled and usage-limited access codes
- access-attempt rate limiting
- server-side product and checkout authorization
- protected products excluded from shop, search and sitemap
- closed release pieces remain archive-browseable but cannot be purchased
- automatic release close / archive behavior

## Release Commerce
- admin drop-product assignment
- WORLD compatibility validation for assigned pieces
- per-drop / per-product customer limits
- advisory-lock protection against concurrent limit bypass
- order lines record their originating drop
- release limits count pending and completed purchase attempts conservatively
- checkout rejects expired, private or unauthorized release items

## Passport
- MEMBER / EARLY / VIP tiers
- owner/admin tier management
- owner/admin drop access grants
- purchased WORLD stamps
- saved pieces
- saved-piece controls on product pages
- Passport WORLD history
- Passport saved-piece grid

## Restock
- product restock subscriptions
- inventory transition detection from unavailable to available
- transactional notification outbox enqueueing
- subscriber state tracking

## Culture / Archive
- data-driven Archive
- data-driven WORLD pages
- private live WORLDs excluded from public archive
- campaign model for FILM / EDITORIAL / LOOKBOOK / STORY / SOUND
- campaign create / publish / archive admin controls
- homepage WORLD/drop state driven by the engine

## Notifications
- persistent transactional outbox
- Resend email adapter
- retry behavior
- stale SENDING recovery
- drop early-access notifications
- drop-live notifications
- restock notifications
- secure email access links

## Lifecycle
- scheduled drop → live
- live/scheduled drop → closed
- closed drop → archived after configurable delay
- scheduled WORLD → live
- live WORLD → closed
- lifecycle run audit records
- protected system tick endpoint
- Vercel cron definition every five minutes

## Admin
- DROPS: create / schedule / access mode / product assignment / codes
- ACCESS: grants + Passport tiers
- CAMPAIGNS: create / publish / archive
- existing COMMERCE and inventory controls remain connected

## External configuration still required
Phase 05 code is complete, but production notification delivery and automatic scheduled ticks require real deployment configuration:

- production DATABASE_URL + migrations
- DROP_ACCESS_SECRET
- PUBLIC_SITE_URL
- CRON_SECRET
- RESEND_API_KEY
- verified NOTIFICATION_FROM_EMAIL sender

These are deployment credentials / provider settings, not missing application code.
