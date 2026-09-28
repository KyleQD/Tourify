# Marketplace baseline (MKT-001)

Audit date: 2026-09-09
Reviewed SHA: `a7193116c5a677b1c2939aa4a66e9415dac6eed1` (generated maps)
Task: `docs/engineering/tasks/active/MKT-001.json`

## What exists today

### Web pages (`app/marketplace/`)

| Path | Purpose |
|---|---|
| `app/marketplace/page.tsx` | Marketplace hub — discovery + category browse |
| `app/marketplace/store/[store-slug]/page.tsx` | Public seller storefront by slug |
| `app/marketplace/listing/[listing-slug]/page.tsx` | Public listing page by slug |
| `app/marketplace/listings/[id]/page.tsx` | Listing page by id |
| `app/marketplace/purchases/page.tsx` | Buyer purchase history |
| `app/marketplace/seller-agreement/page.tsx` | Seller agreement acceptance |
| `app/marketplace/order/[token]/page.tsx` | Guest/claimable order page by token |

### API routes (`app/api/marketplace/` — 37 handlers)

- Commerce: `checkout`, `orders`, `order/[token]`, `order/[token]/claim`, `tax/quote`
- Listings: `listings`, `listings/[id]`, `listings/[id]/lifecycle`, `listings/[id]/redirect`, `listings/import-external`
- Storefront/discovery: `storefront`, `discover`, `share-to-feed`
- Services: `service-requests`, `service-requests/[id]`, `service-requests/[id]/action`, `service-offers`, `service-orders/[orderItemId]`, `delivery/[orderItemId]`
- Payments/integrations: `webhook`, `payouts`, `seller-agreement`, `analytics`, `integrations`, `integrations/shopify`, `integrations/shopify/callback`, `integrations/shopify/webhook`, `integrations/printful`, `integrations/printful/webhook`
- Admin: `admin/moderation`, `admin/overview`, `admin/fee-rules`, `admin/webhook-events`
- Moderation/migrations: `moderation`, `migrations/backfill-artist-merch`, `migrations/backfill-artist-music`

Admin API routes (`app/api/admin/marketplace/`): `moderation`, `orders`, `orders/[id]`, `payouts/[id]/retry`.

### Domain services (`lib/marketplace/` — 34 modules)

- Commerce core: `cart.ts` (seller-scoped cart grouping), `catalog.ts` (product types: digital_asset, pod_print, physical_merch, service, tip, ticket, rental, art_original, art_print, commission; seller types: artist, venue, photographer, painter, individual, company), `fees.ts` + `fee-calculator.ts` (10% platform fee on top of seller price; buyer pays subtotal + fee + optional tax), `inventory.ts` (decrement patch, auto-archive at 0), `order-lifecycle.ts` (paid → confirmed/payment paid/payout scheduled; failure → failed/on_hold; refund path)
- Checkout: `checkout` route in `app/api/marketplace/checkout/route.ts` — SHA-256 payload hash idempotency, `authenticateApiRequest` (guest capable), `loadActiveFeeSnapshot`, `getInsufficientInventoryItem`, payout readiness, Zod `marketplaceCheckoutRequestSchema` from `@tourify/api-contracts`
- Services workflow: `service-state-machine.ts` — statuses submitted → under_review → countered/accepted/declined/expired → payment_pending → confirmed → in_progress → completed; any → canceled; actor roles buyer/seller; optimistic concurrency via `optimistic_version` (409 on conflict); booking_request / quote_request modes
- Listings: `listing-lifecycle.ts`, `public-listing-query.ts`, `external-import.ts`
- Storefront: `storefront-themes.ts`, `storefront-curation.ts`, `profile-module.ts`
- Payments: `stripe-server.ts`, `webhook-handler.ts`, `webhook-processor.ts`
- Integrations: `shopify-adapter.ts`, `printful-adapter.ts`, `printful-fulfillment.ts`, `printful-webhook.ts`, `integration-credentials.ts`, `integration-sync.ts`, `provider-normalizers.ts`, `ticket-source-adapter.ts`
- Entitlements: `entitlement-delivery.ts`, `entitlement-resolver.ts`, `feed-attachment.ts`
- Ops: `seller-analytics.ts`, `seller-payout-readiness.ts`, `feature-flags.ts`, `require-marketplace-enabled.ts`, `schema-readiness.ts` (PGRST205 → "not ready in this environment"), `storage-path.ts`

### Feature flags (`lib/marketplace/feature-flags.ts`)

- Global kill-switch: `FEATURE_MARKETPLACE` / `NEXT_PUBLIC_FEATURE_MARKETPLACE` — **all marketplace flags default off** (marketplace invisible until enabled)
- Area flags: public discovery, native goods, services, external listings, guest checkout, account-type gating
- Guards (`require-marketplace-enabled.ts`): 503 when disabled, 403 for account-type restriction — `requireMarketplaceEnabled`, `requirePublicDiscoveryEnabled`, `requireMarketplaceEnabledForAccount`

