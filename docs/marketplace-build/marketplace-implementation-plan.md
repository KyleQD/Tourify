# Tourify Marketplace — End-to-End Implementation Plan

**Source of truth:** `docs/marketplace-build/tourify-marketplace-handoff/`
**Status:** Approved for planning — implementation not yet started
**Non-destructive policy:** Additive migrations only. Never drop, truncate, or reset production tables.

## Confirmed Decisions

| Decision | Resolution |
|---|---|
| Merchant of record | **Stripe** — Stripe is the merchant of record for all native marketplace transactions |
| Services vs jobs | Marketplace services are seller profile surfaces only — they appear on the seller's storefront, public listing page, and can be shared to the feed. They do not appear in the jobs/staffing section and have no overlap with the existing job-posting system |
| Phase order | Sequential: P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9 |
| Organization ticket adapter | Implemented as part of P4 (public discovery) |

---

## Overview

The goal is to implement the Tourify Marketplace as defined in the official handoff documents (01–08). The marketplace is a commerce layer built on top of Tourify's existing identity, profile, feed, ticketing, music, messaging, analytics, and account-management systems.

A partial implementation already exists (`20260410120000_marketplace_core.sql`, `lib/marketplace/`, `app/marketplace/`). This plan audits what exists, identifies all gaps against the spec, and drives the work forward phase by phase.

### Three connected surfaces
1. **Marketplace hub** — `/marketplace` — searchable public discovery hub
2. **Profile storefront** — configurable module on seller's public profile + dedicated storefront page
3. **Feed commerce** — shareable listing and storefront cards in the post/feed system

### Account entitlements
| Account | Physical goods | Services | External | Tickets |
|---|---|---|---|---|
| General | ✅ | ✅ | ✅ | ❌ |
| Artist | ✅ (merch) | ✅ | ✅ | ❌ |
| Venue | ✅ | ✅ | ✅ | ❌ |
| Organization | ❌ | ❌ | ❌ | ✅ (existing only) |

### What already exists (partial)
- **Schema:** `marketplace_storefronts`, `marketplace_listings`, `marketplace_listing_variants`, `marketplace_orders`, `marketplace_order_items`, `marketplace_entitlements`, `marketplace_payout_ledger`, `marketplace_moderation_queue`, `marketplace_service_milestones`, `marketplace_integrations`
- **Payment:** Stripe client, Stripe Connect (V1 + V2 parallel), webhook handler (checkout.session.completed, payment_intent.payment_failed, charge.refunded)
- **Hub page:** Basic `/marketplace` page with search, category filter, and buy now
- **API routes:** `checkout`, `discover`, `listings`, `orders`, `storefront`, `payouts`, `webhook`, `analytics`, `moderation`, `integrations`
- **lib/marketplace:** `cart`, `webhook-handler`, `order-lifecycle`, `seller-payout-readiness`, `fees`, `inventory`, `feature-flags` (partial — only `isMarketplaceMerchAnalyticsEnabled`)
- **Components:** `animated-product-card`, `seller-store-dashboard`, `storefront-banner`, `storefront-theme-editor`, `stripe-connect-setup`

### Key gaps against the spec
- No full feature-flag suite for marketplace domains (`marketplace_enabled`, `marketplace_native_goods_enabled`, etc.)
- No account-type entitlement resolver (authorization is not enforced server-side by account type)
- No listing types: `listing_kind` (physical/service/external), `service_mode` (fixed_price/booking_request/quote_request) not in schema
- No external listing import service (SSRF-safe, metadata fetch, stored-destination redirect)
- No service workflow: booking requests, quote requests, offer versions, state machine
- No guest checkout + guest order claim flow
- No typed feed post attachment (`marketplace_post_attachments` or equivalent)
- No profile Marketplace module in the EPK/profile section system
- No organization ticket collection adapter (to be addressed in P4)
- No storefront slug routing (`/marketplace/store/[slug]`, `/marketplace/listing/[slug]`)
- No comprehensive feature flags used as gates across API routes
- No admin UI for categories, fee rules, domain controls, moderation
- No structured search indexes (full-text / tsvector)
- Existing `marketplace_storefronts` references `seller_user_id` directly — not to the multi-account identity model (artist_profiles, venue_profiles, organizer_accounts)
- **Services must not surface in jobs/staffing** — the `service_mode` field on `marketplace_listings` is the only workflow; existing job-posting tables are untouched

---

## Sub-Tasks

---

### P0 — System Audit and Integration Contract

**Status:** `[x] done`

**P0 Findings — Critical Integration Decisions Discovered:**

1. **Identity gap: `seller_user_id` = auth user, not entity persona.** `marketplace_storefronts.seller_user_id` references `auth.users.id` (raw auth user). A user acting as their artist persona has `profileId = artist_profiles.id` — a different UUID. Decision required in P1: add `seller_entity_id` + `seller_entity_type` columns for per-persona storefronts, or document the one-storefront-per-user model. This gates the entire storefront authorization model.

2. **Webhook idempotency is missing.** `app/api/marketplace/webhook/route.ts` verifies the Stripe signature but has no idempotency claim table. Duplicate webhook delivery can cause duplicate inventory decrements, entitlement inserts, and library upserts. The ticketing V2 system has the correct pattern (`ticket_stripe_webhook_events` + unique index on `webhook_event_id`). P6 must add `marketplace_stripe_webhook_events` before any production traffic.

