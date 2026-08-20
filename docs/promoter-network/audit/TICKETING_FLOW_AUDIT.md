# Ticketing Flow Audit

**Phase:** P0-2, P0-3, P0-5, P0-7, P0-8  
**Audited:** 2026-08-17

## Verified native purchase and payment path

1. `components/ticketing/ticket-purchase-form.tsx` calls `POST /api/ticketing/enhanced`.
2. `app/api/ticketing/enhanced/route.ts` validates the request, loads active `ticket_types` and `event_ticketing_config`, resolves a `promo_codes` row and optional `ticket_referrals` row, and calls `createPendingOrder`.
3. `lib/ticketing/orders.ts#createPendingOrder` calculates the server-side fee breakdown, optionally reserves inventory, and inserts one pending `ticket_sales` row. Its current numeric fields are decimal values, not integer minor units.
4. The enhanced route creates a Stripe Checkout Session with a single aggregated line item. Metadata contains `sale_id`, `order_id`, `event_id`, `ticket_type_id`, `order_number`, `buyer_total`, and `discount_amount`; it then saves `stripe_checkout_session_id` on the sale.
5. `POST /api/ticketing/webhook` in `app/api/ticketing/webhook/route.ts` verifies the Stripe signature with `stripe.webhooks.constructEvent` before processing. For `checkout.session.completed` with `payment_status = paid`, it resolves `sale_id` from Stripe metadata and calls `finalizePaidOrder`.
6. `lib/ticketing/finalize.ts#claimWebhookEvent` inserts the Stripe event ID into `ticket_stripe_webhook_events`; duplicate-key `23505` is treated as already claimed. `finalizePaidOrder` completes the sale, finalizes inventory, issues individual tickets, consumes promo/referral usage, writes the ticket revenue ledger, analytics, and buyer notification.
7. Refund handling receives `charge.refunded`, resolves the sale by payment intent/reference, and calls `refundOrderTickets` under Ticketing V2. Promoter reversal work must attach here after the original commission ledger is implemented.

## Current financial representation

`ticket_sales` is an order for one `ticket_type_id` and a quantity. It holds `unit_price`, `total_amount`, `discount_amount`, `platform_fee_amount`, `processing_fee_amount`, `tax_amount`, `net_amount`, payment state/references, and metadata. The current promoter calculation must use this exact order shape; the intended base is reconstructable as the discounted ticket subtotal and must be converted/rounded to minor units inside the promoter domain.

`ticket_revenue_allocations` has `event_id`, beneficiary type/id, percentage/flat/remainder share type/value, priority, active state, and metadata. `app/api/ticketing/settlements/route.ts` presently deletes and reinserts the event’s allocation configuration. It is therefore mutable settlement configuration, not an immutable sale-level promoter commission ledger. Keep it separate from promoter commission truth.

`settlements` contains event/tour/org aggregates and a mutable `promoter_payout` aggregate. It is a finance summary, not a per-promoter payable workflow. It may become a reporting or adapter target only after a per-entry promoter payout allocation exists.

## Promo-code contract

The active checkout path uses `promo_codes`, not `event_promo_codes`:

- `getActivePromoCode` in `app/api/ticketing/enhanced/route.ts` performs a service-role exact lookup by `event_id`, normalized `code`, active state, and dates.
- The selected ID is written to `ticket_sales.promo_code_id`.
- `finalizePaidOrder` calls `increment_promo_code_usage` after successful payment.
- `event_promo_codes` exists in generated types but has no active native-checkout consumer in the audited path.

Promoter code association should be an additive binding from a promoter membership/program to `promo_codes.id`; code text and discount terms must not become the commission source of truth.

## Payout / Connect contract

`app/api/stripe/connect/route.ts` provisions Stripe Connect accounts on `profiles` (`stripe_connect_account_id`, `stripe_connect_v2_account_id`, `stripe_connect_account_kind`). `lib/marketplace/seller-payout-readiness.ts` proves marketplace readiness against Stripe account capabilities.

`marketplace_payout_ledger` is strictly marketplace-order scoped (`order_id -> marketplace_orders`, seller, gross/platform/net amount, status, provider, references, availability and paid timestamps) and has one row per marketplace order. `app/api/marketplace/checkout/route.ts` creates it and marketplace webhook code mutates it. Do not reuse it as the promoter commission ledger; only consider a later adapter after promoter-specific payout allocations are present.

## Authorization, feature flags, notifications, analytics

- **Ticketing management:** `lib/ticketing/permissions.ts#hasTicketingPermission` is the canonical current ticketing helper. It resolves `events_v2` creator/org ownership, config owner, org roles, explicit `event_ticketing_grants`, and scan assignments. Organizer promoter APIs should require its appropriate ticketing-management permission until a more specific event-management helper is proven necessary.
- **Event workspace:** `app/api/events/_lib/event-permissions.ts#hasEventPermission` is used by the event HQ routes and is broader/legacy-compatible. Do not mix it into ticketing mutations without an explicit cross-surface decision.
- **Feature flags:** generic flags use `feature_flags` (`key`, `enabled`, `rollout_percentage`, `target_org_ids`) with `lib/post-style-flags.ts` demonstrating a stable subject bucket. Admin-governed flags use `lib/admin/feature-flags/{registry,resolver}.ts` with definitions and organization assignments. Promoter rollout must select one convention in P1; event/ticketing rollout should prefer the governed org-assignment path.
- **Analytics:** `lib/ticketing/analytics.ts#emitTicketAnalyticsEvent` writes trusted `ticket_analytics_events`; use this after attribution/ledger writes. Browser telemetry cannot be the financial source.
- **Notifications:** `lib/ticketing/notifications.ts` provides ticketing notification patterns; promoter notifications should use the existing notification event/outbox conventions rather than direct browser-only state.

## Outstanding payment questions

The repository confirms a Stripe Checkout Session, signature verification, and an idempotency receipt. It does not yet prove deployed Stripe endpoint configuration, the live shape of `ticket_provider_events`, or chargeback/recovery semantics. These must be verified against the linked remote project before Phase 6, but they do not justify adding promoter schema before the broader FK drift is resolved.
