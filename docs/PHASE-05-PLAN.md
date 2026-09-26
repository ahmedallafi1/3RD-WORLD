# Phase 05 — 3RD WORLD Engine

## Goal
Turn the storefront into a living brand system built around WORLDs, drops, access and Passport identity.

## Build order
1. Drop access engine + waitlist + access codes
2. Passport tiers + WORLD stamps
3. Dynamic WORLD archive and campaign records
4. Drop product assignment + gated product access
5. Restock notifications + saved pieces
6. Early-access / VIP grant administration
7. Campaign publishing controls
8. Drop lifecycle automation
9. Notification delivery adapters
10. Release-day hardening and load behavior

## First slice
- WORLD / drop schema extensions
- drop-product relationship
- Passport profiles and WORLD stamps
- access codes, grants and access sessions
- waitlist / WORLD / restock subscription primitives
- campaign data model
- dynamic drop gate
- email / code / private access flow
- persistent homepage access signup
- data-driven Archive
- data-driven WORLD detail pages
- Passport tier + stamp UI
- admin drop creation
- admin private access-code creation

## Security principles
- private access tokens are stored hashed
- access codes are stored as keyed hashes
- production fails closed when the access secret is missing
- access sessions expire
- code usage can be limited and scheduled
- private and early access never depend on client-side checks alone
