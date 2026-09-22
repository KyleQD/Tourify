# Marketplace Integration Map

**Phase:** P0 — System Audit  
**Decision Matrix:** "Reuse / Extend / New" for every spec concept mapped against what exists

---

## How to Read This Table

| Decision | Meaning |
|---|---|
| **Reuse** | The existing system can be called as-is. No changes to any existing file or table. |
| **Extend** | The existing system covers ~70 %+ of the need but requires additive changes (new column, new flag value, new route parameter). No destructive changes. |
| **New** | Nothing exists. A new table, file, or service must be created from scratch. |

---

## Decision Matrix

### A. Storefront Identity

| Spec Concept | Current System | Decision | Notes |
|---|---|---|---|
| Storefront creation | `marketplace_storefronts` table + `POST /api/marketplace/storefront/` | **Extend** | Schema exists. Must add `seller_entity_id uuid` + `seller_entity_type text` columns to support per-persona storefronts (or document the decision to keep one storefront per auth user). RLS must be updated to allow acting-context ownership. |
| Storefront slug routing (`/marketplace/store/[slug]`) | `marketplace_storefronts.slug` column exists; no route file | **New** | Route file `app/marketplace/store/[slug]/page.tsx` does not exist. Slug column is present and unique-indexed. |
| Seller identity on storefront | `seller_user_id → auth.users` | **Extend** | See Identity Gap in audit. Decision: add `seller_entity_id` + `seller_entity_type` or document one-per-user model. |
| Seller agreement acceptance | `marketplace_storefronts.accepted_seller_agreement_at` + `.seller_agreement_version` | **Reuse** | Columns added in `20260413203708`. `POST /api/marketplace/seller-agreement/` route exists. |
| Seller type label | `marketplace_storefronts.seller_type` | **Reuse** | Column exists. Values `artist | venue | photographer | etc.` |
| Per-account-type entitlement gate | `resolveActingContext()` + `requireActingContext()` | **Extend** | Authorization helpers exist. P1 must add entitlement resolver that maps `accountType` → allowed listing kinds. Currently not called by any marketplace route. |

---

### B. Listing Kinds

| Spec Concept | Current System | Decision | Notes |
|---|---|---|---|
| Physical goods listings | `marketplace_listings.product_type = 'physical'` (free-text) | **Extend** | Column exists but no CHECK constraint enforces kinds. P2 adds `listing_kind` column (`'physical' \| 'service' \| 'external'`) with CHECK constraint and backfills `product_type = 'physical'` rows. |
| Digital asset listings | `marketplace_listings.product_type = 'digital_asset'` | **Reuse** | Existing path. Music track linkage via `music_track_id`. |
| Merch (music) listings | `marketplace_listings`, `artist_music`, `user_music_library` | **Reuse** | Full flow implemented including entitlement delivery and `user_music_library`. |
| `listing_kind` column | Not present | **New** | Migration needed: `ALTER TABLE marketplace_listings ADD COLUMN listing_kind text`. |
| Listing slug routing (`/marketplace/listing/[slug]`) | No slug column on `marketplace_listings`, no route | **New** | Add `slug text unique` column to `marketplace_listings`. Create route file. |
| Listing status gates | `status IN ('draft','published','archived')` CHECK constraint | **Reuse** | Existing constraint. |
| Listing moderation | `marketplace_listings.moderation_status`, `marketplace_moderation_queue` | **Reuse** | Schema exists. No admin UI yet (P8). |
| Variant pricing / inventory | `marketplace_listing_variants` | **Reuse** | Table exists with `price`, `inventory_count`, `fulfillment_provider`, `option_values jsonb`. |
| Integration-synced listings (Shopify, Printful) | `marketplace_integrations`, `marketplace_integration_products` | **Reuse** | Tables and `shopify-adapter.ts`, `printful-adapter.ts` exist. |
| Full-text search | No `tsvector` / GIN index | **New** | P4: add `search_vector tsvector` column + GIN index + trigger. |

---

### C. Service Listings

