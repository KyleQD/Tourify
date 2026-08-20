# COM-022 - Commerce Table Classification

Date: 2026-08-12

## Source Task

- Task: `COM-022`
- Phase: `P0 - Discovery and Financial Safety Baseline`
- Requirement: classify canonical, legacy, prototype, and unused commerce tables.

## Scope

This classification is migration-backed and code-reference-backed. It does not claim the live Supabase project has exactly the same objects until a live schema verification task is run.

No database reset, migration, destructive command, live schema mutation, provider action, or backfill was performed.

## Classification Vocabulary

| Classification | Meaning for Commerce Operations |
| --- | --- |
| Canonical source table | Current source-of-truth table inside an existing product domain. It is not yet a unified Commerce canonical table, but canonical adapters must preserve it. |
| Legacy adapter source | Active or historical commerce source that must be adapted carefully, usually because it predates safer command/idempotency/scope patterns. |
| Prototype/future-facing | Migration-defined or feature-flagged surface that is partial, partner-led, domain-specific, or not yet ready to be treated as complete Commerce Operations coverage. |
| Unused/unconfirmed | Mentioned by plans, docs, archives, or legacy code, but not confirmed as an active current commerce table in the migration/code scan. |
| Missing canonical Commerce table/view | Required by the suite or migration plan, but not present yet. Must be added additively later. |

Important distinction: as of this task, **no unified `commerce_*` canonical read-model view or table exists**. Existing active tables are canonical only inside their source product domain.

## Missing Canonical Commerce Tables And Views

These are target-model objects from the suite/migration plan. They are not confirmed in current migrations and must not be treated as already developed.

| Object | Classification | Handling |
| --- | --- | --- |
| `commerce_transaction_index` | Missing canonical Commerce table/view | Add only after source classification, scope rules, and reconciliation baselines are ready. |
| `commerce_party_snapshots` | Missing canonical Commerce table/view | Additive immutable snapshots for buyer/seller/customer references. |
| `commerce_fee_snapshots` | Missing canonical Commerce table/view | Additive immutable fee calculation snapshots; current fees are source-specific. |
| `commerce_refunds` | Missing canonical Commerce table/view | Add only if existing refund records cannot safely serve as canonical records. |
| `commerce_fulfillment_obligations` | Missing canonical Commerce table/view | Needed to normalize marketplace digital/physical/service and ticket obligations. |
| `commerce_cases` | Missing canonical Commerce table/view | Needed for support/moderation/dispute/risk case tracking. |
| `commerce_issues` | Missing canonical Commerce table/view | Needed for Needs Attention issue queue. |
| `commerce_settlements` | Missing canonical Commerce table/view | Future settlement header distinct from current legacy `settlements`. |
| `commerce_settlement_entries` | Missing canonical Commerce table/view | Future transaction/fee/refund/payable/payout settlement entries. |
| `commerce_bulk_operations` | Missing canonical Commerce table/view | Needed for idempotent bulk operations. |
| `commerce_saved_views` | Missing canonical Commerce table/view | Needed for Commerce HQ saved filters/columns. |
| `commerce_overview_v` | Missing canonical Commerce table/view | Future security-invoker overview read model. |
| `commerce_transaction_ledger_v` | Missing canonical Commerce table/view | Future unified ledger read model. |
| `commerce_orders_v` | Missing canonical Commerce table/view | Future normalized orders read model. |
| `commerce_sellers_v` | Missing canonical Commerce table/view | Future seller/storefront/balance read model. |
| `commerce_fulfillment_queue_v` | Missing canonical Commerce table/view | Future fulfillment queue read model. |
| `commerce_payment_failures_v` | Missing canonical Commerce table/view | Future payment exception read model. |
| `commerce_payout_reconciliation_v` | Missing canonical Commerce table/view | Future payout reconciliation read model. |
| `commerce_ticket_reconciliation_v` | Missing canonical Commerce table/view | Future paid/issued/refunded ticket reconciliation view. |
| `commerce_subscription_health_v` | Missing canonical Commerce table/view | Future subscription and entitlement health view. |

## Marketplace Table Classification