3. **No `resolveActingContext` in any marketplace API route.** Every existing marketplace route (`checkout`, `listings`, `storefront`, `orders`) uses `requireApiUser()` which only validates the JWT — it does not resolve the acting entity or enforce account-type entitlement. P1 must refactor all marketplace mutations to use `resolveActingContext()` + entitlement checks.

4. **Feature flag suite is nearly empty.** Only `isMarketplaceMerchAnalyticsEnabled()` exists. The full suite (`marketplace_enabled`, `marketplace_native_goods_enabled`, `marketplace_services_enabled`, etc.) must be created in P1 and applied as guards in every API route before any P2 schema work lands in production.

5. **`content_ref_type` is freely extensible.** No CHECK constraint — adding `'marketplace_listing'` / `'marketplace_store'` requires zero schema migration. Feed commerce (P5) is purely additive: extend the renderer, no table changes needed.

**Intent:** Before writing any new code, produce a written integration map that maps every spec concept to the actual current file, table, route, and pattern in the repository. This prevents duplicating systems that already exist and ensures new code integrates correctly.

**Expected Outcomes:**
- A written `marketplace-current-system-audit.md` file with exact integration points
- A "reuse / extend / new" decision matrix for every spec domain
- A risk register noting blocking decisions (payment processor confirmed as Stripe, merchant-of-record, tax/refund policy, launch currencies)
- Updated task statuses in this plan file

**Todo List:**
1. Read `README.md`, `.env.example` / any config docs to confirm Stripe environment variable names and Connect model (Express vs Standard vs Custom)
2. Read `lib/accounts/account-types.ts` and `lib/services/account-management.service.ts` to map account identity and switching
3. Read `lib/auth/acting-context.ts`, `lib/auth/server.ts`, `lib/services/rbac.service.ts` to map authorization helpers
4. Read `lib/services/epk.service.ts` and `supabase/migrations/20260327150000_artist_epk_settings_active.sql` to map profile section/module system
5. Read `lib/feed/feed-posts-query.ts`, `lib/feed/post-management.ts`, and the posts table schema to map feed post attachment model and confirm whether `content_ref_type` is extensible
6. Read `lib/ticketing/` index and orders to map ticketing source of truth (needed for P4 organization ticket adapter)
7. Read `lib/stripe.ts`, `app/api/stripe/connect/route.ts`, `app/api/marketplace/checkout/route.ts`, `app/api/marketplace/webhook/route.ts` to map the current payment/webhook path and Stripe Connect account type in use
8. Read `lib/services/optimized-notification-service.ts` and `lib/services/notification-delivery.ts` to map notification system
9. Read `lib/messaging/` to map messaging capabilities for service request threads
10. Read existing `supabase/migrations/20260410120000_marketplace_core.sql` and `20260413203708_marketplace_expansion.sql` to map current schema and identify gaps
11. Read `lib/admin/feature-flags/registry.ts` and `lib/marketplace/feature-flags.ts` to map existing feature flag patterns
12. Read `app/api/jobs/` and any jobs-related tables to confirm the service marketplace boundary — document the hard rule that `marketplace_listings` with `listing_kind = 'service'` never writes to or reads from jobs tables
13. Confirm Supabase migration workflow (local vs. remote, type-generation command, `generate_typescript_types` command)
14. Produce written audit and integration map files: `marketplace-current-system-audit.md` and `marketplace-integration-map.md`

**Relevant Context:**
- `lib/accounts/account-types.ts` — canonical account type definitions
- `lib/services/account-management.service.ts` — multi-account service
- `lib/services/epk.service.ts` — profile section/module system
- `lib/feed/feed-posts-query.ts` — post model
- `lib/ticketing/` — ticketing domain
- `lib/stripe.ts` — Stripe client
- `supabase/migrations/20260410120000_marketplace_core.sql` — existing marketplace schema

---

### P1 — Feature Flags and Account Entitlement Resolver

**Status:** `[x] done`

**Intent:** Establish the safety gates that let the marketplace be built behind feature flags (defaulted off), and create a server-side entitlement resolver that enforces account-type rules for every marketplace action.

**Expected Outcomes:**
- A set of marketplace feature flags (minimum: `marketplace_enabled`, `marketplace_public_discovery_enabled`, `marketplace_native_goods_enabled`, `marketplace_services_enabled`, `marketplace_external_listings_enabled`, `marketplace_guest_checkout_enabled`, plus account-type variants)
- A `lib/marketplace/entitlement-resolver.ts` that, given an active account context, returns which listing kinds and service modes are permitted
- All existing marketplace API routes guard-checked against the new flags before doing anything
- All new and existing tests still pass

**Todo List:**
1. Extend `lib/marketplace/feature-flags.ts` with the full flag set, keyed by env vars, all defaulting to `false`/`off`
2. Add a `lib/marketplace/entitlement-resolver.ts` with a `resolveMarketplaceEntitlements(accountType, accountId)` function that returns permitted listing kinds, service modes, and feature gates
3. Add a guard utility `lib/marketplace/require-marketplace-enabled.ts` that checks the global flag and returns a 503 response shape when disabled
4. Update existing API routes (`/api/marketplace/checkout`, `/api/marketplace/listings`, `/api/marketplace/discover`) to call the guard before handling requests
5. Add server-side account-type check to listing create/update (reject `organization` for goods/services, reject music category for all)
6. Write unit tests for the entitlement resolver covering all account types and edge cases

