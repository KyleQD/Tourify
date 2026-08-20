# Audit Baseline

## Verified Admin Surfaces

### `/admin/dashboard/marketplace`

Current responsibilities include:

- Orders tab.
- Moderation tab.
- Payouts tab.
- Moderation search, status filtering, sorting, pagination, resolution notes, and status changes.
- Order list loading.
- Payout list loading.

### `/admin/dashboard/marketplace/orders/[id]`

Current order details include:

- order status,
- payment status,
- total,
- currency,
- created time,
- buyer and seller identifiers,
- order items,
- fulfillment state,
- payout ledger rows,
- seller net,
- platform fee,
- payout reference,
- retry attempts,
- retry metadata,
- payout retry action.

## Verified API Patterns

### Orders

The admin order API currently supports:

- admin authentication,
- payment-status filter,
- limit and offset,
- exact count,
- marketplace order items,
- secondary buyer-profile lookup,
- buyer name and email projection.

### Moderation

The moderation API currently supports:

- authentication,
- `profiles.role === admin` authorization,
- Zod validation,
- pagination,
- status filters,
- text search,
- sorting,
- listing and order context,
- resolution updates,
- assigned administrator.

## Known Schema Surface Requiring Full Inventory

The Supabase schema contains commercial domains such as:

- `marketplace_listings`
- `marketplace_listing_variants`
- `marketplace_external_listings`
- `marketplace_storefronts`
- `marketplace_orders`
- `marketplace_order_items`
- `marketplace_payment_events`
- `marketplace_checkout_attempts`
- `marketplace_payout_ledger`
- `marketplace_fee_rules`
- `marketplace_moderation_queue`
- `marketplace_service_definitions`
- `marketplace_service_requests`
- `marketplace_service_offers`
- `marketplace_service_bookings`
- `marketplace_external_clicks`
- `marketplace_integrations`
- `marketplace_entitlements`
- `merchandise_transactions`
- `merchandise_sales`
- `merchandise_inventory`
- `ticket_sales`
- `tickets`
- `ticket_allocations`
- `ticket_inventory_reservations`
- `ticket_transfers`
- `ticket_checkins`
- `ticket_credentials`
- `ticket_revenue_allocations`
- `event_ticketing_config`
- `event_ticketing_grants`
- `ticket_stripe_webhook_events`
- `ticket_ownership_events`
- `subscriptions`
- `financial_transactions`
- `financial_audit_log`
- `settlements`
- `revenue`
- `promotion_posts`
- `event_promo_codes`
- `promo_codes`

## Baseline Questions the Build Agent Must Answer

1. Which tables are actively written today?
2. Which tables are legacy, unused, partial, or future-facing?
3. Which payment providers are configured?
4. Which provider is the source of truth for each payment and payout state?
5. How are checkout attempts connected to orders?
6. How are tickets connected to payment and order records?
7. How are seller fees calculated and snapshotted?
8. How are refunds represented?
9. How are chargebacks represented?
10. How are seller balances derived?
11. Which payout operations are provider-backed versus internal status updates?
12. How are subscriptions connected to entitlements?
13. How are promotions paid for and reconciled?
14. How are external listings distinguished from native checkout?
15. Which roles can view buyer PII?
16. Which roles can retry payouts or issue refunds?
17. Which webhook routes verify signatures and prevent replay?
18. Which routes use service-role access?
19. Which tables and views have RLS?
20. Which financial events are immutable?
21. Which records can be edited after settlement?
22. Whether current order item count represents lines or quantities.
23. Whether current UI hides API errors as empty states.
24. Whether mixed currencies exist.
25. Whether all monetary values use consistent units.

## Required Pre-Implementation Deliverables

- Commerce route map.
- Commerce API map.
- Provider integration map.
- Money movement sequence diagrams.
- Schema and RLS inventory.
- Canonical-versus-legacy table classification.
- Status dictionary.
- Permission matrix.
- Representative transaction traces for marketplace, ticketing, subscription, and promotion.
- Reconciliation baseline.
- Current error and retry behavior.
- Current test coverage.
- Feature-flag inventory.
