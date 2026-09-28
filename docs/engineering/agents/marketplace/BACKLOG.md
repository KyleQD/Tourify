# Marketplace backlog

The canonical work item is a task JSON. Launch priorities remain in `docs/DEVELOPMENT_BACKLOG.md`.

## Active

- None assigned.

## Candidate (from MKT-001 audit — GAPS.md; await owner answers to QUESTIONS.md)

- **MKT-P1a — Land the archived marketplace schema pack** (fix): re-issue `supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/` files `20260728000001`–`20260728000016` + `20260704224927_marketplace_integrations_hardening.sql` additively into `supabase/migrations/` after review. Unblocks idempotency, services, external listings, feed commerce, fee rules, FTS. Closes WS-1.1 + WS-3.2.
- **MKT-P1b — Stripe webhook idempotency ledger** (fix): `marketplace_payment_events` claim table + wire `app/api/marketplace/webhook/route.ts` (pattern: `ticket_stripe_webhook_events` or platform ledger).
- **MKT-P1c — Seller identity model** (build/fix): per-persona storefronts (`seller_entity_id`/`seller_entity_type`) or document one-storefront-per-user.
- **MKT-P1d — Route-level account-type entitlement pass** (fix): enforce `requireMarketplaceEnabledForAccount` + acting context across all marketplace routes.
- **MKT-P1e — Cart scope lock** (build): seller-scoped checkout v1 or multi-artist split checkout.
- **MKT-P2a — Admin marketplace surface** (build): plan-P7 categories, fee-rule admin UI, domain controls (coordinate with admin stream).
- **MKT-P2b — Service buyer flows** (build): booking/quote request pages, counterflow, delivery/tracking.
- **MKT-P2c — FTS/search vector** (build): land `marketplace_listings_fts` with the archived pack (WS-3.2).
- **MKT-P2d — Payout E2E test harness** (build): Staging Stripe Connect sandbox test.
- **MKT-P3a — Route test coverage** (improve): service routes, listings lifecycle, payouts, webhook, import-external, share-to-feed, tax/quote, seller-agreement.

## Done

- Control-plane bootstrap created.
- MKT-001 audit delivered (BASELINE.md, GAPS.md, QUESTIONS.md; STATE.md updated).

## Production launch tasks — 2026-09-16

- **MKT-004 (P0)** — certify the deployed listing, storefront, cart, checkout, order, seller onboarding, payout, cancellation, refund, and webhook lifecycle.
- **MKT-002 (P1)** — align all launch paths with the canonical persona storefront identity and gate incompatible variants.

## MKT-004 execution checkpoint — 2026-09-16

- Local checkout/refund/cancellation authorization hardening is complete with focused tests passing.
- Next is deployed Stripe test-mode listing-to-payout/replay certification after DB-008 and RELEASE-007; no hosted evidence is claimed.
