# Marketplace state

<!-- generated-agent-state:start -->
## Generated queue summary

- Generated at: 2026-09-28T03:22:19.549Z
- Source: task records and TASK_INDEX.json

- `MKT-002` — blocked/waiting_dependency; CORE-WEB-LAUNCH
- `MKT-004` — active/in_progress; CORE-WEB-LAUNCH
- `MKT-006` — blocked/waiting_dependency; CORE-WEB-LAUNCH
- `MKT-007` — blocked/waiting_dependency; CORE-WEB-LAUNCH
- `MKT-008` — blocked/waiting_dependency; CORE-WEB-LAUNCH
- `MKT-009` — blocked/waiting_dependency; CORE-WEB-LAUNCH
<!-- generated-agent-state:end -->

- Last reviewed SHA: `a7193116c5a677b1c2939aa4a66e9415dac6eed1`
- Last reviewed at: 2026-09-09
- Historical active-task note (superseded by generated queue summary): MKT-003 (Marketplace side of music commerce split)
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

## Wave 33 checkpoint — 2026-09-25 (HEAD d2176904, dirty worktree)

- **SEC-109 is clean for marketplace.** The stale reviewed-debt entry for `app/marketplace/order/[token]/page.tsx` is removed; the guest capability-token read is now registered against `app/marketplace/order/order-access.ts` and the entitlement download write against `app/api/marketplace/delivery/[orderItemId]/route.ts`, both `replace_with_rpc`. The gate still exits 1 on two untracked venue-lane files (`HF-VENUE-SERVICE-ROLE-IMPORTS`).
- **Checkout cannot succeed on the active chain.** `marketplace_checkout_attempts` and `marketplace_external_listings` are `local_only_unapplied` (archive MANIFEST.csv:257 and :249), absent from `supabase/migrations/` and from `lib/database.types.ts`. Checkout fails closed with 503 `schema_not_ready`, so the P0 idempotency ledger does not exist anywhere built from the active chain. Routed as `HF-DB-009-MARKETPLACE-TYPE-AND-RPC-SURFACE`.
- **Money writes now read back their own guard.** The seller refund lifecycle-audit write and the guest order-claim link both verify the affected row and treat an empty result as failure (CP-061).
- **A claim requires settled money.** `app/api/marketplace/order/[token]/claim/route.ts` refuses `pending`/`failed` orders with 409 before any write, and returns 409 without resolving entitlements when it loses the `buyer_user_id` race.
- **Buyer isolation on the order page is app-enforced, not RLS-enforced.** `app/marketplace/order/order-access.ts:38,61` reads a signed-in buyer's order through the service-role client with a `buyer_user_id` filter. `marketplace_orders_participant_read` would enforce it server-side, but the MKT-005 suite asserts the current client and query order, so it needs its own task.
- **Marketplace has no tenant scope.** The order lifecycle is `seller_user_id`-scoped only; MKT-004's "buyer, seller, and tenant authorization" criterion cannot be met until the MKT-002 persona columns land.
- **MKT-008 download counting is concurrency-safe but not lossless.** The compare-and-swap can neither double-count nor lose a count, but two simultaneous legitimate downloads make one buyer receive 409. The single-statement increment is requested in `HF-DB-009`, not authored here.
- Verification this wave: vitest `lib/marketplace/__tests__` + `__tests__/marketplace` 19 files / 186 tests; jest 7 focused marketplace route suites / 25 tests; `check:production-debug` pass; focused ESLint exit 0; scoped `git diff --check` exit 0; `agents:validate` 0 errors. No full typecheck (68m18s / 1,384 errors measured by the control plane) and no hosted or Stripe result is claimed.

## Wave 35 checkpoint — 2026-09-27 (HEAD 16fb834f, dirty worktree)

- **The archive-only money-path schema has landed.** `marketplace_checkout_attempts` and the P6 guest-checkout order columns are in the active chain as `20260926120000`; `marketplace_external_listings` as `20260926120100`; `marketplace_payment_events` and `marketplace_fee_rules` as `20260926140100`. The Wave 33 "checkout fails closed with 503 schema_not_ready" finding no longer holds. `lib/database.types.ts` is still stale, so the `HF-DB-009` types half remains open and the types file is not ours to hand-edit.
- **`public.record_marketplace_entitlement_download` is in the chain (`20260926120200`) but not in `lib/database.types.ts`,** so `app/api/marketplace/delivery/[orderItemId]/route.ts` still uses the compare-and-swap. The delivery route's buyer scoping and its `buyer_user_id`-filtered increment are proven; the single-statement swap waits on the types regeneration.
- **A failed webhook delivery was permanently swallowed.** `handleMarketplaceStripeEventIdempotent` treated every unique violation as `duplicate`, so when a handler had thrown and recorded the row as `failed`, Stripe's own retry got a 200 and the captured payment was never fulfilled. The insert is now a claim: a `failed` row is taken over under a conditional update on `processing_status` with `attempts` incremented, and only a `processed` row is a duplicate. Durable replay safety, not a flag.
- **A failed checkout session burned the buyer's idempotency key for 30 minutes.** The Stripe-init rollback deleted the order but not the `marketplace_checkout_attempts` row, leaving `pending` with a null `order_id`, which `resolveCheckoutAttempt` reported as `checkout_in_progress`. The rollback now releases the key, and `resolveCheckoutAttempt` is expiry-aware with a `reclaim` action for a pending attempt that has no order. Reclaiming is safe: there is no order to duplicate, the partial unique index on `marketplace_orders.idempotency_key` still serialises a concurrent winner, and the Stripe session is keyed by the same client key.
- **Persona denials now reach the money paths.** `lib/marketplace/order-authorization.ts` is the shared server-boundary rule for the cancel and refund routes: a verified venue, artist, service, or organization persona that owns `seller_user_id` is denied `403 persona_storefront_schema_not_ready` instead of being treated as the seller. The persona gate previously covered the create path (listings, storefront) but not the money paths. **This is a behaviour change for persona sellers transacting today** — they are now denied, and release should confirm no live seller uses a persona account type.
- **Still true:** the order lifecycle is `seller_user_id`-scoped only. `seller_entity_id`/`seller_entity_type` appear in no active migration, so real tenant authorization is MKT-002 schema, not something this lane can close.
- **Residual replay risk, recorded not fixed:** a delivery killed mid-processing leaves a `processing` row that the claim does not take over. Reclaiming it safely needs a liveness signal (`processing_started_at`) the schema does not have.
- Verification this wave: vitest 21 files / 205 tests; jest 11 marketplace suites / 52 tests; `check:service-role-allowlist` exit 0 (194 files) — the recorded venue-file failure is stale and removed; `check:production-debug` pass; focused ESLint exit 0; scoped `git diff --check` exit 0; `agents:validate` 8 pre-existing handoff errors, none marketplace. Scoped `tsc` over `lib/marketplace/**` + `app/api/marketplace/**`: 89 errors, all pre-existing and mostly the stale types file; zero in files created this wave. `npm run test:e2e` not run — no deployment, no Supabase, no Stripe credentials. No hosted or Stripe result is claimed.
