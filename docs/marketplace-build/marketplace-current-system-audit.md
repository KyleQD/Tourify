# Marketplace Current-System Audit

**Date:** P0 Audit (pre-implementation)  
**Non-destructive policy:** No application code or migrations were modified during this audit.  
**Coverage:** Every system the marketplace integrates with was read. File paths, table names, function signatures, and critical observations are exact.

---

## 1. Stripe / Payments

### Files Read

| File | Purpose |
|---|---|
| `lib/stripe.ts` | Stripe client singleton |
| `lib/stripe-connect-resolve.ts` | V1/V2 parallel Connect resolution |
| `lib/marketplace/seller-payout-readiness.ts` | Connect readiness checker |
| `lib/marketplace/stripe-server.ts` | Deprecated shim — delegates to `lib/stripe.ts` |
| `lib/marketplace/fees.ts` | Fee calculation |
| `app/api/marketplace/checkout/route.ts` | Checkout session creation |
| `app/api/marketplace/webhook/route.ts` | Webhook receiver |
| `lib/marketplace/webhook-handler.ts` | Webhook business logic |
| `lib/marketplace/order-lifecycle.ts` | Order/payout state transitions |
| `supabase/migrations/20260413400000_stripe_connect_and_subscriptions.sql` | V1 Connect columns on `profiles` |
| `supabase/migrations/20260415140000_stripe_connect_option_b_parallel.sql` | V2 parallel columns |
| `.env.example` | Environment variable names |

### Key Integration Points

**Stripe client:** `getStripeClient()` → singleton from `STRIPE_SECRET_KEY`. No pinned `apiVersion` — uses SDK default. Also exports deprecated `getStripe()` shim.

**Connect model:** Option B — parallel storage on `profiles`:
- `profiles.stripe_connect_account_id` + kind `v1_express` (legacy Express)
- `profiles.stripe_connect_v2_account_id` + kind `v2` (new V2 Core Accounts)
- `profiles.stripe_connect_account_kind` ∈ `{v1_express, v2, NULL}`  
- `resolveStripeConnectAccountId(profile)` picks V2 when `kind = 'v2'`, otherwise falls back to `stripe_connect_account_id`