| Spec Concept | Current System | Decision | Notes |
|---|---|---|---|
| `service_mode` column (`fixed_price \| booking_request \| quote_request`) | Not present | **New** | P2 migration: `ADD COLUMN service_mode text`. |
| Fixed-price service checkout | Existing checkout route + `product_type = 'service'` in order items | **Extend** | `service_status` column exists on `marketplace_order_items`. Checkout route works. Needs entitlement/milestone gate for service orders. |
| Booking request workflow | `booking_requests` table exists for venue bookings (separate domain) | **New** | `marketplace_service_requests` table does not exist. P7: create new table with state machine. Must NOT use `venue_booking_requests` — those are venue scheduling. |
| Quote request workflow | Not present | **New** | P7: `marketplace_service_requests` with `request_type = 'quote'`. Offer versions: `marketplace_service_request_offers` or JSONB on the request row. |
| Service milestone tracking | `marketplace_service_milestones` | **Reuse** | Table exists (`order_item_id`, `status`, `revision_limit`, `delivered_at`). |
| Service/jobs hard boundary | Confirmed isolated — `artist_jobs`, `job_posting_templates` never referenced | **Reuse** | No changes. Boundary is enforced by schema design. |

---

### D. External Listings

| Spec Concept | Current System | Decision | Notes |
|---|---|---|---|
| External listing type | `listing_kind = 'external'` column not present | **New** | Requires P2 `listing_kind` column. |
| Destination URL (redirect) | No `destination_url` column on `marketplace_listings` | **New** | P2: `ADD COLUMN destination_url text`. |
| SSRF-safe URL import | No import service | **New** | P2: `lib/marketplace/external-listing-importer.ts` — metadata fetch with allowlist validation. |
| Stored-destination redirect route | No redirect route | **New** | P2: `app/api/marketplace/listings/[id]/redirect/route.ts` — validates `listing_kind = 'external'`, logs click, returns 301. |

---

### E. Service Request Workflow

| Spec Concept | Current System | Decision | Notes |
|---|---|---|---|
| Service request table | Does not exist | **New** | P7: `marketplace_service_requests` with state machine columns. |
| Offer versioning | Does not exist | **New** | P7: `marketplace_service_request_offers` or JSONB offers array on request row. |
| Service request messaging thread | `conversations` table + `lib/messaging/account-scope.ts` | **Extend** | Link conversation to service request via `task_link` metadata (same pattern as `lib/messaging/task-link-registry.ts`). |
| Service request notifications | `OptimizedNotificationService` | **Reuse** | Add new `type` strings: `marketplace_booking_received`, `marketplace_quote_received`, `marketplace_offer_sent`. No schema change. |

---

### F. Checkout and Payments

| Spec Concept | Current System | Decision | Notes |
|---|---|---|---|
| Stripe Checkout session creation | `app/api/marketplace/checkout/route.ts` | **Extend** | Works for physical/digital. Must be extended for service/external listing guards (`listing_kind` check). Must move status check before order row insertion. |
| Server-side price validation | ✅ Already reads from DB | **Reuse** | No change needed. |
| Connect V1/V2 resolution | `resolveStripeConnectAccountId()` | **Reuse** | Handles both branches. |
| Payout ledger | `marketplace_payout_ledger` | **Reuse** | Table and inserts work. |
| Fee calculation | `calculateMarketplaceFeeBreakdown()` | **Extend** | Hardcoded 10%. P8 `marketplace_fee_rules` table needed for per-category overrides. For MVP, reuse as-is. |
| Webhook signature verification | `stripe.webhooks.constructEvent()` | **Reuse** | Already implemented. |
| **Webhook idempotency** | **Missing** | **New** | **CRITICAL.** P6: `marketplace_stripe_webhook_events` table with unique index on `stripe_event_id`. Pattern: copy `ticket_stripe_webhook_events` from `20260712120000`. |
| Guest checkout | Schema supports it (`buyer_user_id nullable`) | **New** | P6: guest order claim flow. Session token + `/claim?token=` route. |
| Order status transitions | `lib/marketplace/order-lifecycle.ts` | **Reuse** | Functions `getPaidLifecycleTransition`, `getFailedPaymentPatch`, `getRefundPatch` are correct. |

---

### G. Webhooks

| Spec Concept | Current System | Decision | Notes |
|---|---|---|---|
| Webhook route | `app/api/marketplace/webhook/route.ts` | **Extend** | Signature verification ✅. Needs idempotency table claim before business logic. |
| `checkout.session.completed` handler | `handleCheckoutSessionCompleted()` | **Extend** | Add idempotency claim at top. Add service-order state transition for `product_type = 'service'`. |
| `payment_intent.payment_failed` handler | `handlePaymentIntentFailed()` | **Reuse** | Works. |
| `charge.refunded` handler | `handleChargeRefunded()` | **Reuse** | Works. |
| Inventory decrement on payment | `decrementInventoryForOrder()` | **Reuse** | Works. Must be idempotent after idempotency claim is added. |
| Digital entitlement delivery | `ensureDigitalEntitlements()` | **Reuse** | Works. Already checks for existing entitlement before insert. |
| Printful fulfillment trigger | `ensurePrintfulFulfillmentRequests()` | **Reuse** | Works. |

