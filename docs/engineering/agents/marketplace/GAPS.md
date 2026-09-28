# Marketplace gaps (MKT-001)

Triage: **missing** / **incomplete** / **improve**. Every item carries evidence + location. Order within triage is severity-first.

## Missing

### M1 — Phase-2/6 marketplace schema was never applied to the active migration chain (BLOCKING, highest severity)
14 `marketplace_*` tables are referenced by application code (`lib/marketplace/`, route handlers, `lib/database.types.ts`) but do **not** exist in the active migrations or the generated database map:
- `marketplace_checkout_attempts` (checkout idempotency key — `app/api/marketplace/checkout/route.ts`, `lib/marketplace/webhook-processor.ts:343`)
- `marketplace_payment_events` (Stripe webhook dedup — `lib/marketplace/webhook-processor.ts:50,86,95`)
- `marketplace_service_requests`, `marketplace_service_offers`, `marketplace_service_bookings` (`app/api/marketplace/service-requests/**, service-offers, service-orders/**`)
- `marketplace_external_listings`, `marketplace_external_clicks` (`lib/marketplace/feed-attachment.ts:159,286`, `listings/import-external`)
- `marketplace_post_attachments` (feed commerce — `lib/marketplace/feed-attachment.ts:119,248`, `share-to-feed/route.ts:154`)
- `marketplace_fee_rules` (fee overrides — `lib/marketplace/fee-calculator.ts:52`, `admin/fee-rules`)
- `marketplace_ticket_collections` (org ticketing adapter)
- `marketplace_integration_products`, `marketplace_integration_sync_runs`, `marketplace_provider_webhook_events`, `marketplace_fulfillment_requests` (Shopify/Printful import+sync — `lib/marketplace/integration-sync.ts`)

Evidence:
- Generated map `docs/engineering/generated/database-objects.md` lists only the 10 core tables; zero occurrences of the 14 above.
- The DDL for all 14 exists only under `supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/` (files `20260728000001`–`20260728000016`, `20260704224927_marketplace_integrations_hardening.sql`) flagged `local_only_unapplied` in `MANIFEST.csv`.
- `lib/database.types.ts` includes these tables (types generated at some earlier point), so TS compiles while runtime hits PGRST205.
- Related columns also unapplied: `listing_kind`, `service_mode` (`lib/marketplace/catalog.ts` defines kinds/modes that require `20260728000001`/`00002`), guest-checkout columns on `marketplace_orders` (`00014`), admin moderation columns (`00015`), FTS/search vector (`00013`, `00016`).
- `lib/marketplace/schema-readiness.ts` + `require-marketplace-enabled.ts` handle PGRST205 gracefully, which is why routes don't visibly crash in tests.
- Backlog linkage: WS-1.1 "complete migration reconciliation", WS-3.2 "land quarantined marketplace FTS decision" — `docs/DEVELOPMENT_BACKLOG.md`.