| Table | Classification | Evidence / notes | Commerce handling |
| --- | --- | --- | --- |
| `marketplace_storefronts` | Canonical source table | Migration-defined seller storefront source. | Adapt into seller/storefront read models. |
| `marketplace_listings` | Canonical source table | Heavily used across marketplace, artist music, public listings, admin store, checkout, feeds, and provider imports. | Primary listing/source product adapter. |
| `marketplace_listing_variants` | Canonical source table | Variant pricing/inventory source for marketplace checkout. | Preserve as product snapshot input. |
| `marketplace_orders` | Canonical source table | Native checkout, webhook, admin order, guest order, analytics, and delivery source. | Primary marketplace order adapter. |
| `marketplace_order_items` | Canonical source table | Native line items, digital/service/Printful fulfillment, artist analytics. | Primary order-line and fulfillment adapter. |
| `marketplace_entitlements` | Canonical source table | Digital delivery access and webhook entitlement creation. | Map to fulfillment/entitlement obligations. |
| `marketplace_payout_ledger` | Canonical source table with gaps | Checkout writes seller payable; webhook schedules; admin retry currently local-only. | Preserve but add currency/provider-state/idempotency hardening before canonical payout tooling. |
| `marketplace_fee_rules` | Canonical source table | Active fee calculator and admin fee-rule routes. | Use as fee snapshot source until `commerce_fee_snapshots` exists. |
| `marketplace_checkout_attempts` | Canonical source table | Checkout idempotency attempt table. | Reuse pattern for canonical checkout command idempotency. |
| `marketplace_payment_events` | Canonical source table | Stripe webhook replay/idempotency table. | Use as provider event source for marketplace payment reconciliation. |
| `marketplace_moderation_queue` | Canonical source table | Migration-backed marketplace moderation queue. | Later map to `commerce_cases`/`commerce_issues`. |
| `marketplace_integrations` | Canonical source table | Seller integration config. | Source for provider adapter state. |
| `marketplace_integration_products` | Canonical source table | Provider product sync table. | External-product adapter input. |
| `marketplace_integration_sync_runs` | Canonical source table | Provider sync-run evidence. | Sync health/issue input. |
| `marketplace_provider_webhook_events` | Canonical source table | Provider webhook event receipt table. | Provider replay/audit input. |
| `marketplace_fulfillment_requests` | Canonical source table | Printful/integration fulfillment requests are read/written by integration code. | Fulfillment obligation adapter input. |
| `marketplace_external_listings` | Prototype/future-facing | Migration-defined external listing table; native checkout blocks external listings. | Treat as external/off-platform adapter, not native order source. |
| `marketplace_external_clicks` | Prototype/future-facing | External listing click tracking. | Useful for traffic analytics; not a payment source. |
| `marketplace_service_definitions` | Prototype/future-facing | Migration-defined service catalog. | Service commerce adapter later. |
| `marketplace_service_requests` | Prototype/future-facing | Service request workflow exists, but not same as paid order creation. | Treat as pre-order/request source. |
| `marketplace_service_offers` | Prototype/future-facing | Service offer workflow. | Treat as pre-order/negotiation source. |
| `marketplace_service_bookings` | Prototype/future-facing | Schema exists; COM-008 found no active creation path. | Do not include as complete paid service order until insert path is confirmed. |
| `marketplace_service_milestones` | Prototype/future-facing | Fulfillment/detail record for service work. | Adapter only after service booking path is confirmed. |
| `marketplace_post_attachments` | Prototype/future-facing | Feed commerce attachment source. | Engagement/source-link only, not transaction. |
| `marketplace_ticket_collections` | Prototype/future-facing | Marketplace ticket collection bridge. | Keep separate from ticketing transaction source. |

## Ticketing Table Classification

