# Phase 03 — Commerce Core + Admin

Phase 03 turns the custom storefront into an owned commerce platform.

## Goals
- Canonical product / variant / SKU model
- Multi-location inventory
- Inventory reservations for high-demand drops
- Customer / passport records
- Order lifecycle and audit trail
- Discounts, gift cards and store credit primitives
- Returns / refunds primitives
- WORLD / drop publishing data
- Private admin foundation
- Provider-independent APIs so Phase 04 payments can plug in cleanly

## Build order
1. Domain model and database schema
2. Inventory reservation engine
3. Order state machine
4. Admin information architecture
5. Catalog + inventory APIs
6. Persistent PostgreSQL adapter
7. Customer / Passport auth
8. Returns, credits and discount services
9. Admin permissions + audit log
10. Phase 03 integration / QA

## Rules
- Money is stored as integer minor units, never floating point.
- Inventory writes are transactional.
- A reservation expires unless converted into an order allocation.
- Every administrative mutation must be attributable to an actor.
- Raw payment card data never enters 3RD WORLD systems.
- Storefront and admin consume 3RD WORLD APIs rather than talking directly to payment processors.
- Public catalog data is separated from private operational data.

## Current status
Phase 03 foundation started on `phase-03-commerce-core`.
