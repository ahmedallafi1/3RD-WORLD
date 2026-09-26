# Phase 03 — Commerce Core + Admin

## Status
Core implementation complete.

## Completed
- PostgreSQL connection pool and migration runner
- Canonical WORLD / drop / product / variant / SKU schema
- Multi-location inventory model
- Transactional inventory reservations with expiry
- Auditable stock adjustments
- Persistent carts and cart-line reservation API
- Persistent order creation from fully reserved carts
- Order lifecycle state machine and event history
- Customer accounts and Passport sessions
- Password hashing with scrypt
- Admin accounts, sessions and RBAC
- Admin overview, product, inventory, order and drop surfaces
- Product create / update / archive APIs
- Inventory adjustment API
- Order transition API
- Admin and customer session APIs
- Storefront catalog adapter backed by PostgreSQL with safe local fallback
- Admin audit log and inventory event log
- Gift card, store credit, discount, return and refund data primitives
- Database bootstrap for NYC Main plus WORLD 001 / WORLD 002

## Setup
1. Set `DATABASE_URL`.
2. Run `npm run db:migrate`.
3. Create the owner account:

   `npm run admin:create -- owner@example.com 'strong-password' 'Owner Name' OWNER`

4. Start the app and sign in at `/admin/login`.

## Boundaries carried into Phase 04
Phase 03 intentionally does not process live payment credentials. Phase 04 connects payment orchestration, dynamic payment methods, taxes, duties, shipping quotes and payment webhooks to the order state machine already built here.

Product photography / campaign assets and object-storage upload plumbing can be added independently without changing the commerce model.