| Table | Classification | Evidence / notes | Commerce handling |
| --- | --- | --- | --- |
| `ticket_types` | Canonical source table | Ticket product/source used by checkout and admin ticketing. | Ticket product adapter input. |
| `ticket_sales` | Canonical source table | Public checkout, box office, allocations, webhook finalization, refunds, reports, admin reads. | Primary ticket order adapter. |
| `tickets` | Canonical source table | Issued admission records, wallet, transfer, delivery, check-in, refund/revocation. | Ticket fulfillment/issuance adapter. |
| `ticket_credentials` | Canonical source table | Active credential source for delivery/check-in/reissue. | Credential state adapter; protect PII/secret tokens. |
| `ticket_ownership_events` | Canonical source table | Issuance, transfer, reissue, refund timeline. | Timeline/audit adapter input. |
| `ticket_inventory_reservations` | Canonical source table | Pending checkout inventory reservations. | Reservation reconciliation input. |
| `ticket_stripe_webhook_events` | Canonical source table | Stripe event claim table when ticketing v2 is enabled. | Provider replay/audit input. |
| `event_ticketing_config` | Canonical source table | Event ticketing setup/config and permission anchor. | Event-scoped ticketing adapter input. |
| `event_ticketing_grants` | Canonical source table | Event-scoped ticketing permissions. | Access-control input, not transaction source. |
| `ticket_campaigns` | Canonical source table | Admin ticket discount campaign creation/read. | Promotion/discount adapter, not paid promotion commerce. |
| `promo_codes` | Canonical source table | Promo-code checkout usage and admin commands. | Discount adapter; not paid promotion purchase. |
| `ticket_revenue_allocations` | Canonical source table | Event settlement share calculations. | Settlement allocation input. |
| `ticket_transfers` | Canonical source table | Ticket transfer workflow. | Ticket timeline/risk adapter. |
| `ticket_checkins` | Canonical source table | Door check-in workflow. | Ticket fulfillment/risk adapter. |
| `ticket_allocations` | Canonical source table | Allocation issuance path. | Non-provider issuance source label. |
| `ticket_shares` | Prototype/future-facing | Sharing/referral analytics. | Attribution/marketing input, not transaction source. |
| `ticket_referrals` | Prototype/future-facing | Referral conversion/usage records. | Attribution/discount input. |
| `ticket_analytics` | Prototype/future-facing | Analytics table. | Reporting input only. |
| `ticket_analytics_events` | Prototype/future-facing | Analytics event records. | Reporting input only. |
| `social_media_performance` | Prototype/future-facing | Campaign/social performance table. | Promotion analytics input, not payment source. |

## Finance, Settlement, Subscription, And Promotion Classification

| Table | Classification | Evidence / notes | Commerce handling |
| --- | --- | --- | --- |
| `financial_transactions` | Canonical source table | Admin finance commands, ticketing ledger writes, event/tour finance reads, analytics. | Current finance ledger adapter; needs currency/provenance normalization. |
| `budgets` | Canonical source table | Finance domain table from migrations. | Budget context only, not transaction source. |
| `settlements` | Canonical source table | Admin finance settlements and event ticket settlement route. | Current settlement adapter until `commerce_settlements` exists. |
| `financial_audit_log` | Canonical source table | Finance audit trail from migrations. | Audit evidence adapter input. |
| `finance_reconciliation_mismatches` | Prototype/future-facing | Admin reconciliation route reads it but gracefully returns unavailable when absent. | Keep as finance mismatch queue, not full Commerce issue queue. |
| `subscriptions` | Canonical source table with gaps | Stripe webhook projection for subscription status. | Subscription adapter, but provider replay, invoices, currency, and entitlements are missing. |
| `artist_subscription_tiers` | Canonical source table | Artist tier setup and Stripe Product/Price sync. | Plan setup adapter input. |
| `promotion_posts` | Canonical source table for organic promotion | Promotion post creation and venue actions. | Organic promotion/content source, not paid promotion payment. |
| `post_collaborators` | Canonical source table for collaboration | Promotion/feed collaborator rows. | Collaboration/context input. |
| `artist_marketing_campaigns` | Legacy adapter source | Active artist marketing UI/service table; budget/spend is not provider-reconciled. | Treat as operational marketing source until paid promotion commerce exists. |
| `artist_financial_transactions` | Legacy adapter source | Active artist business/financial pages and service usage. | Adapt separately from admin `financial_transactions`; do not double-count. |

## Legacy Commerce Adapter Sources

| Table | Classification | Evidence / notes | Commerce handling |
| --- | --- | --- | --- |
| `photo_purchases` | Legacy adapter source | Active photo checkout/webhook purchase table, separate from marketplace orders and payout ledger. | Add source adapter with explicit idempotency/provider gaps. |
| `bookings` | Legacy adapter source | Client-side booking creation and legacy `/api/payment` confirmation path. | High-risk legacy adapter; avoid treating as canonical order command. |
| `artist_financial_transactions` | Legacy adapter source | Artist-owned business finance records. | Separate adapter or exclude from platform finance totals until scope is proven. |