**Relevant Context:**
- `lib/marketplace/feature-flags.ts` — existing (only has merch analytics flag, needs full expansion)
- `lib/admin/feature-flags/registry.ts` — pattern for structured feature flag registry
- `lib/accounts/account-types.ts` — account type constants
- `lib/auth/acting-context.ts` — acting account context resolution
- `docs/marketplace-build/tourify-marketplace-handoff/01-product-requirements.md` §4 — entitlement table
- `docs/marketplace-build/tourify-marketplace-handoff/04-technical-architecture.md` §16 — flag list

---

### P2 — Schema Extension: Listing Kinds, Services, External Listings, and Feed Attachments

**Status:** `[x] done`

**Intent:** Extend the existing marketplace schema with the fields and tables required by the spec that are not yet present. All migrations must be additive and forward-only.

**Expected Outcomes:**
- `marketplace_listings` has `listing_kind` (physical/service/external), `service_mode` (fixed_price/booking_request/quote_request/null), `public_slug`, enhanced status values (paused, sold_out, suspended, archived), `optimistic_version`
- `marketplace_service_definitions` table for service-specific config (lead time, deposit config, availability reference)
- `marketplace_external_listings` table with canonical destination URL, metadata snapshot, domain safety status, link-health check fields
- `marketplace_service_requests` table and `marketplace_service_offers` table for booking/quote workflows
- `marketplace_service_bookings` table for confirmed bookings with calendar event reference
- `marketplace_post_attachments` table (or confirmation that existing `posts.content_ref_type` can be extended)
- `marketplace_ticket_collections` table for organization ticket references
- `marketplace_external_clicks` table for attribution tracking
- `marketplace_fee_rules` table with versioned percentage/fixed rules and effective dates
- `marketplace_checkout_attempts` table with idempotency key
- RLS, indexes, and grants for all new tables
- Types regenerated and compiling

**Todo List:**
1. Audit existing `marketplace_listings` columns against spec — list every gap
2. Write additive migration: add `listing_kind`, `service_mode`, `public_slug`, `optimistic_version`, extend `status` check constraint (paused, sold_out, suspended, archived)
3. Write additive migration: create `marketplace_service_definitions` with FK to `marketplace_listings`
4. Write additive migration: create `marketplace_external_listings` with canonical URL, metadata snapshot, safety status
5. Write additive migration: create `marketplace_service_requests` and `marketplace_service_offers` with versioning
6. Write additive migration: create `marketplace_service_bookings` with calendar event reference FK
7. Determine whether `posts.content_ref_type` can hold 'marketplace_listing' and 'marketplace_store' — if yes, document; if no, write additive `marketplace_post_attachments` migration
8. Write additive migration: create `marketplace_ticket_collections` (store+org reference + existing ticket/event FK)
9. Write additive migration: create `marketplace_external_clicks` attribution table
10. Write additive migration: create `marketplace_fee_rules` with versioned rules and effective dates
11. Write additive migration: create `marketplace_checkout_attempts` idempotency table
12. Add RLS policies, indexes, and minimal Data API grants for every new table
13. Regenerate TypeScript types
14. Run `supabase db push` locally to verify migration chain; run security/performance advisors

**Relevant Context:**
- `supabase/migrations/20260410120000_marketplace_core.sql` — existing marketplace schema baseline
- `supabase/migrations/20260413203708_marketplace_expansion.sql` — expansion baseline
- `docs/marketplace-build/tourify-marketplace-handoff/05-data-security-migrations.md` §3 — full logical table inventory
- `docs/marketplace-build/tourify-marketplace-handoff/05-data-security-migrations.md` §5 — RLS matrix
- `lib/database.types.ts` — generated types file to regenerate after migration

---

### P3 — Storefront and Listing Management (Seller Dashboard)

**Status:** `[x] done`

**Intent:** Build the seller-facing management surfaces: storefront configuration, listing creation (physical, service, external), listing lifecycle management (preview, publish, pause, archive, suspend), and payout status integration. These surfaces are account-context-aware and shared across general, artist, and venue account types.

**Expected Outcomes:**
- Seller dashboard accessible from each account type's dashboard shell, showing store status, listing health, open service requests, payout status
- Storefront creation and settings (name, slug, description, hero media, featured listings, profile module visibility)
- Physical listing editor: type selection, details, media upload, price, variants, inventory, fulfillment, policies, autosave
- Service listing editor: transaction mode selection, scope, lead time, service area, cancellation terms, pricing
- External listing import: SSRF-safe server action fetches metadata, seller reviews/corrects, safe redirect stored
- Listing lifecycle: draft → published → paused / sold_out → archived; suspended by moderation
- Preview modes: hub card, profile module card, listing page, feed share card
- All entitlement checks enforced server-side (organization blocked from goods/services, music category blocked for all)

