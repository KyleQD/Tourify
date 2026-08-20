# COM-003 — Commerce Supabase Schema, RLS, Function, Trigger, and Storage Inventory

Date: 2026-08-12

## Source Task

- Task: `COM-003`
- Phase: `P0 — Discovery and Financial Safety Baseline`
- Requirement: inventory commerce-related Supabase tables, views, functions, triggers, policies, and storage buckets.

## Verification Scope

This inventory is migration-backed, not live-database-backed. No database reset, migration, or live schema query was run for COM-003. Later phases must compare this migration inventory against the active Supabase project before creating read models or backfills.

## Core Marketplace Tables

Defined primarily in `supabase/migrations/20260410120000_marketplace_core.sql` and extended by 202607 marketplace migrations.

| Table | Domain | RLS / policy posture from migrations |
| --- | --- | --- |
| `marketplace_storefronts` | Seller storefronts | RLS enabled; public read and owner manage policies. |
| `marketplace_listings` | Native marketplace listings | RLS enabled; public read and owner manage policies; extended for listing kinds, external fields, FTS/search vectors, moderation columns, ticket collections, and post attachments. |
| `marketplace_listing_variants` | Listing variants | RLS enabled; public read through parent listing and owner manage policies. |
| `marketplace_orders` | Marketplace orders | RLS enabled; participant read, buyer create, seller update; later adds order number, idempotency key, guest checkout fields, applied fee snapshot. |
| `marketplace_order_items` | Order lines | RLS enabled; participant read and buyer create through parent order. |
| `marketplace_entitlements` | Digital entitlements | RLS enabled; buyer read and seller manage through order context. |
| `marketplace_payout_ledger` | Seller payable/payout ledger | RLS enabled; seller read. Admin retry currently uses API-side auth and user-scoped Supabase client. |
| `marketplace_moderation_queue` | Marketplace moderation reports | RLS enabled in core migration; later admin columns add storefront, actor, action, previous/new status, resolved timestamp indexes. |
| `marketplace_service_milestones` | Service delivery milestones | RLS enabled; participant and seller manage policies. |
| `marketplace_integrations` | Seller external integrations | RLS enabled; owner manage policy; hardened with provider/product/sync/fulfillment tables. |

## Marketplace Extensions

| Table | Migration | Domain |
| --- | --- | --- |
| `marketplace_external_listings` | `20260728000003_marketplace_external_listings.sql` | External/off-platform listings. |
| `marketplace_external_clicks` | `20260728000004_marketplace_external_clicks.sql` | External listing redirect/click tracking; seller read policy. |
| `marketplace_service_definitions` | `20260728000002_marketplace_service_definitions.sql` | Service catalog definitions. |
| `marketplace_service_requests` | `20260728000005_marketplace_service_requests.sql` | Service request workflow. |
| `marketplace_service_offers` | `20260728000006_marketplace_service_offers.sql` | Service offer workflow. |
| `marketplace_service_bookings` | `20260728000007_marketplace_service_bookings.sql` | Confirmed service bookings; buyer/seller read and seller manage policies. |
| `marketplace_post_attachments` | `20260728000008_marketplace_post_attachments.sql` | Feed commerce attachments. |
| `marketplace_ticket_collections` | `20260728000009_marketplace_ticket_collections.sql` | Organization ticket collections in marketplace. |
| `marketplace_fee_rules` | `20260728000010_marketplace_fee_rules.sql` | Versioned fee rules; admin-only write posture. |
| `marketplace_checkout_attempts` | `20260728000011_marketplace_checkout_attempts.sql` | Checkout idempotency and retry state; buyer read policy. |
| `marketplace_payment_events` | `20260728000011_marketplace_checkout_attempts.sql` | Stripe marketplace webhook event store; RLS enabled, used for webhook idempotency. |
| `marketplace_integration_products` | `20260704224927_marketplace_integrations_hardening.sql` | Synced provider products. |
| `marketplace_integration_sync_runs` | `20260704224927_marketplace_integrations_hardening.sql` | Provider sync run logs. |
| `marketplace_provider_webhook_events` | `20260704224927_marketplace_integrations_hardening.sql` | Provider webhook event records. |
| `marketplace_fulfillment_requests` | `20260704224927_marketplace_integrations_hardening.sql` | Provider fulfillment requests. |

## Ticketing Tables