## Music Commerce Classification

Music commerce is broad, feature-flagged, and partly partner-led. It should be represented by separate adapters rather than folded into marketplace or ticketing sources.

| Table family | Representative tables | Classification | Commerce handling |
| --- | --- | --- | --- |
| Music marketplace issuers/offerings/disclosures | `music_marketplace_issuers`, `music_marketplace_offerings`, `music_marketplace_offering_versions`, `music_marketplace_disclosure_documents`, `music_marketplace_document_access_logs` | Prototype/future-facing | Feature-flagged offering/disclosure adapter; not ordinary marketplace listing/order. |
| Music marketplace investor/subscription state | `music_marketplace_investor_partner_accounts`, `music_marketplace_subscriptions`, `music_marketplace_subscription_events`, `music_marketplace_compliance_holds` | Prototype/future-facing | Investment subscription adapter with compliance/risk semantics. |
| Music marketplace partner orders/executions/settlements | `music_marketplace_partner_orders`, `music_marketplace_executions`, `music_marketplace_settlements`, `music_marketplace_partner_event_receipts` | Prototype/future-facing | Partner-led order/settlement adapter; provider state must remain source-labeled. |
| Music marketplace positions/transfers/repurchases | `music_marketplace_positions`, `music_marketplace_transfer_requests`, `music_marketplace_repurchases`, `music_marketplace_corporate_actions`, `music_marketplace_token_mirrors` | Prototype/future-facing | Securities/position adapter, not normal seller payout. |
| Music marketplace surveillance/admin/comms | `music_marketplace_surveillance_alerts`, `music_marketplace_communications_archives`, `music_marketplace_complaints`, `music_marketplace_admin_actions`, `music_marketplace_outbox_events` | Prototype/future-facing | Risk/case/audit adapter input. |
| Music royalties import/matching/allocation | `music_royalties_import_batches`, `music_royalties_raw_rows`, `music_royalties_normalized_lines`, `music_royalties_match_candidates`, `music_royalties_allocation_runs`, `music_royalties_allocations` | Prototype/future-facing | Royalty ledger adapter; already uses minor-unit style in many places. |
| Music royalties payouts | `music_royalties_payee_accounts`, `music_royalties_payout_readiness`, `music_royalties_payout_batches`, `music_royalties_payout_instructions`, `music_royalties_payout_provider_events`, `music_royalties_payout_reconciliations` | Prototype/future-facing | Payout reconciliation adapter, separate from marketplace payout ledger. |
| Music finance offerings/orders/onchain | `music_finance_offerings`, `music_finance_offering_orders`, `music_finance_onchain_instruments`, `music_finance_fan_collectibles` | Prototype/future-facing | Partner/audit-gated finance adapter; do not mix with native marketplace orders. |

## Unused Or Unconfirmed Tables

| Table | Classification | Evidence / notes | Commerce handling |
| --- | --- | --- | --- |
| `event_promo_codes` | Unused/unconfirmed | Mentioned in docs/archive scans; not confirmed as current active migration table in COM-003 and not found in current app/lib usage. | Do not build new Commerce adapters against it without live schema verification. |
| `revenue` | Unused/unconfirmed | Mentioned in audit baseline; no current app/lib usage found in targeted scan. | Treat as unconfirmed until live schema proves otherwise. |
| `merchandise_transactions` | Unused/unconfirmed | Mentioned in suite/audit baseline; no current migration/code confirmation in targeted scan. | Native merch is currently represented through marketplace listings/orders. |
| `merchandise_sales` | Unused/unconfirmed | Mentioned in suite/audit baseline; no current migration/code confirmation in targeted scan. | Do not use for canonical reads until confirmed. |
| `merchandise_inventory` | Unused/unconfirmed | Mentioned in suite/audit baseline; no current migration/code confirmation in targeted scan. | Use marketplace inventory fields until confirmed. |
| `marketplace_service_bookings` | Prototype/future-facing, currently no confirmed creation path | Migration-defined, but COM-008 found no active insert path. | Keep out of paid order parity until write path is proven. |

## Classification Rules For Later Build Phases