### Components (`components/marketplace/` — 10)

`animated-product-card.tsx`, `feed-listing-card.tsx`, `feed-storefront-card.tsx`, `listing-card.tsx`, `listing-quick-view.tsx`, `profile-marketplace-module.tsx`, `seller-store-dashboard.tsx`, `storefront-banner.tsx`, `storefront-theme-editor.tsx`, `stripe-connect-setup.tsx`

### Database objects (generated map: `docs/engineering/generated/database-objects.md`)

Active tables (from `supabase/migrations/20260410120000_marketplace_core.sql`):
- `marketplace_storefronts` (incl. `seller_type`, `accepted_seller_agreement_at`, `seller_agreement_version` — added by `20260413203708_marketplace_expansion.sql`)
- `marketplace_listings` (status/moderation/inventory/price checks; indexes on seller/status/category/product_type)
- `marketplace_listing_variants`
- `marketplace_orders` (status/payment_status checks)
- `marketplace_order_items`, `marketplace_entitlements`, `marketplace_payout_ledger`, `marketplace_moderation_queue`, `marketplace_service_milestones`, `marketplace_integrations`

All 10 confirmed in the generated database objects map — **and no other `marketplace_*` tables exist in the active chain.**

Stripe Connect / subscriptions: `supabase/migrations/20260413400000_stripe_connect_and_subscriptions.sql`, `20260415140000_stripe_connect_option_b_parallel.sql`. Legacy photo marketplace: `20250208000000_photo_album_marketplace_system.sql` (`photo_purchases` etc. — separate legacy surface).

### Tests (all pass under `npm test` evidence in repo)

- `lib/marketplace/__tests__/` (14): cart, checkout-p6, entitlement-delivery, entitlement-resolver, feed-attachment, fees, integration-credentials, inventory, order-lifecycle, printful-webhook, provider-normalizers, seller-analytics-and-curation, service-state-machine, shopify-adapter
- Route tests: `app/api/marketplace/checkout/__tests__/route.test.ts`, `discover/__tests__/route.test.ts`, `storefront/__tests__/route.test.ts`, `migrations/__tests__/backfill-guards.test.ts`

## Intended direction

Primary spec sources:
- `docs/marketplace-build/tourify-marketplace-handoff/` (01-product-requirements, 02-roles-user-flows, 03-ui-ux-specification, 04-technical-architecture, 05-data-security-migrations, 06-implementation-roadmap, 07-qa-acceptance, 08-ai-agent-handoff-prompt, marketplace-implementation-tasks.json)
- `docs/marketplace-build/marketplace-implementation-plan.md` — phased plan P0→P9; **P0 audit complete** (see findings below), P1+ in planning
- `docs/marketplace-build/marketplace-current-system-audit.md`, `marketplace-integration-map.md`, `marketplace-rollback-runbook.md`
- Backlog context: `docs/DEVELOPMENT_BACKLOG.md` — WS-0.4 (discount/referral clamp), WS-0.5 (atomic inventory / checkout idempotency / parallel race tests), WS-1.2 (idempotency with unique key), WS-1.1 (complete migration reconciliation)

Key design decisions (from plan + handoff docs):
- **Stripe is merchant of record** for native marketplace transactions
- Marketplace services are seller-profile surfaces only — never written to / read from the jobs/staffing system
- Account entitlements: General/Artist/Venue sell physical goods, services, external listings; Organizations tickets-only (existing ticketing integration)
- Three connected surfaces: marketplace hub, profile storefront module, feed commerce (shareable listing/storefront cards)
- Service workflows: fixed_price, booking_request, quote_request via `service_mode`/`listing_kind` (columns planned, see GAPS)
- Additive migrations only; never drop/truncate/reset production tables

`docs/engineering/agents/marketplace/BACKLOG.md` — no active or candidate tasks yet; this audit feeds it.

## Evidence footnotes

- Generated maps stamped at SHA `a7193116c5a677b1c2939aa4a66e9415dac6eed1`: `docs/engineering/generated/{routes,api-routes,components,database-objects,database-schema}.md`
- Dirty worktree (386 entries) noted in task record; unrelated concurrent changes preserved
- Working set expansions beyond task baseline (recorded in checkpoint): `supabase/migrations/`, `supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/`, `lib/stripe`, `@tourify/api-contracts` (type contract for checkout), `docs/marketplace-build/` (spec source), `lib/database.types.ts` (confirms checkout-attempt-type surface)

## Confidence

Partial. Application code is far ahead of the active schema (see GAPS.md — 14 referenced tables absent from the active chain). Route behavior under the live DB cannot be confirmed without runtime verification; `schema-readiness.ts` implies graceful degradation is expected. No production code was changed by this audit.