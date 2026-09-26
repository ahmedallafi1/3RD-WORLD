# Phase 04 Status

Status: **COMPLETE**

## Payments
- provider-neutral payment layer
- Stripe PaymentIntent integration
- dynamic automatic payment methods
- branded Stripe.js Payment Element
- Express Checkout element for eligible wallets
- signed webhook verification
- idempotent payment-event storage
- payment-attempt persistence
- retryable failed payments
- cancellation flow
- payment success driven by verified webhook events
- raw card numbers / CVV never enter 3RD WORLD systems

## Inventory safety
- inventory is reserved before payment
- reservations are extended through checkout
- inventory is consumed only after verified payment success
- cancelled checkout releases reservations
- payment setup failures release reservations
- drop oversell protection remains transactional

## Global checkout
- US / Canada / UK / EU / UAE / Australia / Japan / Singapore / Rest of World markets
- editable shipping thresholds and duties mode
- market-specific prices
- optional live FX via Open Exchange Rates
- safe base-price fallback when FX is not configured
- EasyPost carrier rating
- international customs validation
- optional EasyPost / Zonos landed-cost workflow
- Stripe Tax custom calculations
- checkout quote snapshots
- localized checkout totals
- live-mode readiness gates that refuse unsafe incomplete tax / duties setup

## Refunds / tax records
- full and partial Stripe refunds
- refund webhook synchronization
- refund amount protection against over-refunding
- Stripe Tax transaction creation after payment
- Stripe Tax reversal support on refunds
- partial-refund order lifecycle remains fulfillable

## Admin
- COMMERCE readiness dashboard
- payment / webhook / shipping / tax / duties / FX status
- editable market shipping thresholds
- editable duties mode
- refund controls on orders

## Operations
- database migrations for payment attempts, events, markets, quotes and market pricing
- catalog bootstrap seed
- zero inventory by default when seeding
- shipping product data supports weights, HS codes and country of origin
- order confirmation route
- safe checkout cancellation route

## Build verification
The Phase 04 completion branch passed the production Next.js build before final documentation updates. A final CI run is required after this status commit before merging.

## External configuration required before live launch
Code completion does not create third-party accounts, tax registrations, carrier contracts, payment credentials or customs data. Those operational credentials must be configured before changing `CHECKOUT_MODE` to `live`.
