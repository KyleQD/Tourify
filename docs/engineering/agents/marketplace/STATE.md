# Marketplace state

- Last reviewed SHA: `a7193116c5a677b1c2939aa4a66e9415dac6eed1`
- Last reviewed at: 2026-09-09
- Active task: MKT-003 (Marketplace side of music commerce split)
- Confidence: partial (app code ahead of active schema; see GAPS.md M1)

## Durable facts

- Mission: Own marketplace listings, services, carts, checkout, orders, and commerce workflows.
- Default working set is recorded in `WORKING_SET.json`.
- **The marketplace application code references 14 `marketplace_*` tables that are absent from the active migration chain** (`supabase/migrations/`). All DDL exists only under `supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/` as `local_only_unapplied` (checkout attempts, payment events, service requests/offers/bookings, external listings/clicks, post attachments, fee rules, ticket collections, integration products/sync runs, provider webhook events, fulfillment requests). See `GAPS.md` M1 + QUESTIONS Q1.
- Stripe is merchant of record; webhook route has no active idempotency ledger (see GAPS M2).
- Canonical storefront ownership is per-persona: `seller_entity_id` + `seller_entity_type` identify the verified acting artist, venue, or organization (general accounts use the user entity). `seller_user_id` remains the current-schema compatibility owner until the additive reconciliation lands; see `lib/marketplace/storefront-identity.ts`.
- Marketplace is feature-flagged OFF by default (`lib/marketplace/feature-flags.ts`); area flags include services, external listings, guest checkout, account-type gating.
- Checkout idempotency uses SHA-256 payload hash (`app/api/marketplace/checkout/route.ts`); backing table is unapplied (GAPS I1).
- Cart is MVP seller-scoped (`lib/marketplace/cart.ts`); multi-artist checkout is a planned evolution (GAPS I5).
- Fees: 10% platform fee on top of seller price (buyer pays subtotal + fee + optional tax) — `lib/marketplace/fees.ts`.
- Archive manifest: `supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/MANIFEST.csv`.

- The canonical storefront identity contract is code-only and migration-free for now. It must be fed by `resolveActingContext`; it does not enable, query, or write archive-only columns.
- MKT-003 publishes the Marketplace-side music commerce boundary in `lib/marketplace/music-commerce-boundary.ts`: Marketplace owns checkout, orders, transfers, portfolios, and music-marketplace operations; native checkout keeps an explicit guest-auth exception.
- MKT-003 publishes `requireMarketplaceAccount` in `lib/marketplace/music-commerce-auth.ts`, backed by verified API identity plus server-side acting-context persona ownership checks. Route handlers have not adopted it yet because that follow-up is outside the task's `lib/marketplace/` write boundary.
- `requiresMarketplaceAccountAuth` in `lib/marketplace/music-commerce-boundary.ts` is the route-audit/adoption predicate: required-auth for orders and the music-marketplace tree, optional for native checkout, and false outside declared Marketplace commerce trees.

## Current focus

- Baseline, gaps, and product-owner questions for MKT-001 are complete: `BASELINE.md`, `GAPS.md`, `QUESTIONS.md` in this directory.
- Next: coordinate route-handler adoption with MUSIC-003/Artist work for `/api/marketplace/orders` and `/api/music-marketplace/**`, while preserving guest checkout and awaiting schema reconciliation for runtime rollout.

## Known risks

- M1 (unapplied schema) is the single biggest risk: routes degrade at runtime via `schema-readiness.ts` (PGRST205) rather than failing loudly.
- The repository was already heavily modified at bootstrap; the worktree is dirty (386 entries at MKT-001 creation).
- Generated maps describe topology, not behavioral correctness.

Update this file only when a task establishes a durable fact future work needs.

## Owner direction — 2026-09-10

Marketplace archive-only schema is a phased additive-reconciliation dependency.
Dependent features remain disabled until the active chain and runtime evidence
agree. Entitlements require account type plus acting context/resource ownership.

## Production launch graph — 2026-09-16

- MKT-004 is P0 and owns the deployed listing-to-payout lifecycle, buyer/seller/tenant authorization, Stripe test-mode payments, idempotency, replay, auditability, cancellation, and refunds.
- MKT-002 is P1 and must make the canonical persona storefront contract drive all enabled launch paths; incompatible variants stay disabled through RELEASE-008.

## MKT-004 execution checkpoint — 2026-09-16

- Implemented fail-closed checkout idempotency, canonical account/variant launch gates, Stripe refund and payout-hold safety, pending-order cancellation, seller-only refund requests, and audit transitions.
- Marketplace Vitest passed 15 files/147 tests and route Jest passed 4 suites/10 tests; deployed Stripe lifecycle, hosted schema, and distributed idempotency evidence remain open.