---

### H. Profile Marketplace Module

| Spec Concept | Current System | Decision | Notes |
|---|---|---|---|
| Artist EPK section system | `artist_epk_settings.settings jsonb` with `sectionOrder` / `sectionVisibility` | **Extend** | Add `'marketplace'` to allowed section keys. No schema migration required — purely JSONB. |
| Venue/org profile module | No equivalent of EPK for venues/orgs | **New** | New table `profile_marketplace_module (id, entity_id, entity_type, enabled, module_config jsonb)`. Allows venue and org profiles to show a marketplace section. |
| Artist storefront page on profile | No `/artist/[slug]/store` route | **New** | P3: create page that reads `marketplace_storefronts` by `seller_user_id` linked to artist profile. |

---

### I. Feed Commerce Integration

| Spec Concept | Current System | Decision | Notes |
|---|---|---|---|
| `content_ref_type` extension | `posts.content_ref_type text` (no CHECK) + index `idx_posts_content_ref` | **Extend** | Add `'marketplace_listing'` and `'marketplace_store'` as valid values. No migration needed (no constraint). Update feed rendering in P5. |
| `content_ref_id` (UUID) | `posts.content_ref_id uuid` | **Reuse** | UUID type is compatible with marketplace IDs. |
| Marketplace listing post card | No renderer component | **New** | P5: `components/feed/marketplace-listing-card.tsx` — reads `marketplace_listings` by `content_ref_id`. |
| Marketplace store post card | No renderer component | **New** | P5: `components/feed/marketplace-store-card.tsx` — reads `marketplace_storefronts` by `content_ref_id`. |
| `marketplace_post_attachments` separate table | Not needed for MVP | **Skip** | The `content_ref_type`/`content_ref_id` pattern is sufficient. A join table adds complexity with no benefit for the initial implementation. |
| Share listing to feed | No route | **New** | P5: `POST /api/marketplace/listings/[id]/share-to-feed` — creates a post with `content_ref_type = 'marketplace_listing'`. |

---

### J. Organization Ticket Collection (P4)

| Spec Concept | Current System | Decision | Notes |
|---|---|---|---|
| Ticket type read model | `ticket_types`, `event_ticketing_config` tables | **Reuse** | Tables exist. Read-only adapter. |
| Org ticket discovery in hub | No marketplace discovery adapter for tickets | **New** | P4: `lib/marketplace/ticket-collection-adapter.ts` — queries `event_ticketing_config WHERE ticketing_owner_type = 'organization' AND ticketing_owner_id = ?` + joins `ticket_types`. Returns a normalized "virtual listing" shape for the hub. No writes to ticketing tables. |
| Feature flag gate | `isTicketingV2Enabled()` | **Reuse** | Gate ticket collection behind V2 flag. |

---

### K. Notifications

| Spec Concept | Current System | Decision | Notes |
|---|---|---|---|
| Notification creation | `OptimizedNotificationService.createNotification()` | **Reuse** | Works as-is. |
| Account-scoped routing | `target_profile_id` + `target_account_type` columns | **Reuse** | Already supported. |
| New marketplace event types | None defined | **Extend** | Add string constants in `lib/marketplace/notification-events.ts` (new file): `MARKETPLACE_ORDER_PAID`, `MARKETPLACE_BOOKING_RECEIVED`, etc. No schema change. |
| Batch fan-out | `OptimizedNotificationService.createBatchNotifications()` | **Reuse** | Available for buyer+seller simultaneous notification. |

---

### L. Fee Rules

| Spec Concept | Current System | Decision | Notes |
|---|---|---|---|
| Platform fee calculation | `calculateMarketplaceFeeBreakdown()` — hardcoded 10% | **Extend (P8)** | For MVP (P6), reuse as-is. P8 adds `marketplace_fee_rules` table for per-category or per-seller overrides. `calculateMarketplaceFeeBreakdown()` updated to accept an optional rule override. |
| Tax calculation | Placeholder `taxAmount = 0` in fee breakdown | **New (P8)** | Tax service integration or admin-configurable rate. Out of scope for P0–P6. |

---

### M. Admin and Moderation

