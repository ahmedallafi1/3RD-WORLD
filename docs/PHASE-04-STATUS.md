# Phase 04 Status

Status: **IN PROGRESS**

## Completed in first slice
- payment provider abstraction
- Stripe PaymentIntent creation
- automatic payment-method request
- signed webhook verification
- payment attempts
- idempotent payment events
- retryable failed-payment behavior
- cancellation release behavior
- inventory held through payment
- inventory consumption only after verified success
- market database model
- checkout quote snapshots
- shipping threshold rules
- safe base-currency fallback for markets without FX
- prepare-checkout API
- quote API
- payment-session API
- Stripe webhook endpoint

## Next slice
- custom branded payment UI
- provider client integration for dynamic methods / wallets
- address normalization
- carrier-rate adapter
- tax / duties provider
- local-currency FX
- refunds and partial refunds against the payment provider
- checkout-admin configuration