### M2 — Stripe webhook idempotency ledger missing in the ACTIVE schema
`app/api/marketplace/webhook/route.ts` verifies the Stripe signature but has no dedup/claim table against it (duplicate Stripe delivery can double-decrement inventory, double-insert entitlements, double-upsert libraries). The P0 audit already flagged this (`docs/marketplace-build/marketplace-implementation-plan.md` finding #2) and planned `marketplace_payment_events` (M1 row above, never applied). Ticketing has the correct pattern (`ticket_stripe_webhook_events`); a platform-wide `platform_webhook_events` ledger exists for subscriptions (`supabase/migrations/20260823200000...`). Decision needed: dedicated `marketplace_payment_events` vs fold into `platform_webhook_events`.

### M3 — No `__tests__/marketplace/**` suite; route-level tests are thin
Working set declares `__tests__/marketplace/**` but the directory is empty. Test coverage lives in `lib/marketplace/__tests__/` (unit) and only 4 route tests exist (`checkout`, `discover`, `storefront`, `backfill-guards`). No tests for: service-requests/offers/action routes, listings CRUD/lifecycle, payouts, webhook, import-external, share-to-feed, tax/quote, seller-agreement.

### M4 — Storefront persona columns are not in the active schema (BLOCKED on additive reconciliation)
The canonical model is now fixed as `seller_entity_id` + `seller_entity_type`, keyed from verified acting context. The active `marketplace_storefronts` table still references only `seller_user_id`, so runtime adoption remains blocked on the explicitly deferred additive schema reconciliation. `lib/marketplace/storefront-identity.ts` publishes the migration-free ownership contract; it does not query or write archive-only columns.

### M5 — Per-route account-type gating not audited/wired
`lib/marketplace/require-marketplace-enabled.ts` provides `requireMarketplaceEnabledForAccount` but the audit could not confirm every route enforces account-type + acting-context (plan P0 finding #3: routes use `requireApiUser()` only). Requires a per-route pass before launch.

## Incomplete

### I1 — Checkout idempotency is implemented but its backing table is missing (ties to M1)
`app/api/marketplace/checkout/route.ts` computes a SHA-256 input hash and (per `webhook-processor.ts`) writes an idempotency claim — but that claim table (`marketplace_checkout_attempts`, `00011`) is one of the unapplied migrations. Until M1 lands, idempotency is effectively disabled at runtime. WS-0.5 "parallel race tests" also remain open.

### I2 — Feature flags exist but are partial vs the plan's full suite
`lib/marketplace/feature-flags.ts` covers global + area + account-type toggles, but the plan (P1) calls for explicit per-domain flags used as guards across **every** API route. Route-by-route adoption is unverified (some routes guard via `requireMarketplaceEnabled()`/`requirePublicDiscoveryEnabled()`, e.g. `discover`, `checkout`; others rely on the 503 path only).

### I3 — Seller identity/storefront per-persona (see M4) — runtime adoption deferred
The per-persona identity contract is documented and unit-tested, but profile/storefront queries still use the current `seller_user_id` compatibility shape until schema reconciliation. EPK/profile section wiring for marketplace module is not verified implemented.

### I4 — Admin marketplace surface partial
Admin has moderation + orders + payouts/retry + fee-rules API, but the plan's P7 (categories, fee-rule admin UI, domain controls) is not built. Only `app/api/marketplace/admin/*` + `app/api/admin/marketplace/*` exist; no admin pages for categories/fee rules/domain controls found.

### I5 — Cart is MVP seller-scoped only
`lib/marketplace/cart.ts` groups cart lines by seller with an explicit comment that multi-artist checkout is a future evolution. No cart persistence table; cart is client-side. Multi-artist/split cart is a spec item (`02-roles-user-flows`, P5).

### I6 — Service UI surfaces
Service APIs + state machine exist, but service workflows surface on the storefront/listing pages only; booking/quote request flows lack dedicated buyer-facing pages (verify against `app/marketplace/` — only hub, store, listing, listings/[id], purchases, seller-agreement, order/[token] exist).

## Improve

### P1 — Migration reconciliation is the industry-grade fix for M1
The archived pack (`supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/`) is local_only_unapplied. Re-issuing additively into `supabase/migrations/` (after schema review) resolves M1 rows, the FTS gap (WS-3.2), moderation columns, and guest checkout in one coherent chain — instead of piecemeal.

### P2 — Consolidate marketplace webhook handling
Both `lib/marketplace/webhook-handler.ts` and `webhook-processor.ts` manage Stripe events with partially overlapping logic. One entry point + one ledger (see M2) reduces drift.

### P3 — Discovery/search quality
FTS/search_vector on listings was planned (`20260728000013`, `00016`) and never applied; current `discover` presumably uses ILIKE/case-insensitive matching. Land FTS decision (WS-3.2) as part of M1.

### P4 — Seller-payout readiness is code-only
`lib/marketplace/seller-payout-readiness.ts` + `payouts/route.ts` exist; no automated end-to-end payout test (Stripe Connect happy path + failure) found.

### P5 — Docs drift
`docs/marketplace-build/marketplace-implementation-plan.md` still says P1 feature-flag suite "doesn't exist" while `feature-flags.ts` now implements the full suite; plan's "what exists" list omits service-state-machine, storefront-curation, seller-analytics, entitlement-delivery, feed commerce routes. Update plan or mark it a historical audit.

## Summary counts
- Missing: 5 (M1–M5)
- Incomplete: 6 (I1–I6)
- Improve: 5 (P1–P5)
