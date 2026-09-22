# Data, Security, and Additive Migration Plan

## 1. Absolute Database Safety Rules

Marketplace implementation must never:

- Run a reset against a linked or production database.
- Drop or truncate existing tables, schemas, buckets, functions, views, policies, triggers, or data.
- Recreate the database to make migrations pass.
- Rewrite applied production migrations.
- Rename or change semantics of existing columns without a separately reviewed compatibility plan.
- Delete production rows as part of seeding or cleanup.
- Use destructive cascade behavior against existing Tourify domains.
- expose service-role/secret keys to browser code.

All changes use reviewed, forward-only, additive migrations. Local database reset may be used only against a disposable local database to verify the full migration chain.

## 2. Schema Integration Rule

The following names are a logical model. Before creating anything, the agent must map every concept to current schema:

- Reuse current account/entity identifiers.
- Reuse ticket, event, post, profile-layout, message, calendar, notification, audit, media, and payment records where they are authoritative.
- Add join/reference tables instead of copying domain data.
- Extend an existing table only when the new nullable column has a clear compatibility case and no existing extension table is more appropriate.
- Prefer marketplace-specific tables for new behavior so rollout can be isolated.

## 3. Logical Table Inventory

### Storefront and Ownership

#### `marketplace_stores`

- `id`
- authoritative owner/account reference
- `slug`
- `name`
- `description`
- `status`: draft/active/paused/suspended
- visual/policy configuration
- `created_by`, `created_at`, `updated_at`
- suspension metadata or reference

Constraints:

- One storefront per authoritative account identity.
- Organization-owned storefront is ticket-only.
- Slug uniqueness uses current canonicalization conventions.

#### `marketplace_store_members` (only if current account roles cannot express permissions)

- `store_id`
- existing account membership/user reference
- role/capabilities

Do not create this table if current team permissions can be reused.

#### `marketplace_profile_modules`

Use only if the existing profile section system cannot store a typed storefront reference.

- profile/account reference
- `store_id`
- visibility, ordering, layout variant

### Listings

#### `marketplace_listings`

- `id`, `store_id`
- `listing_kind`: physical/service/external
- `service_mode`: fixed_price/booking_request/quote_request/null
- title, description, category reference, tags
- public slug
- status: draft/published/paused/sold_out/suspended/archived
- price presentation and currency
- service area/remote flags
- handling/lead-time data
- policy snapshot/reference
- publication and audit timestamps
- optimistic version number

Use text plus check constraints if project conventions favor flexible migrations; do not introduce Postgres enums blindly.

#### `marketplace_listing_media`

- `listing_id`
- media reference/storage path
- order, alt text, focal/crop metadata

#### `marketplace_listing_variants`

- `listing_id`
- SKU
- option values
- authoritative price delta/price
- status

#### `marketplace_inventory`

- listing or variant reference
- on-hand, reserved, available
- version/updated timestamp

Inventory mutations must be transactional and protected from overselling.

#### `marketplace_external_listings`

- `listing_id`
- canonical destination URL
- provider/domain
- imported metadata snapshot
- last checked time/status
- seller confirmation time
- safety/review status

External URLs are never accepted from the request at redirect time; only stored, approved destinations are used.

#### `marketplace_service_definitions`

- `listing_id`
- transaction mode
- lead time
- duration or range
- request schema/config
- deposit/full-payment configuration
- availability integration reference

### Storefront Merchandising

#### `marketplace_featured_listings`

- `store_id`, `listing_id`, order

#### `marketplace_categories`

- hierarchical name/slug
- enabled account/listing types
- moderation/search metadata

Admin taxonomy updates must not invalidate historical listing records.

### Checkout, Order, and Payment

#### `marketplace_orders`

- internal UUID
- display-safe order number
- `store_id`
- authenticated buyer reference nullable
- guest email snapshot
- status
- currency and monetary totals in integer minor units
- applied fee-rule snapshot
- payment/fulfillment state
- created/updated/paid timestamps