**Environment variables (from `.env.example`):**
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_WEBHOOK_SECRET_MARKETPLACE=
```
The webhook route prefers `STRIPE_WEBHOOK_SECRET_MARKETPLACE`, falls back to `STRIPE_WEBHOOK_SECRET`.

**Fee model (`lib/marketplace/fees.ts`):** Hardcoded 10% platform fee on top of seller price. Buyer pays `subtotal + 10%`. Seller receives `subtotal`. Tax passed through as an optional parameter.

**Payment intent data:** Checkout creates `application_fee_amount` + `transfer_data.destination` = seller's Stripe Connect account. This is the Destination Charge pattern (not Separate Charges and Transfers).

### Critical Observations

> **⚠️ CRITICAL — No idempotency table for marketplace webhook**  
> `app/api/marketplace/webhook/route.ts` calls `stripe.webhooks.constructEvent()` (signature verified ✅) but `lib/marketplace/webhook-handler.ts` has **no idempotency check**. It does a naïve `getPaidLifecycleTransition({ currentPaymentStatus })` guard — if the DB update to `payment_status = 'paid'` already succeeded, a second delivery will be skipped, but if the update is in-flight or failed, a second delivery will re-run the full fulfillment chain (inventory decrement, entitlement insert, library upsert). **Duplicate webhooks can cause duplicate fulfillment.** The ticketing V2 system (`supabase/migrations/20260712120000_event_ticketing_foundation.sql`) has the correct pattern: `ticket_stripe_webhook_events` table + unique index on `webhook_event_id`. The marketplace needs the same.

> **⚠️ SECURITY — Checkout trusts client-supplied listing price direction**  
> `app/api/marketplace/checkout/route.ts` fetches `base_price` from DB ✅ and uses `resolvedPrice = Number(variant?.price ?? listing.base_price ?? 0)`. Price is **read from the database, not from the client payload**. This is correct and not a vulnerability. However, `listing.status !== 'published'` is checked by throwing an exception in the `lineItems.map()` block — not before the order/payout ledger rows are created. If a draft listing slips through, orphan order rows will be created before the exception fires. Minor order of operations issue, not critical.

> **ℹ️ Connect model:** Both V1 Express and V2 Core Accounts exist in parallel. Any new seller onboarding code must call `resolveStripeConnectAccountId()` — never read `stripe_connect_account_id` directly. The `getSellerPayoutReadiness()` function handles both branches.

---

## 2. Account Identity

### Files Read

| File | Purpose |
|---|---|
| `lib/accounts/account-types.ts` | Canonical `ProfileType` definitions |
| `lib/services/account-management.service.ts` | Multi-account CRUD and switching |

### Key Integration Points

**ProfileType enum:**  
`'general' | 'artist' | 'service' | 'venue' | 'organization' | 'admin' (legacy) | 'staff' (deprecated)`

**Entity tables:**

| Account type | Table | FK to auth.users |
|---|---|---|
| `general` | `profiles` | `profiles.id = auth.users.id` |
| `artist` / `service` | `artist_profiles` | `artist_profiles.user_id` |
| `venue` | `venue_profiles` | `venue_profiles.user_id` |
| `organization` / `admin` | `organizer_accounts` | `organizer_accounts.user_id`; also accessible via `org_members` |

**Account switching:** `AccountManagementService.switchAccount()` writes to `user_sessions.active_profile_id` / `active_account_type`. The `acting-context.ts` system reads from request headers first, then falls back to this table.

**Profile ID semantics:**
- For `general`: `profileId === userId` (same UUID)
- For entity types: `profileId` = the entity row's UUID (e.g., `artist_profiles.id`)

**Organizer accounts** can be stored two ways (legacy vs. new format):
1. `profiles.account_settings.organizer_accounts[]` (new, array format)
2. `profiles.account_settings.organizer_data` (legacy, single-object format)

### Critical Observation

> **⚠️ IDENTITY GAP — `marketplace_storefronts.seller_user_id` references `auth.users(id)` directly, not the entity profile.**  
> Current schema: `seller_user_id uuid not null references auth.users(id)`.  
> A seller acting as an artist persona has `profileId = artist_profiles.id` (a different UUID than `auth.users.id`). If the marketplace always maps `seller_user_id = auth.users.id`, then all listings/storefronts belong to the raw auth user, not the persona. This means one user's storefront spans all their personas — an artist persona and a venue persona share one storefront.  
>  
> **Decision required (P1):** Should `seller_user_id` remain as `auth.users.id` (one global storefront per user), or should a new `seller_entity_id` + `seller_entity_type` column pair be added to support per-persona storefronts? The spec mentions profile-surface storefronts ("configurable module on seller's public profile"), implying persona-level ownership. See P0 Findings in the plan file.

---

## 3. Authorization Helpers

### Files Read

| File | Purpose |
|---|---|
| `lib/auth/acting-context.ts` | Server-side acting entity resolution |
| `lib/auth/server.ts` | Legacy API-route auth helper |
| `lib/auth/api-auth.ts` | Canonical API-route auth (bearer + cookie) |
| `lib/services/rbac.service.ts` | Tour/org RBAC (separate from acting context) |

### Key Integration Points

**Canonical pattern for marketplace API routes:**

```typescript
// From lib/auth/acting-context.ts
const ctx = await resolveActingContext(request)   // resolves user + entity context
// or
const ctx = await requireActingContext(request, ['artist', 'venue'])  // + type gate
```

**Resolution order for `resolveActingContext`:**
1. `x-acting-profile-id` + `x-acting-account-type` request headers (client sets these on `switchAccount`)
2. `user_sessions` table (`active_profile_id`, `active_account_type`)
3. Fallback: `general` account (safe)

**Ownership verification:** `verifyOwnership()` checks entity tables per account type:
- `artist`/`service` → `artist_profiles.user_id = auth.uid`
- `venue` → `venue_profiles.user_id = auth.uid`
- `organization` → `organizer_accounts.user_id = auth.uid` OR `org_members.role IN ('owner','admin','tour_manager','production')`
- Delegated access: `account_relationships` table with `can_post` permission

**RBAC service (`lib/services/rbac.service.ts`):** Focused on tour/admin domain (roles, permissions, entity grants). Not currently used in marketplace routes. The `acting-context.ts` system is the correct authorization primitive for marketplace.

**Audit trail:** `recordActingSnapshot()` inserts to `acting_context_snapshots` table. Marketplace mutations should call this.

### Critical Observation

> **⚠️ CURRENT MARKETPLACE ROUTES DO NOT USE `resolveActingContext`**  
> The existing `app/api/marketplace/checkout/route.ts` uses `requireApiUser()` (from `lib/api/route-helpers`) which only returns the auth user, not the acting entity context. There is no account-type entitlement check. Any authenticated user can initiate checkout as any account type. P1 must gate every marketplace mutation behind `resolveActingContext` + account-type entitlement checks.

---

## 4. Profile Section / Module System (EPK)

### Files Read

| File | Purpose |
|---|---|
| `lib/services/epk.service.ts` | EPK CRUD service |
| `lib/epk/epk-appearance.ts` | Appearance token system |
| `supabase/migrations/20260327150000_artist_epk_settings_active.sql` | EPK settings table |

### Key Integration Points

**EPK settings table:** `artist_epk_settings`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid → auth.users | One row per user (unique index) |
| `theme` | text | dark / light |
| `template` | text | modern / etc. |
| `is_public` | boolean | |
| `epk_slug` | text | unique when not null |
| `settings` | jsonb | all extended settings |

**Section/module system:** EPK sections and layout are stored inside `settings jsonb`. The `EPKData.layout.sectionOrder` + `layout.sectionVisibility` fields inside `settings` control which sections appear and in what order. There is **no separate sections table** — the entire module config is a JSONB blob inside `artist_epk_settings.settings`.

**Service type:** `EpkService` is a browser-facing class — it uses the browser Supabase client. The profile module system is **artist-only** (tied to `user_id` in `artist_epk_settings`, no `artist_profile_id` FK in the migration, though the service uses `artistProfileId` in the interface).

### Critical Observation

> **ℹ️ PROFILE MODULE APPROACH:** Adding a Marketplace module to the EPK/profile page means either:  
> (a) Adding a `'marketplace'` section key to the `sectionOrder`/`sectionVisibility` map in `artist_epk_settings.settings` JSONB — this is fully additive and requires no migration  
> (b) Adding a dedicated `marketplace_profile_module` table for venue/org profiles that don't use EPK  
>  
> Since EPK is **artist-only**, venue/org profile modules need a separate mechanism. A lightweight `profile_marketplace_module` table (`profile_id`, `entity_type`, `enabled`, `module_config jsonb`) is the cleanest path. No EPK code modification needed.

---

## 5. Feed Post Attachment Model

### Files Read

| File | Purpose |
|---|---|
| `lib/feed/feed-posts-query.ts` | Post select columns and query builder |
| `lib/feed/post-management.ts` | Post ownership/management helpers |
| `supabase/migrations/20260703001228_article_feed_linkage_and_article_updated_at.sql` | `content_ref_type` introduction |
| `supabase/migrations/20260609000100_posts_acting_entity_columns.sql` | `posted_as_profile_id` / `posted_as_type` |

### Key Integration Points

**Posts table columns (from `POST_SELECT_COLUMNS`):**

```
id, user_id, content, media_urls, likes_count, comments_count, shares_count,
is_pinned, created_at, updated_at, type, visibility, location, hashtags,
tagged_users, posted_as_profile_id, posted_as_type, account_display_name,
account_username, account_avatar_url, content_ref_type, content_ref_id,
metadata, poll_ends_at, poll_total_votes
```

**`content_ref_type` / `content_ref_id`:** Added in migration `20260703001228`. Currently used with value `'article'` pointing to `artist_blog_posts.id`. Index `idx_posts_content_ref` exists on `(content_ref_type, content_ref_id)`.

**`content_ref_id` is `uuid`** — all marketplace entity IDs are also UUIDs, so no type conflict.

**`posted_as_profile_id` + `posted_as_type`:** Set when a user posts as an entity persona. Used by `post-management.ts` to determine edit rights.

### Critical Observation

> **✅ `content_ref_type` is directly extensible.** There is no CHECK constraint on `content_ref_type`. Adding `'marketplace_listing'` or `'marketplace_store'` requires only:  
> 1. A migration adding a partial GIN index or tighter constraint (optional)  
> 2. Any `feed-posts-query.ts` caller that renders previews for `'article'` must be extended to also handle `'marketplace_listing'` / `'marketplace_store'`  
>  
> **Decision:** Extend `content_ref_type` with new values and create a `marketplace_post_attachments` view (or join in query) for rich card rendering. No separate join table is required for the MVP (metadata for the card can be fetched by `content_ref_id` from `marketplace_listings` / `marketplace_storefronts`).

---

## 6. Ticketing Source of Truth

### Files Read

| File | Purpose |
|---|---|
| `lib/ticketing/index.ts` | Public exports |
| `lib/ticketing/orders.ts` | `createPendingOrder`, `getEventTicketingConfig` |
| `lib/ticketing/finalize.ts` | `finalizePaidOrder`, `claimWebhookEvent` |
| `lib/ticketing/feature-flag.ts` | `isTicketingV2Enabled()` |
| `lib/ticketing/inventory.ts` | Reservation-based inventory |
| `supabase/migrations/20260712120000_event_ticketing_foundation.sql` | V2 schema |
| `supabase/migrations/20260328130000_ticketing_v2.sql` | Original V2 migration |

### Key Integration Points

**Tables (V2):**
- `event_ticketing_config` — per-event config, owned by `ticketing_owner_type` / `ticketing_owner_id`
- `ticket_types` — ticket product definitions
- `ticket_inventory_reservations` — atomic inventory holds during checkout
- `ticket_sales` — orders (with `webhook_event_id` unique index for idempotency ✅)
- `ticket_stripe_webhook_events` — idempotency claim table ✅

**Feature flag:** `FEATURE_TICKETING_V2` env var. V2 paths are gated behind `isTicketingV2Enabled()`. Currently `false` in `.env.example`.

**Organization ticket collection:** Organizations own ticket configurations via `ticketing_owner_type = 'organization'`. The P4 adapter must query `event_ticketing_config` filtered by `ticketing_owner_type = 'organization'` and `ticketing_owner_id = org.id`, then surface the ticket types as marketplace listings in the discovery hub (read-only — no writes to ticketing tables).

### Critical Observation

> **✅ Ticketing V2 has the correct idempotency pattern** (`ticket_stripe_webhook_events` table + unique index). The marketplace webhook handler must adopt the same pattern.  
>  
> **ℹ️ P4 ticket collection is read-only.** The adapter does NOT create marketplace listings for tickets — it reads existing `ticket_types` from the ticketing domain and displays them in the marketplace hub. No cross-table writes.

---

## 7. Payment / Webhook Path (Security Audit)

### Files Read
Same as section 1 — cross-reference with checkout and webhook routes.

### Findings

| Check | Status | Notes |
|---|---|---|
| Stripe signature verification | ✅ Pass | `stripe.webhooks.constructEvent(body, signature, secret)` called before any business logic |
| Webhook secret env var | ✅ Pass | Prefers `STRIPE_WEBHOOK_SECRET_MARKETPLACE`, falls back to `STRIPE_WEBHOOK_SECRET` |
| Server-side price validation | ✅ Pass | Prices read from DB (`base_price`, `variant.price`) — not from client payload |
| Inventory check before checkout | ✅ Pass | `getInsufficientInventoryItem()` called before Stripe session creation |
| Self-purchase prevention | ✅ Pass | `sellerUserId === user.id` → 400 |
| Single-seller cart enforcement | ✅ Pass | `hasSingleSellerCart()` |
| Idempotency table for webhook | ❌ **Missing** | No `marketplace_stripe_webhook_events` table; re-delivery can cause duplicate fulfillment |
| Status check before order row creation | ⚠️ Minor | `listing.status !== 'published'` check throws inside `lineItems.map()` after order row is already inserted; orphan rows possible |
| Guest checkout | ❌ Not implemented | `buyer_user_id` is nullable in schema but no guest flow exists |

---

## 8. Notification System

### Files Read

| File | Purpose |
|---|---|
| `lib/services/optimized-notification-service.ts` | Canonical notification class |
| `lib/services/notification-delivery.ts` | External channel delivery (Resend, Twilio, Expo) |
| `lib/notifications/account-scope.ts` | Account-scoped notification targeting |

### Key Integration Points

**Notification row columns:** `user_id`, `type` (string), `title`, `content`, `summary`, `metadata` (jsonb), `related_user_id`, `related_content_id`, `related_content_type`, `priority` (low/normal/high/urgent), `expires_at`, `is_read`, `target_profile_id`, `target_account_type`

**Creating a notification:**
```typescript
await OptimizedNotificationService.createNotification({
  userId: recipientUserId,
  type: 'marketplace_order_paid',   // arbitrary string — no enum constraint
  title: 'Order confirmed',
  content: '...',
  metadata: { orderId, listingId },
  relatedContentId: orderId,
  relatedContentType: 'marketplace_order',
  priority: 'normal',
  targetProfileId: sellerProfileId,       // optional — scope to entity inbox
  targetAccountType: 'artist',            // optional
})
```

**Delivery channels:** Resend (email), Twilio (SMS), Expo Push — all via `deliverNotificationOutbound()`. Preference checking via `shouldSendNotification()` before insert.

**Batch notifications:** `createBatchNotifications()` for fan-out scenarios (e.g., notifying a buyer and seller on the same order event).

### Critical Observation

> **✅ Notification system is fully reusable.** New marketplace event types (e.g., `marketplace_order_paid`, `marketplace_booking_received`, `marketplace_quote_requested`) just need new `type` string constants — no schema changes required. The `target_profile_id` + `target_account_type` fields allow routing to entity inboxes.

---

## 9. Messaging System

### Files Read

| File | Purpose |
|---|---|
| `lib/messaging/account-scope.ts` | Account-scoped conversation filtering |
| `lib/messaging/attachments.ts` | Message attachment helpers |
| `lib/messaging/task-link-registry.ts` | Task/workflow thread linking |

### Key Integration Points

**Conversations table columns (inferred from `account-scope.ts`):**
`participant_1`, `participant_2`, `participant_1_profile_id`, `participant_1_account_type`, `participant_2_profile_id`, `participant_2_account_type`

**Account-scoped inboxes:** Entity personas have isolated inboxes. An artist inbox shows only conversations where `participant_N_profile_id = artist_profile_id`. Helpers: `buildConversationInboxOrFilter()`, `applyConversationAccountScope()`.

**Message attachments bucket:** `'message-attachments'` (25 MB limit). Accepts images, audio, PDF, office docs.

**Thread linking:** `lib/messaging/task-link-registry.ts` provides a pattern for linking a conversation to a workflow object (e.g., a service request). The marketplace service request threads can adopt this pattern.

### Critical Observation

> **✅ Messaging system supports entity-scoped threads for service requests.** A service request workflow thread can be implemented as a conversation with `participant_1_account_type = 'general'` (buyer) and `participant_2_account_type = 'artist'` (seller) with `task_link` metadata pointing to the `marketplace_service_requests` row. No messaging schema changes needed for MVP.

---

## 10. Jobs / Staffing Boundary

### Files Read

| File | Purpose |
|---|---|
| `app/api/jobs/route.ts` | Unified jobs facade |

### Key Integration Points

**Jobs facade tables read by `GET /api/jobs`:**
- `artist_jobs` (open gig postings)
- `job_posting_templates` (venue staffing templates)

**Marketplace services are completely isolated:** The jobs facade reads `artist_jobs` and `job_posting_templates`. It has no knowledge of `marketplace_listings`. Marketplace service listings (`listing_kind = 'service'`) live exclusively in the `marketplace_*` table family.

**`POST /api/jobs`** returns 405 — "not enabled yet, use POST /api/artist-jobs".

### Critical Observation

> **✅ Hard boundary confirmed.** `marketplace_listings` with `listing_kind = 'service'` never touch `artist_jobs` or `job_posting_templates`. The services are seller-profile surfaces only. The only shared concept is the `ProfileType` / `posted_by_type` identity model.

---

## 11. Feature Flags

### Files Read

| File | Purpose |
|---|---|
| `lib/admin/feature-flags/registry.ts` | Admin feature flag registry + validator |
| `lib/marketplace/feature-flags.ts` | Marketplace feature flags |

### Key Integration Points

**Admin feature flag pattern** (`lib/admin/feature-flags/registry.ts`):
- Each flag is an object with `key` (versioned, e.g., `admin_ticketing_canonical_v1`), `displayName`, `purpose`, `owner`, `environments`, `safeDefault`, `metrics`, `rollback`, `expiresAt`, `removalIssue`
- Validation via `validateAdminFeatureFlagRegistry()` — enforces naming convention `admin_[name]_v[N]`
- Currently 2 flags: `admin_ticketing_canonical_v1`, `admin_publication_outbox_v1`

**Current marketplace feature flags** (`lib/marketplace/feature-flags.ts`):
```typescript
export function isMarketplaceMerchAnalyticsEnabled() {
  return process.env.NEXT_PUBLIC_MARKETPLACE_MERCH_ANALYTICS === "1"
}
```
Only **one flag exists**. The full suite required by the spec is missing.

**Ticketing flag pattern** (`lib/ticketing/feature-flag.ts`):
```typescript
export function isTicketingV2Enabled(): boolean {
  // reads FEATURE_TICKETING_V2 env var
}
```
Each feature domain has its own env-var-based flag. This is the model to follow.

### Critical Observation

> **⚠️ Feature flag suite is nearly empty.** P1 must create the full suite: `marketplace_enabled`, `marketplace_native_goods_enabled`, `marketplace_services_enabled`, `marketplace_external_listings_enabled`, `marketplace_guest_checkout_enabled`, `marketplace_feed_commerce_enabled`, etc. These should follow the ticketing flag pattern (env-var-based, per-domain, with `isXxxEnabled()` guards used in every API route).  
>  
> **Admin-registry flags** use the `admin_[name]_v[N]` naming convention and are for org-scoped rollouts. Marketplace domain flags should use the simpler env-var pattern.

---

## 12. Supabase Workflow

### Key Integration Points

**Local config:** `supabase/config.toml` — project ID `tourify-beta`, API port 54321, DB port 54322, Postgres major version 15.

**Migration naming convention:** `YYYYMMDDHHMMSS_snake_case_description.sql`  
Examples from the migration chain:
- `20260410120000_marketplace_core.sql`
- `20260413203708_marketplace_expansion.sql`
- `20260415140000_stripe_connect_option_b_parallel.sql`

**Type generation command:** No `generate:types` script in `package.json`. The MCP `generate_typescript_types` tool (Supabase MCP server) or `supabase gen types typescript --project-id=...` CLI is the intended method. Types live at `lib/database.types.ts`.

**Non-destructive policy:** All migrations use `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ON CONFLICT DO NOTHING`. Never `DROP TABLE`, `TRUNCATE`, or `ALTER COLUMN` destructively.

**Test scripts:** `npm run test:marketplace-smoke` (`scripts/marketplace-smoke-test.ts`) exists for marketplace validation.

---

## 13. Current Marketplace Schema

### Tables (from migrations)

| Table | Source Migration | Key Columns |
|---|---|---|
| `marketplace_storefronts` | `20260410120000` | `id`, `seller_user_id → auth.users`, `slug`, `display_name`, `tagline`, `theme_config jsonb`, `sections jsonb`, `rating_average`, `is_active` |
| `marketplace_listings` | `20260410120000` | `id`, `seller_user_id → auth.users`, `storefront_id`, `title`, `product_type`, `category`, `status`, `currency`, `base_price`, `cover_image_url`, `metadata jsonb`, `moderation_status` |
| `marketplace_listing_variants` | `20260410120000` | `id`, `listing_id`, `sku`, `title`, `option_values jsonb`, `price`, `inventory_count` |
| `marketplace_orders` | `20260410120000` | `id`, `buyer_user_id` (nullable), `seller_user_id`, `status`, `payment_status`, `stripe_checkout_session_id`, `currency`, amounts, `shipping_address jsonb` |
| `marketplace_order_items` | `20260410120000` | `id`, `order_id`, `listing_id`, `variant_id`, `product_type`, `quantity`, `unit_price`, `line_total`, `fulfillment_status`, `service_status`, `metadata jsonb`, `music_track_id` |
| `marketplace_entitlements` | `20260410120000` + `20260410183000` | `id`, `order_item_id`, `buyer_user_id`, `listing_id`, `music_track_id`, `asset_url`, `signed_url`, `max_downloads`, `status` |
| `marketplace_payout_ledger` | `20260410120000` | `id`, `order_id`, `seller_user_id`, `gross_amount`, `platform_fee_amount`, `net_amount`, `payout_status`, `payout_reference`, `payout_provider` |
| `marketplace_moderation_queue` | `20260410120000` | `id`, `listing_id`, `order_id`, `reason`, `status`, `assigned_admin_id`, `resolution` |
| `marketplace_service_milestones` | `20260410120000` | `id`, `order_item_id`, `title`, `due_at`, `status`, `revision_limit`, `delivered_at` |
| `marketplace_integrations` | `20260410120000` + `20260704224927` | `id`, `seller_user_id`, `provider`, `token_envelope jsonb`, `external_shop_domain`, `status` |
| `marketplace_integration_products` | `20260704224927` | `id`, `integration_id`, `seller_user_id`, `provider`, `external_product_id` |
| `marketplace_integration_sync_runs` | `20260704224927` | sync run tracking |
| `marketplace_provider_webhook_events` | `20260704224927` | provider webhook deduplication |
| `marketplace_fulfillment_requests` | `20260704224927` | Printful/fulfillment job tracking |
| `user_music_library` | `20260410183000` | `buyer_user_id`, `music_track_id`, `order_item_id` — unique on `(buyer_user_id, music_track_id)` |

**Columns added to `marketplace_listings` post-core:**
- `music_track_id` (→ `artist_music`), `license_type`, `rights_confirmed` (music commerce)
- `integration_id`, `source_provider`, `external_product_id`, `fulfillment_provider`, `fulfillment_profile jsonb` (integrations hardening)

**Columns added to `marketplace_storefronts` post-core:**
- `external_links jsonb`, `seller_type text`, `accepted_seller_agreement_at`, `seller_agreement_version`

### What Is Missing (vs. spec)

| Missing | Description |
|---|---|
| `marketplace_listings.listing_kind` | `'physical' \| 'service' \| 'external'` column not in any migration |
| `marketplace_listings.service_mode` | `'fixed_price' \| 'booking_request' \| 'quote_request'` not present |
| `marketplace_listings.destination_url` | External listing redirect URL not present |
| `marketplace_service_requests` | Service workflow state machine table — does not exist |
| `marketplace_fee_rules` | Per-category or per-seller fee override table — does not exist |
| `marketplace_categories` | Structured category table — does not exist (category is free-text on listings) |
| `marketplace_stripe_webhook_events` | Idempotency claim table for marketplace webhooks — does not exist |
| `profile_marketplace_module` | Profile-level marketplace module config — does not exist |
| `content_ref_type = 'marketplace_listing'` / `'marketplace_store'` | Not yet used in posts table |
| Full-text search index on `marketplace_listings` | No `tsvector` column or `GIN` index |
| Storefront slug routing | Schema has `slug` column, but no `/marketplace/store/[slug]` route exists |

### Storage Buckets

**Existing buckets (from `20260413000000_comprehensive_storage_setup.sql`):**
`avatars`, `post-media`, `venue-media`, `event-media`, `documents`, `portfolio`, `artist-videos`, `artist-documents`, `artist-merchandise` (public, images)

**No marketplace-specific storage bucket exists.** The `artist-merchandise` bucket (public images, 10 MB) could serve listing cover images, but a dedicated `marketplace-listings` bucket is preferable for RLS isolation and lifecycle management.

---

## Summary: Key Questions Answered

| Question | Answer |
|---|---|
| `marketplace_storefronts.seller_user_id` = auth user or entity? | **Raw auth user (`auth.users.id`)** — not entity profile. One storefront per auth user, not per persona. |
| Does `acting_entity_id` / acting context exist? | **Yes** — `resolveActingContext()` in `lib/auth/acting-context.ts`. Headers: `x-acting-profile-id` + `x-acting-account-type`. Session table: `user_sessions`. |
| Can `content_ref_type` be extended? | **Yes** — no CHECK constraint. Add `'marketplace_listing'` / `'marketplace_store'` freely. |
| Does checkout validate price server-side? | **Yes** — reads from DB. Not a vulnerability. |
| Does webhook use idempotency table? | **No** — this is a critical gap. |
| Existing marketplace media buckets? | **No dedicated bucket.** `artist-merchandise` exists but is not scoped. New `marketplace-listings` bucket needed. |