**Todo List:**
1. Build `lib/marketplace/external-import.ts` — server-only SSRF-safe metadata fetch service (HTTPS-only, private IP rejection, redirect limits, size/timeout limits, Open Graph extraction, domain safety check)
2. Build `lib/marketplace/stored-redirect.ts` — safe external redirect endpoint that reads stored destination only, records attribution, validates domain policy
3. Build server actions / API route handlers for storefront CRUD (create, read, update, set status) with entitlement checks
4. Build server actions for listing CRUD with `listing_kind` and `service_mode` dispatch, entitlement checks, autosave support
5. Build server action for external listing import (calls `external-import.ts`, returns sanitized metadata, stores on confirmation)
6. Build listing lifecycle state transition handlers with `optimistic_version` checks
7. Build seller dashboard page shell for `/artist/store`, `/venue/dashboard/store`, `/dashboard/store` routes using shared components
8. Build Storefront Settings component (name, slug, description, featured listings reorder, profile module toggle)
9. Build Listing Editor component (guided single-page with sections: type/mode, details, media, pricing, availability, fulfillment/policies, preview, publish)
10. Build External Listing Import UI (URL input, loading, review state with imported fields highlighted, manual fallback, publish with fresh redirect safety check)
11. Build Listing List/Table view (status filter, search, type filter, inline actions)
12. Ensure payout status placeholder is visible and links to Stripe Connect onboarding
13. Write tests: entitlement enforcement for all account types, SSRF rejection, listing state transitions

**Relevant Context:**
- `lib/marketplace/seller-payout-readiness.ts` — existing payout readiness check
- `components/marketplace/seller-store-dashboard.tsx` — existing seller dashboard component (audit and extend)
- `components/marketplace/stripe-connect-setup.tsx` — existing Stripe Connect setup
- `app/api/marketplace/listings/route.ts` — existing listings API (audit for gaps)
- `app/api/marketplace/storefront/route.ts` — existing storefront API (audit for gaps)
- `lib/accounts/account-types.ts` — account type constants
- `docs/marketplace-build/tourify-marketplace-handoff/03-ui-ux-specification.md` §7 — listing editor spec
- `docs/marketplace-build/tourify-marketplace-handoff/03-ui-ux-specification.md` §8 — external import UX spec

---

### P4 — Public Storefront, Listing Pages, and Marketplace Hub

**Status:** `[x] done`

**Intent:** Build the buyer-facing public surfaces: the searchable marketplace hub, individual storefront pages with slug routing, and individual listing detail pages. Includes artist music bridge, organization ticket collection integration, and proper public data projections (no drafts, no private data).

**Expected Outcomes:**
- `/marketplace` hub: keyword search, type/category/fulfillment/price/seller-type filters, server-filtered paginated results, URL-preserved state, responsive grid (two-column mobile, four-column desktop)
- `/marketplace/store/[store-slug]` storefront page: header with seller identity, featured collection, category tabs, listing grid, policy drawer, owner bar (private), music bridge for artists
- `/marketplace/listing/[listing-slug]` listing detail: media gallery, title/seller/type/price, variant selector, stock status, fulfillment details, single sticky CTA, description, policies, report action
- External listing detail: persistent "External checkout" badge, provider name/domain, disclosure before redirect, CTA "Continue to [Provider]"
- Service listing detail: transaction mode stated above the fold, appropriate form/CTA
- Organization storefront: ticket collection via read-only adapter to existing ticket domain
- Artist storefront: music bridge module linking to music player (not marketplace listing)
- Profile Marketplace module: extend EPK/profile section system with a `marketplace` section type that shows up to 6 featured listings, quick-view modal (desktop) / bottom sheet (mobile), "View marketplace" CTA
- All loading, empty, error, unavailable, sold-out, and feature-disabled states implemented
- Full-text search backed by Postgres tsvector index
- Public projection never exposes drafts, private data, or moderation internals

**Todo List:**
1. Add Postgres full-text search index to `marketplace_listings` (tsvector over title + description + tags + seller name + category)
2. Build `lib/marketplace/public-listing-query.ts` — public listing query with full-text search, filters (type, category, status=published, moderation=approved, store status=active), cursor pagination
3. Build `lib/marketplace/ticket-source-adapter.ts` — read-only adapter wrapping existing ticket domain (`listEligibleTickets`, `getPurchaseTarget`); never duplicates inventory
4. Refactor `/app/api/marketplace/discover/route.ts` to use the new query lib and return public projections only
5. Build `app/marketplace/store/[store-slug]/page.tsx` — public storefront page with seller header, featured section, category tabs, listing grid, policy drawer. Services displayed here are storefront-only; no link to jobs/staffing is ever shown
6. Build `app/marketplace/listing/[listing-slug]/page.tsx` — listing detail page with media gallery, variant selector, stock status, single sticky CTA, external listing treatment, service listing treatment (mode stated above the fold)
7. Build `lib/marketplace/profile-module.ts` — server helper that loads storefront + up to 6 featured listings for profile module rendering
8. Extend the EPK/profile section system to support a `marketplace` module type (add to section order/visibility, store `store_id` reference in `marketplace_profile_modules` or via existing JSONB config)
9. Build `components/marketplace/profile-marketplace-module.tsx` — the profile module component with quick-view modal (desktop) / bottom sheet (mobile), all visibility states (not configured / draft / active / paused / suspended)
10. Build `components/marketplace/listing-quick-view.tsx` — modal/sheet with media, title, price, seller, availability, CTA
11. Build `components/marketplace/listing-card.tsx` — shared card component with hub, profile, feed, and compact variants
12. Add Open Graph metadata generation for storefront and listing pages (server-side)
13. Build artist music bridge component (links to music player surface, explicitly not a marketplace listing)
14. Build organization ticket collection display (reads from ticket adapter, no native order creation)
15. Ensure `/marketplace?type=&category=&q=` URL state is preserved through filters, back navigation, and pagination
16. Implement all loading skeletons, empty states, permission-denied states, feature-disabled states, and unavailable/sold-out states
17. Run accessibility check (keyboard nav, focus traps in modal/sheet, WCAG contrast, live regions, touch targets)