| Spec Concept | Current System | Decision | Notes |
|---|---|---|---|
| Moderation queue table | `marketplace_moderation_queue` | **Reuse** | Table exists with `listing_id`, `order_id`, `reason`, `status`, `assigned_admin_id`. |
| Admin moderation UI | No admin page | **New (P8)** | Admin marketplace moderation page. |
| Admin categories management | `marketplace_listings.category` is free-text | **New (P8)** | `marketplace_categories` table. |
| Admin fee rule management | Not present | **New (P8)** | `marketplace_fee_rules` table + admin UI. |
| Admin domain controls | Not present | **New (P8)** | Admin page to toggle marketplace feature flags per org/user. |

---

### N. Feature Flags

| Spec Concept | Current System | Decision | Notes |
|---|---|---|---|
| `isMarketplaceMerchAnalyticsEnabled()` | Exists in `lib/marketplace/feature-flags.ts` | **Reuse** | |
| `marketplace_enabled` | Not present | **New (P1)** | Env var `FEATURE_MARKETPLACE=true/false`. |
| `marketplace_native_goods_enabled` | Not present | **New (P1)** | Env var. |
| `marketplace_services_enabled` | Not present | **New (P1)** | Env var. |
| `marketplace_external_listings_enabled` | Not present | **New (P1)** | Env var. |
| `marketplace_guest_checkout_enabled` | Not present | **New (P1)** | Env var. |
| `marketplace_feed_commerce_enabled` | Not present | **New (P1)** | Env var. |
| `marketplace_organization_tickets_enabled` | Not present | **New (P1)** | Env var. |
| Admin-registry flag for marketplace | 2 flags exist (ticketing, publication outbox) | **Extend (P1)** | Add `marketplace_seller_onboarding_v1` to admin registry for org-scoped rollout. |

---

### O. Storage

| Spec Concept | Current System | Decision | Notes |
|---|---|---|---|
| Listing cover images | `artist-merchandise` bucket (public, images) | **Extend** | Could reuse `artist-merchandise` for MVP. Recommended: create dedicated `marketplace-listings` bucket (public, images, 10 MB) for clean RLS isolation and future lifecycle policies. |
| Listing media gallery | Same as above | **Extend** | Same bucket recommendation. |
| Digital asset storage | `portfolio` bucket (private, 50 MB) | **Extend** | Reuse `portfolio` for digital downloads OR create dedicated `marketplace-assets` (private) for sharper access policies. |
| Service request attachments | `message-attachments` bucket | **Reuse** | Already configured for DMs. Service request threads will use the same bucket via `lib/messaging/attachments.ts`. |
| Storefront banner images | `artist-merchandise` or `venue-media` | **Extend** | Include marketplace banners in the new `marketplace-listings` bucket or allow `post-media`. |

---

## Summary Counts

| Decision | Count |
|---|---|
| **Reuse** | 22 |
| **Extend** | 18 |
| **New** | 22 |

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| **Webhook duplicate fulfillment** (no idempotency table) | 🔴 Critical | P6 must add `marketplace_stripe_webhook_events` table before any production traffic. Pattern is proven in ticketing V2. |
| **`seller_user_id` = auth user vs. entity persona** | 🔴 Critical | P1 decision required. If per-persona storefronts are needed, P2 migration adds `seller_entity_id` + `seller_entity_type`. If one-per-user is acceptable, document it and update authorization to match. This decision gates the entire identity model. |
| **No feature flag gates in API routes** | 🟠 High | P1 must add flag checks to every marketplace mutation route before P2 work lands. Without gates, schema-incomplete routes can be reached in production. |
| **`resolveActingContext` not used in marketplace routes** | 🟠 High | P1 must refactor checkout, listings, storefront, and orders routes to use `resolveActingContext` + account-type entitlement checks. |
| **No full-text search on listings** | 🟡 Medium | P4 deliverable. Discovery hub currently does ILIKE queries. Add `tsvector` + GIN index in P4 migration. |
| **No guest checkout path** | 🟡 Medium | P6 deliverable. `buyer_user_id` is nullable in schema — foundation exists. Need guest token + claim flow. |
| **Tax collection** | 🟡 Medium | `taxAmount = 0` hardcoded. No tax service. Acceptable for launch in jurisdictions without marketplace facilitator laws. Must be resolved before international expansion. |
| **`listing_kind = 'service'` isolation from `venue_booking_requests`** | 🟢 Low | Boundary is clean — confirmed by code audit. No risk of accidental cross-domain write. |