| Table | Domain | RLS / policy posture from migrations |
| --- | --- | --- |
| `ticket_types` | Ticket products/types | RLS enabled; early broad policies later hardened by admin ticketing security/TIX migrations. |
| `ticket_sales` | Ticket orders/sales | RLS enabled; later extended with Stripe checkout/payment intent, fees, issuance, idempotency, webhook refs, org tenant keys. |
| `ticket_campaigns` | Ticket campaigns | RLS enabled and later hardened. |
| `promo_codes` | Ticket promo codes | RLS enabled and later hardened; usage increment function exists. |
| `ticket_shares` | Ticket sharing | RLS enabled and hardened. |
| `ticket_referrals` | Referrals | RLS enabled and hardened. |
| `ticket_analytics` | Ticket analytics | RLS enabled. |
| `social_media_performance` | Campaign/social performance | RLS enabled. |
| `event_ticketing_config` | Event ticketing setup | RLS enabled; event/org scoped policies and grants. |
| `ticket_inventory_reservations` | Reservation holds | RLS enabled; reserve/release/finalize functions. |
| `tickets` | Issued tickets | RLS enabled; owner/admin/event scoped policies. |
| `ticket_credentials` | Ticket credentials | RLS enabled; protected credential access. |
| `ticket_ownership_events` | Ticket ownership audit | RLS enabled. |
| `ticket_transfers` | Transfer workflow | RLS enabled. |
| `ticket_checkins` | Door check-ins | RLS enabled. |
| `ticket_allocations` | Allocation matrix | RLS enabled. |
| `ticket_revenue_allocations` | Revenue allocations | RLS enabled. |
| `event_ticketing_grants` | Event-scoped ticketing grants | RLS enabled. |
| `ticket_stripe_webhook_events` | Ticketing Stripe webhook idempotency | RLS enabled; deny policy for direct user access. |
| `ticket_analytics_events` | Analytics event records | RLS enabled. |

## Finance, Settlement, Subscription, and Promotion Tables

| Table | Migration | Domain / posture |
| --- | --- | --- |
| `financial_transactions` | `20260328140000_financial_tables.sql`, later hardened by finance RLS migrations | Finance transaction ledger; early broad policy replaced/hardened later. |
| `budgets` | `20260328140000_financial_tables.sql` | Budget rows; early broad policy replaced/hardened later. |
| `settlements` | `20260602130000_settlements.sql`, `20260719223037_admin_tour_foundation_security.sql` | Event/tour settlements; RLS enabled; later status transition enforcement. |
| `financial_audit_log` | `20260602130000_settlements.sql`, `20260719223037_admin_tour_foundation_security.sql` | Financial audit trail; RLS enabled. |
| `subscriptions` | `20260413400000_stripe_connect_and_subscriptions.sql` | Stripe subscription rows; RLS enabled; user read and service-role manage policies. |
| `promotion_posts` | `20250813130000_promotion_core.sql` | Promotion posts; RLS enabled; public read and author write. |
| `post_collaborators` | `20250813130000_promotion_core.sql` and feed collaborator migrations | Promotion/feed collaboration records. |
| `event_promo_codes` | Referenced by plan and code search candidates | Needs live/schema verification in later task because this scan did not find a direct create-table line. |
| `revenue` | Referenced by plan and audit baseline | Needs live/schema verification in later task because this scan did not find a direct create-table line. |

## Music Marketplace / Music Finance Tables

Music marketplace has a separate, extensive schema that must be mapped before any Commerce HQ consolidation.

| Family | Representative tables |
| --- | --- |
| Music marketplace offerings and investors | `music_marketplace_issuers`, `music_marketplace_issuer_parties`, `music_marketplace_issuer_catalog_links`, `music_marketplace_pathway_decisions`, `music_marketplace_offerings`, `music_marketplace_offering_versions`, `music_marketplace_disclosure_documents`, `music_marketplace_document_access_logs`, `music_marketplace_investor_partner_accounts`, `music_marketplace_investor_acknowledgements`, `music_marketplace_subscriptions`, `music_marketplace_subscription_events`, `music_marketplace_compliance_holds`. |
| Music marketplace positions and settlement | `music_marketplace_security_classes`, `music_marketplace_positions`, `music_marketplace_transfer_requests`, `music_marketplace_repurchases`, `music_marketplace_corporate_actions`, `music_marketplace_token_mirrors`, `music_marketplace_partner_orders`, `music_marketplace_executions`, `music_marketplace_settlements`, `music_marketplace_market_data_ticks`. |
| Music marketplace ops/disclosures | `music_marketplace_partner_event_receipts`, `music_marketplace_outbox_events`, `music_marketplace_surveillance_alerts`, `music_marketplace_communications_archives`, `music_marketplace_distributions`, `music_marketplace_distribution_lots`, `music_marketplace_tax_document_links`, `music_marketplace_issuer_reports`, `music_marketplace_complaints`, `music_marketplace_admin_actions`. |
| Music royalties/payouts | `music_royalties_rights_snapshots`, `music_royalties_allocation_runs`, `music_royalties_allocations`, `music_royalties_recoupment_ledgers`, `music_royalties_holds`, `music_royalties_participant_statements`, `music_royalties_payee_accounts`, `music_royalties_payout_readiness`, `music_royalties_payout_batches`, `music_royalties_payout_instructions`, `music_royalties_payout_provider_events`, `music_royalties_payout_reconciliations`. |
| Music finance | `music_finance_fan_collectibles`, `music_finance_offerings`, `music_finance_offering_orders`, `music_finance_onchain_instruments`. |

