# 3RD WORLD — Production Launch Runbook

## 1. Secrets
Generate independent secrets. Do not reuse values.

- `DROP_ACCESS_SECRET` — at least 32 random characters
- `CRON_SECRET` — at least 32 random characters
- `SECURITY_HASH_SECRET` — at least 32 random characters
- `SECURITY_ENCRYPTION_KEY` — exactly 32 random bytes, base64 encoded

Example encryption-key generation:

```bash
openssl rand -base64 32
```

## 2. Database
Set the production database variables and run:

```bash
npm run db:migrate
```

Confirm migrations through 013 are applied.

If bootstrapping catalog records:

```bash
npm run db:seed
```

Do not seed positive inventory unless intentional.

## 3. Admin
Create the production owner:

```bash
npm run admin:create -- owner@example.com 'strong-password' 'Owner Name' OWNER
```

Enable 2FA:

```bash
npm run admin:2fa -- owner@example.com enable
```

Store the authenticator secret securely and test a fresh login.

## 4. Payments
Configure production or test Stripe credentials, webhook secret and enabled payment methods.

Webhook endpoint:

`/api/webhooks/stripe`

Do not switch `CHECKOUT_MODE=live` until shipping / tax / duties are valid for every enabled market.

## 5. Shipping / tax / currency
Configure:
- EasyPost credentials and ship-from address
- carrier accounts
- Stripe Tax settings / registrations
- HS codes and country of origin
- explicit market prices or FX provider
- duties mode per market

## 6. Email
Configure and verify:
- `RESEND_API_KEY`
- `NOTIFICATION_FROM_EMAIL`
- `PUBLIC_SITE_URL`

Test:
- drop waitlist email
- private email-access link
- early-access email
- drop-live email
- restock email

## 7. Scheduler
Set `CRON_SECRET`.

Verify the deployment scheduler calls:

`/api/system/world-engine/tick`

Run one authenticated manual tick before release day.

## 8. Launch validation
Run:

```bash
npm run release:check
npm run typecheck
npm run build
```

Then review Admin → SYSTEM. Required items must display READY.

## 9. Release-day test matrix
Before public traffic:
- authorized / unauthorized private product URLs
- code access expiration and usage limits
- email magic-link expiration
- MEMBER / EARLY / VIP behavior
- two simultaneous purchases against the same drop limit
- last-unit purchase collision
- card success
- decline
- 3DS / redirect flow
- payment cancellation
- webhook retry
- full refund
- partial refund
- domestic carrier quote
- international quote / customs
- tax calculation
- sold-out state
- restock transition
- lifecycle open / close / archive
- iPhone Safari
- Android Chrome
- desktop Safari / Chrome

## 10. Monitoring
Monitor:
- `/api/system/health`
- payment webhook failures
- notification outbox failures
- database connection saturation
- checkout error rate
- 5xx response rate
- release lifecycle runs
- inventory allocation failures

Do not launch real-money checkout while the SYSTEM screen says SETUP REQUIRED.
