# 3RD WORLD — Build Architecture

## Phase map
1. Brand / UX / Architecture
2. Frontend Experience
3. Commerce Core + Admin
4. Checkout + Payments + Global Commerce
5. 3RD WORLD Systems
6. Hardening + Launch

## Current frontend
Next.js App Router + TypeScript + custom CSS.

The storefront is commerce-provider independent. Live product, inventory, customer, order and payment data will arrive through the 3RD WORLD API in later phases.

## Planned service boundaries
- Web storefront
- 3RD WORLD API
- Catalog
- Inventory
- Cart / order
- Customer / passport
- Payment orchestration
- Shipping / tax integrations
- Media / CDN
- Notifications
- Analytics

## Payment rule
The storefront never stores raw PAN or CVV. Payment providers tokenize sensitive credentials.