**Relevant Context:**
- `app/marketplace/page.tsx` — existing hub page (refactor from client-only to server+client hybrid)
- `lib/services/epk.service.ts` — EPK section system (extend to add marketplace module)
- `lib/ticketing/` — existing ticket domain (read-only adapter)
- `lib/public-artist/get-public-artist-profile.ts` — public profile query pattern
- `app/artist/[username]/page.tsx` — public profile route pattern
- `docs/marketplace-build/tourify-marketplace-handoff/03-ui-ux-specification.md` §3–§6 — hub, storefront, profile module, listing detail specs
- `components/marketplace/animated-product-card.tsx` — existing card (audit and replace or extend with shared card)

---

### P5 — Feed Commerce Integration

**Status:** `[x] done`

**Intent:** Attach marketplace listings and storefronts to feed posts using a typed association. Build listing and storefront feed cards that show current listing state and contextually correct CTAs. Preserve seller attribution through reshares. Handle unavailable/suspended listing state in historical posts.

**Expected Outcomes:**
- Feed posts can carry a marketplace attachment (either a specific listing or a storefront)
- Composer shows a "Share to feed" option from listing management and public listing views
- Feed cards render current listing availability (not a static copy of price/title at share time)
- CTAs match listing kind and service mode: Buy now / Request booking / Request quote / Buy on [Provider] / View marketplace
- Reshares preserve original seller attribution (cannot be modified by resharer)
- Deleting a post never deletes a listing/storefront
- Pausing/suspending a listing updates historical card state without deleting the post
- Stable Open Graph URLs for listing and storefront pages

**Todo List:**
1. Decide (from P0 audit) whether to extend `posts.content_ref_type` with `'marketplace_listing'` / `'marketplace_store'` or create `marketplace_post_attachments` table — implement chosen approach
2. Build `lib/marketplace/feed-attachment.ts` — helper to resolve attachment type, load current public projection, and determine correct CTA state for a post attachment
3. Build `components/marketplace/feed-listing-card.tsx` — feed card for a specific listing attachment with dynamic CTA based on current listing state
4. Build `components/marketplace/feed-storefront-card.tsx` — feed card for a storefront share with hero, seller identity, category summary, featured items, and "View marketplace" CTA
5. Add "Share to feed" action to listing management views and public listing detail page
6. Build post composer integration: attach marketplace listing or storefront, show immutable attachment preview, allow caption editing
7. Add `original_seller_id` and `original_store_id` to the attachment record for reshare attribution
8. Build reshare path that copies attachment reference with original attribution preserved
9. Handle unavailable listing state in feed card (disable CTA, show "No longer available" or current status)
10. Add `/api/marketplace/external-redirect/[listing-id]` — safe redirect endpoint (reads stored destination, validates domain, records attribution click, returns 302)
11. Ensure Open Graph metadata is generated for public listing and storefront URLs
12. Write tests: reshare attribution integrity, post delete does not affect listing, listing suspend updates card state

**Relevant Context:**
- `lib/feed/post-management.ts` — post creation/edit
- `lib/feed/feed-posts-query.ts` — post query columns (check if `content_ref_type` can be extended)
- `app/api/feed/posts/route.ts` — feed API
- `docs/marketplace-build/tourify-marketplace-handoff/01-product-requirements.md` §8 — feed commerce requirements
- `docs/marketplace-build/tourify-marketplace-handoff/02-roles-user-flows.md` §13 — feed share flows
- `docs/marketplace-build/tourify-marketplace-handoff/04-technical-architecture.md` §8 — feed integration architecture

---

### P6 — Native Goods Checkout, Guest Flow, and Webhooks

**Status:** `[x] done`

**Intent:** Implement the full native checkout pipeline: server-authoritative order creation with price/fee/inventory validation, Stripe Checkout session, idempotent signed webhook processing, guest checkout with opaque order access, guest order claim, and seller order management (fulfillment, refunds).

**Expected Outcomes:**
- Buyer (guest or authenticated) can complete a native physical or fixed-price service purchase
- Server validates seller eligibility, listing status, price, fee rule, and inventory before creating any order
- `marketplace_checkout_attempts` enforces idempotency (one pending order per key)
- Inventory is reserved during checkout and released on expiry or payment failure
- Fee rule is snapshotted on `marketplace_orders.applied_fee_snapshot`
- Stripe Checkout session created with internal `order_id` in metadata
- Signed webhook (`checkout.session.completed`) is the authoritative confirmation — browser redirect is not
- Duplicate and out-of-order webhook events are safe (idempotent)
- Guest receives confirmation email with opaque, expiring, non-enumerable order access token
- Guest can claim order to Tourify account after email verification
- Seller receives order notification and can view/fulfill/refund from seller dashboard
- All address data restricted to buyer/authorized seller roles
- Finance events emitted to existing analytics/reporting systems

