# Phase 04 — Payments + Global Checkout

## Goal
Turn the Phase 03 commerce core into a real global checkout without giving up the custom 3RD WORLD interface.

## Architecture
3RD WORLD owns the cart, order, inventory and checkout state. Payment providers only tokenize and process payment credentials.

### Payment layer
- provider-neutral PaymentProvider interface
- Stripe is the first live adapter
- automatic payment methods are requested from the provider
- raw card numbers and CVV never enter 3RD WORLD servers
- payment success is webhook-driven, not trusted from browser redirects
- payment webhook IDs are idempotently stored
- inventory remains reserved while payment is pending
- inventory is consumed only after a verified successful payment event

### Global checkout layer
- markets table
- country to market resolution
- market currency metadata
- free-shipping thresholds
- standard shipping rules
- quote snapshots
- explicit tax / duty status
- no fake tax, duty or FX estimates

## Phase 04 build order
1. Payment orchestration + webhook safety — STARTED
2. Global market / quote layer — STARTED
3. Branded Payment Element UI
4. Dynamic payment method presentation
5. Shipping carrier adapter
6. Tax / duties adapter
7. FX / local-currency conversion
8. Refund orchestration
9. Payment + checkout admin controls
10. End-to-end payment QA

## Current first slice
- Stripe payment-intent adapter over direct HTTPS
- signed Stripe webhook verification
- payment attempts + event persistence
- idempotent webhook handling
- payment failure / cancellation states
- reservation-safe order flow
- allocation only after verified payment success
- US / CA / UK / EU / AE / AU market foundations
- checkout quote persistence
- global shipping fallback without inventing exchange rates

## Important launch boundary
The checkout must remain non-live until tax/duty and final shipping configuration are approved for the markets being sold into.
