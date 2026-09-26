# Phase 04 — Payments + Global Checkout

## Goal
Turn the Phase 03 commerce core into a real global checkout without giving up the custom 3RD WORLD interface.

## Architecture
3RD WORLD owns cart state, inventory, orders, markets and the checkout experience. Payment and logistics providers remain replaceable adapters.

### Payment layer
- provider-neutral payment contract
- Stripe first adapter
- dynamic payment methods
- branded Payment Element
- eligible express wallets
- signed, idempotent webhooks
- refund orchestration
- no raw card storage

### Global layer
- country-to-market resolution
- explicit market prices
- optional live FX conversion
- carrier-rate integration
- tax calculation
- duties / landed-cost support
- customs validation
- quote persistence
- safe live-launch readiness gates

## Completed build order
1. Payment orchestration + webhook safety — COMPLETE
2. Global market / quote layer — COMPLETE
3. Branded Payment Element UI — COMPLETE
4. Dynamic payment method presentation — COMPLETE
5. Shipping carrier adapter — COMPLETE
6. Tax / duties adapters — COMPLETE
7. FX / local-currency conversion — COMPLETE
8. Refund orchestration — COMPLETE
9. Payment + checkout admin controls — COMPLETE
10. Production build verification — COMPLETE on implementation branch

## Launch principle
If a provider required for the selected market is not configured, production checkout fails closed instead of inventing a tax, duty, FX or shipping value.