**Todo List:**
1. Extend `marketplace_orders` with: `order_number` (display-safe), `applied_fee_snapshot` (JSONB), `idempotency_key`, `guest_email`, `guest_access_token` (hashed), `guest_access_token_expires_at`, `buyer_user_id` nullable
2. Extend `marketplace_checkout_attempts` with: FK to order, status, normalized input hash, expiry
3. Implement `lib/marketplace/fee-calculator.ts` — load active `marketplace_fee_rules`, apply to subtotal, return fee snapshot
4. Refactor `app/api/marketplace/checkout/route.ts`:
   - Accept idempotency key from client
   - Server-validate: seller eligibility (payout ready), listing status (published, not suspended), inventory, account entitlement
   - Server-calculate price from current listing record (never trust client price)
   - Server-calculate fee from fee rules
   - Create pending order + order items in one transaction
   - Reserve inventory
   - Create Stripe Checkout session with `order_id` in metadata
   - Persist session ID, return checkout URL
5. Add `marketplace_fee_rules` seeding (default 0% fee for initial launch, configurable)
6. Refactor `app/api/marketplace/webhook/route.ts` (built on `lib/marketplace/webhook-handler.ts`):
   - Verify Stripe webhook signature
   - Load from `marketplace_payment_events` — reject already-processed event IDs
   - Insert event record before processing
   - On `checkout.session.completed`: transition order idempotently, release/decrement inventory, send notifications via existing notification service
   - On `payment_intent.payment_failed`: transition order, release inventory reservation
   - On `charge.refunded`: update order and payout ledger
   - Mark event processed
7. Build `app/api/marketplace/order/[guest-token]/route.ts` — opaque guest order access (validate hashed token, return safe order projection without sensitive fields)
8. Build guest order claim endpoint — verify guest email matches order, link `buyer_user_id`, require email verification
9. Build order confirmation page `app/marketplace/order/[guest-token]/page.tsx` with paid/pending/failed state, seller/items/next steps, support action, guest account creation prompt (post-purchase, not pre-purchase)
10. Build seller order management views: order list with status/fulfillment/payment, order detail with address reveal (role-gated), fulfillment update, refund request flow
11. Wire order-paid domain event to existing notification service (buyer confirmation email, seller new order notification)
12. Write tests: price manipulation rejected, duplicate webhook idempotent, guest token non-enumerable, expired checkout releases inventory, seller payout ineligible blocks checkout

**Relevant Context:**
- `app/api/marketplace/checkout/route.ts` — existing checkout route (needs significant refactoring)
- `lib/marketplace/webhook-handler.ts` — existing webhook handler (extend with idempotency, event table, notifications)
- `lib/marketplace/order-lifecycle.ts` — existing order lifecycle helpers
- `lib/marketplace/seller-payout-readiness.ts` — existing payout check
- `lib/marketplace/fees.ts` — existing fees module (audit and extend)
- `lib/stripe.ts` — Stripe client
- `lib/services/optimized-notification-service.ts` — notification service
- `docs/marketplace-build/tourify-marketplace-handoff/04-technical-architecture.md` §5 — checkout sequence
- `docs/marketplace-build/tourify-marketplace-handoff/07-qa-acceptance.md` §7 — checkout acceptance criteria

---

### P7 — Service Transactions: Booking Requests and Quote Requests

**Status:** `[x] done`

**Intent:** Implement the service workflow state machine for booking requests and quote requests. Buyers submit a request; sellers can accept, counter, or decline; quotes are versioned and immutable once sent. Payment occurs after acceptance. Calendar events are created only after confirmed payment.

**Expected Outcomes:**
- Buyer can submit a booking request (date, timezone, location, scope, notes)
- Buyer can submit a quote request (requirements, budget range, desired date, location, attachments)
- Seller can accept, counter, or decline a booking request
- Counter-proposal requires buyer review; prior state is auditable
- Seller can issue a versioned quote with line items, terms, expiration, and deposit/full-payment config
- Prior quote revisions remain readable but cannot be paid after being superseded
- Buyer can accept a specific quote version which triggers checkout creation
- Expired requests and quotes are automatically closed (background job or DB check on read)
- Confirmed booking creates calendar event via existing calendar system (only after accepted+paid state)
- Private request details and attachments are visible only to participants and authorized admins
- Shared timeline shows all state changes for both parties
- Messaging references service requests via existing messaging system