Most music marketplace tables enable RLS and include owner/self, issuer, and service-role policies. These policies need a dedicated COM-003 live verification pass before commerce consolidation.

## Functions and Triggers

| Function / trigger family | Purpose |
| --- | --- |
| `marketplace_touch_updated_at` and per-table marketplace triggers | Maintains `updated_at` across core marketplace tables. |
| `generate_marketplace_order_number`, `marketplace_orders_set_order_number`, `trg_marketplace_orders_order_number` | Marketplace order numbering. |
| `update_marketplace_listings_search_vector` / `marketplace_listings_search_vector_update` and related triggers | Listing search vector maintenance. |
| Marketplace service/listing/fee/external triggers | Maintains updated timestamps and search fields for service, external listing, ticket collection, and fee-rule tables. |
| `reserve_ticket_inventory`, `release_ticket_inventory`, `finalize_ticket_inventory`, `expire_ticket_reservations` | Ticket inventory hold/finalization flow. |
| `increment_ticket_quantity_sold`, `decrement_ticket_quantity_sold` | Ticket quantity sold updates/refund support. |
| `can_ticketing`, `can_ticketing_on_event`, `has_event_ticketing_grant`, `is_event_v2_org_member` | Ticketing authorization helpers. |
| `get_admin_ticketing_overview`, `get_admin_ticketing_social_performance` | Admin ticketing read helpers. |
| `increment_promo_code_usage`, `apply_ticket_refund` | Promo and ticket refund helpers. |
| `enforce_settlement_status_transition` trigger | Settlement state transition guard. |

## Views

The scan found `public.music_tracks` in `20260410183000_music_commerce_expansion.sql`. No canonical `commerce_*` read-model views exist yet in migrations. This supports the roadmap requirement to add `commerce_overview_v`, `commerce_transaction_ledger_v`, and related views additively in later phases.

## Storage Buckets and Storage Policies

| Bucket / policy | Domain |
| --- | --- |
| `artist-merchandise` public read policy | Merchandise/listing media. Policy is constrained to valid object paths by `20260414130000_security_linter_step4_storage_public_read.sql`. |
| `photos-preview`, `photos-thumbnail`, `photos-watermarked` conditional public read policies | Photo marketplace adjacency; only created when buckets exist. |
| `music-marketplace-disclosures` | Private music marketplace disclosure documents. |
| `music-marketplace-statements` | Private music marketplace statements. |
| `music-marketplace-evidence` | Private evidence bucket with service-role policy. |
| `music-marketplace-comms` | Private communications archive bucket with service-role policy. |

## Immediate Gaps for Later Tasks

- Live database inventory is still required before any migration or backfill.
- Several plan-mentioned tables (`event_promo_codes`, `revenue`, possible merchandise transaction tables) were not confirmed by create-table migration scan and need live/schema verification.
- No canonical Commerce Operations read-model views exist yet.
- Marketplace admin APIs use service-role-backed admin utilities in some places; COM-005/COM-018 and later auth work must align these with CommerceContext and explicit capabilities.
- Storage policies are distributed across security-linter and domain migrations; later security review should verify bucket existence and path constraints live.

## Evidence Commands

- `rg -n "create table if not exists|create table|alter table|create view|create materialized view|create or replace function|create function|create trigger|enable row level security|create policy|drop policy|storage\.buckets|insert into storage\.buckets" supabase/migrations -g '*.sql' | rg -i "marketplace|ticket|subscription|financial|finance|settlement|revenue|promotion|promo|merch|payout|commerce|stripe|fee|refund|inventory"`
- `rg -n "create table if not exists|create table" supabase/migrations -g '*.sql' | rg -i "marketplace|ticket|subscription|financial|settlement|revenue|promotion|promo|merch|payout|commerce|stripe|fee|refund|inventory"`
- `rg -n "create policy|enable row level security" supabase/migrations -g '*.sql' | rg -i "marketplace|ticket|subscription|financial|settlement|revenue|promotion|promo|merch|payout|commerce|stripe|fee|refund|inventory"`
- `rg -n "create or replace function|create function|create trigger|drop trigger" supabase/migrations -g '*.sql' | rg -i "marketplace|ticket|subscription|financial|settlement|revenue|promotion|promo|merch|payout|commerce|stripe|fee|refund|inventory"`
- `rg -n "create (or replace )?view|create materialized view|security_invoker" supabase/migrations -g '*.sql' | rg -i "marketplace|ticket|subscription|financial|settlement|revenue|promotion|promo|merch|payout|commerce|stripe|fee|refund|inventory"`
- `rg -n "storage\.buckets|bucket_id|artist-merchandise|marketplace|music_marketplace" supabase/migrations -g '*.sql' | rg -i "bucket|storage|marketplace|merch|music_marketplace"`