#### `marketplace_order_items`

- order and listing/variant reference
- immutable title, options, quantity, unit price, seller/policy snapshots

Order history must remain readable if a listing is edited or archived.

#### `marketplace_order_addresses`

- order reference
- encrypted/protected normalized address fields as supported by the existing security model
- address purpose

Never include address fields in public projections, search indexes, logs, or analytics payloads.

#### `marketplace_checkout_attempts`

- idempotency key
- order/session reference
- normalized input hash
- expiration and status

#### `marketplace_payments`

- order reference
- provider and protected provider object IDs
- amount/status
- reconciliation timestamps

#### `marketplace_payment_events`

- unique provider event ID
- event type
- processing status/attempts/error
- received/processed timestamps
- protected minimal payload or object reference according to current compliance policy

#### `marketplace_fee_rules`

- versioned percentage/fixed rule
- scope and precedence
- effective date
- active status

Historical orders store the applied fee snapshot.

#### `marketplace_fulfillments`

- order/item reference
- method/status
- carrier/tracking if used
- timestamps and notes

### Services

#### `marketplace_service_requests`

- listing, store, buyer/guest references
- mode
- current status/version
- scope, location, proposed dates
- privacy-safe summary

#### `marketplace_service_request_participants`

Use if guest/authenticated/seller/team access cannot be derived cleanly.

#### `marketplace_service_offers`

- request reference
- immutable revision number
- created by
- line items, terms, expiration, deposit/full-payment configuration
- status

#### `marketplace_service_bookings`

- request/accepted offer/order reference
- confirmed interval/timezone/location
- existing calendar-event reference
- status

Attachments should reference the existing private file system where possible.

### Integrations

#### `marketplace_post_attachments`

- existing post reference
- exactly one listing or store reference
- original seller/store attribution

Create only if the existing typed attachment model cannot be extended additively.

#### `marketplace_ticket_collections`

- store/organization reference
- existing ticket/event/ticket-type reference
- display order/featured state

No duplicated ticket inventory, price, order, or QR data.

#### `marketplace_external_clicks`

- listing reference
- source surface and campaign
- privacy-safe viewer/session identifier
- timestamp

Use retention and aggregation controls; do not collect unnecessary personal data.

#### `marketplace_audit_events`

Prefer the current Tourify audit system. If absent, store actor, action, subject, before/after-safe metadata, reason, and timestamp.

## 4. Public Projection

Public reads should expose a minimal projection containing:

- Public storefront identity.
- Published listing content.
- Current public price presentation.
- Current availability.
- Public media.
- Seller display identity.
- Transaction action type.
- External provider name/domain when applicable.

Do not expose:

- Drafts.
- Customer data.
- Private service scope or attachments.
- Raw inventory internals.
- Payout state details.
- Provider secrets/IDs.
- Moderation notes.
- Fee-rule internals not needed for display.

If views are used, use security-invoker behavior where supported or place them in a protected schema with explicit access. Do not assume views inherit RLS automatically.

## 5. RLS Policy Matrix

Every new table in an exposed schema has RLS enabled.

| Data | `anon` | `authenticated buyer` | Seller/team | Admin/system |
| --- | --- | --- | --- | --- |
| Active public stores/listings | Select public projection | Select | Select own, including drafts through owner policy | Authorized access |
| Store/listing writes | None | Only through seller ownership/entitlement | Own account only | Authorized |
| Orders | No direct general select | Own claimed orders | Orders for own store with role | Authorized |
| Guest order access | Server route with opaque expiring proof | Claim after verification | Seller view as required | Authorized |
| Addresses | None | Own order only as required | Own fulfillment only | Restricted |
| Service requests | None except secure server submission | Participating requests | Own store/assigned role | Authorized |
| Payment events/fee rules | None | None | Limited derived display only | Server/admin |
| External links | Eligible public destination through redirect route | Same | Manage own | Authorized |

Policy requirements:

- Use authoritative ownership/membership joins.
- Use `TO anon` and/or `TO authenticated` plus row predicates.
- Update policies include both `USING` and `WITH CHECK`.
- An update also needs a corresponding select policy.
- Index ownership and predicate columns used in RLS.
- Never authorize with editable `user_metadata`.
- Keep genuine `SECURITY DEFINER` functions out of exposed schemas, revoke default `PUBLIC` execute, set safe `search_path`, and perform explicit authorization.

## 6. Data API Grants

Supabase behavior may require explicit grants before new tables are reachable through the Data API. RLS and grants are separate controls.

For every new table:

1. Decide whether browser/Data API access is needed.
2. Grant only required operations to `anon` and `authenticated`.
3. Enable RLS before or in the same reviewed migration.
4. Add policies.
5. Test allowed and denied cases using the actual project configuration.

Do not use broad `GRANT ALL` as a shortcut.

## 7. Storage

### Public Listing Media

Prefer an existing public media bucket if its ownership and transformations fit. Otherwise add a dedicated marketplace public bucket.

Policies:

- Public reads for published media.
- Authenticated upload only to owner-scoped paths.
- Update/upsert requires select, insert, and update permissions.
- Delete/archive rules must not break historical orders/posts.
- Validate MIME type, extension, size, image dimensions, and malware risk using current platform controls.

### Private Attachments

Quote/booking references, documents, and customer-provided files belong in an existing private file system or a private bucket:

- Participant-only access.
- Signed short-lived delivery.
- No public URLs.
- Audit and retention policy.

## 8. Indexes and Constraints

At minimum, evaluate:

- Unique owner/store identity.
- Unique store/listing slugs.
- Store + status + publication time.
- Search vector/index.
- Category/type/status filters.
- Seller ownership/membership lookups used by RLS.
- Order seller/buyer/status/date.
- Unique provider event ID.
- Unique checkout idempotency key.
- Service request store/buyer/status/date.
- Quote/request revision uniqueness.
- External domain/status.

Use check constraints for money non-negativity, valid state/type combinations, organization ticket-only enforcement where feasible, and exactly-one target references.

## 9. Migration Sequence

1. Audit and schema mapping only.
2. Create feature flags/config defaults off.
3. Add foundational tables, constraints, indexes, RLS, and minimal grants.
4. Generate types and compile without enabling UI.
5. Add back-end read/write services behind flags.
6. Add profile/feed references without backfilling unrelated records.
7. Add payment/service tables and provider integration.
8. Enable in development.
9. Apply to staging through migration history.
10. Run data/API/RLS/advisor/security tests.
11. Dry-run production migration and review exact statements.
12. Deploy code that tolerates both disabled/empty and enabled schemas.
13. Apply migration in approved maintenance process.
14. Enable internal/test cohort.

## 10. Rollback Strategy

Production rollback is application-first:

- Disable marketplace feature flags.
- Stop new checkout creation.
- Continue accepting/processing payment webhooks for existing orders.
- Preserve all tables and records.
- Revert application routing only when compatibility is verified.
- Use corrective forward migrations for schema errors.

Do not drop marketplace tables to roll back a release.

## 11. Verification

- Verify the complete migration chain on a disposable local database.
- Run production migration dry run.
- Compare migration list/history.
- Run Supabase security and performance advisors.
- Test Data API grants separately from RLS.
- Test as anon, authenticated buyer, each seller type/team role, and admin.
- Confirm views do not bypass RLS.
- Confirm no service/secret key is bundled client-side.
- Verify storage upload, read, replace, and denial cases.
- Confirm webhook replay is idempotent.
- Confirm current Tourify flows still operate.

## 12. Current Supabase Considerations

- New public-schema tables may not be exposed to the Data API automatically; explicit grants may be necessary.
- RLS still controls row visibility after grants.
- Supabase client libraries have moved beyond Node.js 20 support; the repository audit must confirm the current runtime before dependency changes.
- Never run `db reset --linked` against production; it is destructive.

References:

- https://supabase.com/changelog
- https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control