**Todo List:**
1. Build `lib/marketplace/service-state-machine.ts` — defines all valid state transitions for booking and quote workflows, role checks, and optimistic concurrency with `optimistic_version`
2. Build server action handlers for booking workflow: `submitBookingRequest`, `acceptBooking`, `counterBooking`, `declineBooking`, `expireBooking`, `confirmBookingPayment`
3. Build server action handlers for quote workflow: `submitQuoteRequest`, `issueQuote`, `reviseQuote`, `acceptQuote`, `declineQuote`, `expireQuote`, `payQuote`
4. Integrate quote acceptance with checkout creation: accepted quote version is snapshotted on order
5. Build buyer-facing booking request form: date/time picker, timezone, location, scope, notes, attachment upload (via existing private file system)
6. Build buyer-facing quote request form: requirements, budget range, desired date, location, attachments
7. Build seller-facing service request workspace: shared timeline, role-specific actions (accept/counter/decline/issue quote/mark complete), quote line item editor
8. Integrate with existing messaging system — messages can reference a service request thread
9. Build calendar event creation on booking confirmation (call existing calendar API after payment confirmed)
10. Build request expiration job/check — expired requests and quotes transition to `expired` state
11. Implement private attachment handling via existing private file/storage system (signed short-lived URLs, participant-only access)
12. Wire all state transitions to existing notification service (request received, accepted, declined, countered, quote sent, etc.)
13. Write tests: state transition enforcement, expired quote cannot be paid, superseded quote revision cannot be paid, calendar event only after confirmed state, private attachment access denied to non-participants

**Relevant Context:**
- `supabase/migrations/*` — marketplace_service_requests, marketplace_service_offers, marketplace_service_bookings tables from P2
- `lib/messaging/` — messaging system for participant communication
- `docs/marketplace-build/tourify-marketplace-handoff/04-technical-architecture.md` §11 — service workflow architecture
- `docs/marketplace-build/tourify-marketplace-handoff/02-roles-user-flows.md` §10–§11 — booking and quote flows
- `docs/marketplace-build/tourify-marketplace-handoff/07-qa-acceptance.md` §8 — services acceptance criteria

---

### P8 — Admin, Trust, and Operations

**Status:** `[x] done`

**Intent:** Build the admin-facing surfaces for marketplace moderation, category management, fee rule configuration, external domain safety controls, and order/payment exception queues. All admin actions are audited, role-gated, and non-destructive.

**Expected Outcomes:**
- Admin can search storefronts, listings, orders, and service requests
- Admin can suspend a listing or storefront with a reason (does not delete, removes from discovery immediately)
- Admin can restore a suspended listing/storefront (reason and actor are logged)
- Admin can configure the category taxonomy (add, disable, reorder categories)
- Admin can create and version fee rules (percentage and/or fixed, effective dates, account-type overrides)
- Admin can review external domains and disable unsafe redirects
- Admin can view webhook exception queue and manually retry or dismiss failed events
- Finance admin can initiate or review refunds with audit notes
- Moderation actions are never destructive; all produce audit records
- Moderator role cannot perform finance actions and vice versa

**Todo List:**
1. Build `app/admin/marketplace/` route group with: overview/health dashboard, storefront/listing review, orders/payments, reports/moderation, categories, fee rules, external domains, feature flags
2. Build admin overview: payment/webhook error counts, open moderation reports, stuck orders, unsafe external links, restricted sellers
3. Build admin storefront/listing table: search by seller/slug/status, side-panel inspection, suspend/restore action with reason and confirmation dialog
4. Build admin category management: add/disable/reorder categories, ensure taxonomy changes don't invalidate historical listings
5. Build admin fee rules UI: create/version fee rules with percentage/fixed amounts, effective dates, account-type scope; rules apply only to new eligible checkouts
6. Build admin external domain controls: list external domains in use, flag/block unsafe domains, view click attribution by domain
7. Build admin webhook exception queue: list failed webhook events, retry action, dismiss with notes
8. Build admin refund/dispute flow: initiate refund through Stripe, log reason and actor, update order/payout/inventory/notifications idempotently
9. Ensure all admin actions use existing `lib/auth/admin-context.ts` / `lib/auth/admin-capabilities.ts` authorization — never `user_metadata`
10. Write audit records for all sensitive actions (suspension, fee change, refund, domain block) to existing audit system or `marketplace_audit_events`
11. Write tests: moderator cannot perform finance actions, fee change only affects new checkouts, suspension removes from public discovery, restoration logs correctly

**Relevant Context:**
- `lib/auth/admin-context.ts` — admin context detection
- `lib/auth/admin-capabilities.ts` — admin capability checks
- `app/admin/` — existing admin routes (audit for patterns)
- `supabase/migrations/20260414100000_security_linter_step1_forum_mviews_api.sql` — security patterns
- `docs/marketplace-build/tourify-marketplace-handoff/03-ui-ux-specification.md` §12 — admin UX spec
- `docs/marketplace-build/tourify-marketplace-handoff/01-product-requirements.md` §11 — admin requirements

---

### P9 — Hardening, Security Review, and Controlled Rollout

**Status:** `[x] done`

**Intent:** Complete end-to-end security review, accessibility pass, performance validation, regression testing, production migration dry run, and staged rollout (internal → beta sellers → account-type cohorts → public discovery).

