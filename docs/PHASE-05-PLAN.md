# Phase 05 — 3RD WORLD Engine

## Goal
Turn the storefront into a living brand system built around WORLDs, drops, access and Passport identity.

## Completed build order
1. Drop access engine + waitlist + access codes — COMPLETE
2. Passport tiers + WORLD stamps — COMPLETE
3. Dynamic WORLD archive and campaign records — COMPLETE
4. Drop product assignment + gated product access — COMPLETE
5. Restock notifications + saved pieces — COMPLETE
6. Early-access / VIP grant administration — COMPLETE
7. Campaign publishing controls — COMPLETE
8. Drop lifecycle automation — COMPLETE
9. Notification delivery adapter + outbox — COMPLETE
10. Release-day hardening / rate limits / transactional purchase limits — COMPLETE

## Security model
- private access codes are keyed hashes
- session tokens are stored hashed
- email access requires a one-time magic link
- private products do not appear in public catalog/search/sitemap
- checkout independently re-authorizes every release item
- customer release limits are enforced transactionally
- code brute-force attempts are rate-limited server-side
- production fails closed without the private-access secret
- lifecycle endpoint requires CRON_SECRET in production

## Operations model
- releases are created and scheduled in Admin
- products are assigned to a WORLD drop in Admin
- early / VIP / private grants are controlled in Admin
- campaign records are published in Admin
- cron advances release state automatically
- notifications are queued in PostgreSQL and delivered through the configured email provider
- external credentials remain deployment configuration rather than application source