1. Do not delete, rename, or consolidate source tables during Commerce HQ buildout.
2. Add canonical `commerce_*` tables/views additively and behind flags.
3. Preserve source labels in every adapter: marketplace, ticketing, subscription, promotion, photo, booking, music marketplace, music royalties, music finance.
4. Treat legacy adapter sources as read-compatible but not as examples for new commands.
5. Treat prototype/future-facing tables as unavailable or partial in Commerce APIs unless current code proves an end-to-end flow.
6. Treat unused/unconfirmed tables as absent until live schema verification proves otherwise.
7. Never aggregate mixed or unknown currencies without explicit currency partitioning.
8. Do not double-count finance: `financial_transactions`, `artist_financial_transactions`, ticket ledger writes, marketplace payout ledger, and music royalty payout tables represent different ledgers.

## Evidence Commands

- `sed -n '1,240p' docs/admin-commerce-ops/COM-003_SCHEMA_RLS_INVENTORY.md`
- `sed -n '1,220p' docs/admin-commerce-ops/19_SUPABASE_DATA_MODEL_AND_MIGRATIONS.md`
- `rg -n "from\\(['\"](marketplace_orders|marketplace_order_items|marketplace_payout_ledger|marketplace_payment_events|marketplace_checkout_attempts|marketplace_listings|marketplace_fee_rules|marketplace_entitlements|marketplace_fulfillment_requests)['\"]\\)|\\.from\\(['\"](marketplace_orders|marketplace_order_items|marketplace_payout_ledger|marketplace_payment_events|marketplace_checkout_attempts|marketplace_listings|marketplace_fee_rules|marketplace_entitlements|marketplace_fulfillment_requests)['\"]\\)" app lib __tests__ -g '*.{ts,tsx}'`
- `rg -n "from\\(['\"](ticket_sales|tickets|ticket_credentials|ticket_ownership_events|ticket_inventory_reservations|ticket_stripe_webhook_events|ticket_revenue_allocations|promo_codes|ticket_campaigns|event_ticketing_config|event_ticketing_grants)['\"]\\)|\\.from\\(['\"](ticket_sales|tickets|ticket_credentials|ticket_ownership_events|ticket_inventory_reservations|ticket_stripe_webhook_events|ticket_revenue_allocations|promo_codes|ticket_campaigns|event_ticketing_config|event_ticketing_grants)['\"]\\)" app lib __tests__ -g '*.{ts,tsx}'`
- `rg -n "from\\(['\"](financial_transactions|settlements|financial_audit_log|finance_reconciliation_mismatches|subscriptions|artist_subscription_tiers|promotion_posts|artist_marketing_campaigns|event_promo_codes|revenue)['\"]\\)|\\.from\\(['\"](financial_transactions|settlements|financial_audit_log|finance_reconciliation_mismatches|subscriptions|artist_subscription_tiers|promotion_posts|artist_marketing_campaigns|event_promo_codes|revenue)['\"]\\)" app lib __tests__ -g '*.{ts,tsx}'`
- `rg -n "music_marketplace_|music_royalties_|music_finance_" app lib __tests__ -g '*.{ts,tsx}'`
- `rg -n "from\\(['\"](photo_purchases|bookings|merchandise_transactions|merchandise_sales|merchandise_inventory|revenue|event_promo_codes|artist_financial_transactions)['\"]\\)|\\.from\\(['\"](photo_purchases|bookings|merchandise_transactions|merchandise_sales|merchandise_inventory|revenue|event_promo_codes|artist_financial_transactions)['\"]\\)" app lib __tests__ -g '*.{ts,tsx}'`
- `rg -n "create table if not exists (photo_purchases|bookings|merchandise_transactions|merchandise_sales|merchandise_inventory|revenue|event_promo_codes|artist_financial_transactions)|create table (photo_purchases|bookings|merchandise_transactions|merchandise_sales|merchandise_inventory|revenue|event_promo_codes|artist_financial_transactions)" supabase/migrations supabase/migrations_backup supabase/migrations/archive -g '*.sql'`
- `rg -n "commerce_(transaction|party|fee|refund|fulfillment|cases|issues|settlement|saved|overview|orders|sellers|payout|ticket|subscription|bulk)|create (or replace )?view.*commerce_|create table.*commerce_" app lib supabase/migrations docs/admin-commerce-ops -g '*.{ts,tsx,sql,md}'`
- `sed -n '1,180p' docs/admin-commerce-ops/COM-008_ORDER_CREATION_PATH_INVENTORY.md`