**Expected Outcomes:**
- No open critical/high security findings (SSRF, IDOR/BOLA, mass assignment, webhook signature bypass, guest order enumeration, cross-account access, open redirect)
- All RLS allow/deny tests pass for every role: anon, authenticated buyer, each account type and team role, moderator, finance admin, webhook context
- Full-text search hub queries complete within performance budget (indexed, bounded, no N+1)
- WCAG 2.2 AA: keyboard nav, focus traps, contrast, live regions, touch targets
- Production migration dry run shows only expected additive changes — no drops, no truncates
- Feature-disable rollback rehearsed: flags off → marketplace disappears from nav/discovery → existing systems unaffected → no data deleted
- All existing tests (auth, feed, ticketing, music, messaging, notifications) still pass
- Runbook, support scripts, monitoring alerts, and incident response documented
- Controlled rollout via feature flags: internal cohort → beta sellers → account-type cohorts → public discovery

**Todo List:**
1. Run full RLS matrix test for all marketplace tables using each actor role (anon, authenticated, each account type, moderator, finance admin, service role)
2. Security audit: SSRF test suite for external import endpoint, IDOR tests for order/service request access, mass assignment test for checkout (manipulated client price), webhook signature bypass test, guest token enumeration test
3. Test cross-account seller management: authenticated user B cannot manage user A's store/listings
4. Accessibility audit: keyboard navigation of hub/storefront/listing/checkout, focus trap in quick-view modal/booking form, screen reader announcements for status changes, WCAG contrast check
5. Performance audit: hub search with 1000+ listings (check query plan, confirm tsvector index is used), N+1 check on listing cards (seller/media queries batched), profile module does not block profile render
6. Run production migration dry run (`supabase db push --dry-run` or equivalent) — review every statement
7. Compare local migration list to remote migration history — identify any drift
8. Run Supabase security advisors and performance advisors — resolve all flagged items
9. Verify `generate_typescript_types` produces no compile errors
10. Rehearse rollback: disable `marketplace_enabled` flag, verify public discovery routes return feature-disabled state, verify no marketplace data is deleted, verify existing systems continue working
11. Set up monitoring alerts: repeated webhook failures, paid orders stuck in pending, negative inventory, payout restriction events, unsafe external link detection
12. Document support runbook: how to handle stuck orders, refund escalations, webhook replay, seller payout issues
13. Execute staged rollout: enable for internal test accounts → enable for beta seller cohort → enable per account type → enable public discovery

**Relevant Context:**
- `docs/marketplace-build/tourify-marketplace-handoff/07-qa-acceptance.md` — full QA acceptance criteria
- `docs/marketplace-build/tourify-marketplace-handoff/06-implementation-roadmap.md` §8 — hardening phase tasks and gates
- `lib/supabase/service-role-allowlist.ts` — service role allowlist
- `supabase/migrations/20260414120000_security_linter_step3_tighten_rls.sql` — existing RLS tightening patterns
- All existing test suites in `__tests__/` and `tests/`

---

## Dependency Order

```
P0 (Audit) → P1 (Flags + Entitlements) → P2 (Schema) → P3 (Seller dashboard) → P4 (Public hub/storefront/profile) → P5 (Feed commerce) → P6 (Checkout + webhooks) → P7 (Services) → P8 (Admin/trust) → P9 (Hardening + rollout)
```

P6 depends on confirmed Stripe marketplace/Connect model + merchant-of-record decision (blocking decision from P0).  
P7 depends on P6 (shared checkout pipeline).  
P8 can be parallelized with P7 after P5 and P6 gates are met.

---

## Blocking Decisions

| ID | Decision | Status |
|---|---|---|
| `payment_processor` | Stripe is the confirmed payment processor | ✅ Resolved — Stripe; Connect model to be confirmed from code audit in P0 |
| `merchant_of_record` | Who is liable for marketplace transactions | ✅ Resolved — Stripe is merchant of record |
| `services_vs_jobs_boundary` | Marketplace services are storefront/feed only; no overlap with jobs/staffing | ✅ Resolved — `marketplace_listings.listing_kind = 'service'` only; jobs tables untouched |
| `organization_ticket_adapter_phase` | Organization ticket collection phase | ✅ Resolved — P4 (public discovery) |
| `tax_refund_dispute_policy` | Tax collection responsibility, refund of platform fees, chargeback allocation (Stripe as MoR simplifies this) | 🔶 Confirm exact refund fee treatment before P6 live launch |
| `launch_regions_currencies` | Supported countries and currencies at launch | 🔶 Confirm before seller onboarding and checkout activation in P6 |

---

## Non-Destructive Policy (always enforced)

- Never `DROP TABLE`, `TRUNCATE`, `DELETE` production rows, or `supabase db reset --linked`
- Never rewrite an applied migration
- All schema changes are additive (new tables, new nullable columns, new indexes, new policies)
- Rollback = disable feature flags + forward corrective migration if needed
- Local `db reset` only on disposable local databases to verify migration chain

---

## Definition of Done

The marketplace is complete only when:

- [ ] Every permitted account type can perform its approved listing and storefront flows
- [ ] Every prohibited combination is rejected at the server layer (not just UI)
- [ ] Native checkout, external redirect, fixed-price service, booking request, and quote request flows are verified
- [ ] Guest order recovery works without exposing customer or order data
- [ ] Profile and feed integrations use marketplace as a shared source of truth
- [ ] Fees, refunds, payouts, moderation, notifications, and analytics are operational
- [ ] All new tables and storage policies pass security review
- [ ] Full existing test suite still passes
- [ ] Production migration dry run shows only reviewed additive changes
- [ ] Feature-disable rollback is rehearsed without deleting data
