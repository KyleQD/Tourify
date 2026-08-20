# COM-016 Seller Balance Derivation Inventory

Date: 2026-08-12

Source task: COM-016 - Document current seller balance derivation.

## Scope

This inventory records how the current code derives seller balances, payout amounts, and settlement shares before the canonical Commerce Operations seller balance read model is introduced.

The suite's target balance model is:

```text
Gross captured
- discounts
- refunds
- processor fees
- platform fees
+ approved adjustments
= seller payable
```

Then:

```text
Seller payable
- holds
- prior payouts
= available payout balance
```

No schema, provider behavior, payout status, or financial calculation was changed for this task.

## Current Balance Models

The repo does not yet have a unified commerce seller balance table or read model.

Current balance-adjacent behavior is split across:

1. Marketplace seller analytics and payout ledger rows.
2. Photo purchase `seller_payout` rows.
3. Music royalties allocation, hold, payout, and reconciliation tables.
4. Ticketing event settlement and revenue-share calculations.
5. Legacy finance settlement tables.

Only music royalties currently has a domain model that resembles the suite's payable, held, payout, and reconciliation structure, but it is not wired as a general commerce seller balance.

## Marketplace Seller Analytics

Paths:

- `lib/marketplace/seller-analytics.ts`
- `app/api/marketplace/analytics/route.ts`
- `components/marketplace/seller-store-dashboard.tsx`
- `lib/marketplace/__tests__/seller-analytics-and-curation.test.ts`

Seller analytics currently derives:

- `grossRevenue` from paid `marketplace_orders.total_amount` within the selected date range.
- `paidOrders` from paid orders in range.
- `unitsSold` from order item quantities on paid orders in range.
- `pendingPayouts` from `marketplace_payout_ledger.net_amount` where `payout_status` is `pending` or `scheduled`.

The API loads:

- `marketplace_orders` filtered by `seller_user_id`,
- `marketplace_payout_ledger` filtered by `seller_user_id`.

The dashboard component duplicates the same pending payout formula locally when it has row data.

Current formula:

```text
pendingPayouts = sum(marketplace_payout_ledger.net_amount)
where payout_status in ('pending', 'scheduled')
```

What this is not:

- not a full available balance,
- not a paid balance calculation,
- not a held balance calculation,
- not a negative balance calculation,
- not multi-currency safe,
- not reduced by prior successful payouts except indirectly through status exclusion,
- not adjusted for refunds, disputes, processor fees, or manual adjustments beyond whatever status was placed on the payout row.

The unit test covers only the current limited aggregation behavior: paid order revenue and pending payout summation.

## Marketplace Payout Ledger

Paths:

- `supabase/migrations/20260410120000_marketplace_core.sql`
- `app/api/marketplace/checkout/route.ts`
- `lib/marketplace/order-lifecycle.ts`
- `lib/marketplace/webhook-processor.ts`
- `app/api/marketplace/payouts/route.ts`
- `app/api/admin/marketplace/orders/[id]/route.ts`
- `app/admin/dashboard/marketplace/orders/[id]/page.tsx`

The `marketplace_payout_ledger` table stores one row per order:

- `gross_amount numeric(10,2)`
- `platform_fee_amount numeric(10,2)`
- `net_amount numeric(10,2)`
- `payout_status text`
- `payout_reference text`
- `payout_provider text`
- `available_at`
- `paid_at`
- `metadata`

Allowed statuses:

- `pending`
- `scheduled`
- `paid`
- `failed`
- `on_hold`

There is no first-class currency column on `marketplace_payout_ledger`. Currency must be inferred from the related order or metadata.

### Row Creation

Marketplace checkout writes the payout row when it creates an order.

Current persisted values:

```text
gross_amount = feeBreakdown.subtotalCents / 100
platform_fee_amount = feeBreakdown.platformFeeCents / 100
net_amount = (feeBreakdown.subtotalCents - feeBreakdown.platformFeeCents) / 100
payout_status = 'pending'
payout_provider = 'stripe_connect'
available_at = now + 7 days
metadata.taxAmount = feeBreakdown.taxCents / 100
metadata.buyerTotal = feeBreakdown.totalCents / 100
metadata.sellerStripeAccountId = seller Stripe account id
metadata.feeSnapshotId = fee snapshot rule id
```

Inventory risk:

- The order total includes the platform fee as buyer-paid fee, while the payout ledger `net_amount` also subtracts the platform fee from seller subtotal. That may be intentional commission treatment, but it needs reconciliation proof before the canonical seller payable model relies on it.

### Status Transitions

The paid lifecycle helper sets:

- paid checkout: order `payment_status = paid`, payout `payout_status = scheduled`.
- failed payment: payout `payout_status = on_hold`.
- refunded charge: payout `payout_status = on_hold`.

The webhook processor applies those patches to `marketplace_orders` and `marketplace_payout_ledger`.

No current code path found in this inventory computes:

- total held amount,
- total paid amount,
- prior payout subtraction,
- negative balance,
- dispute balance,
- manual adjustment balance,
- provider-confirmed available balance.

### Seller and Admin Surfaces

Seller payout listing:

- `app/api/marketplace/payouts/route.ts` returns raw payout ledger rows for the authenticated seller.
- It does not compute a balance rollup.

Admin order detail:

- `app/api/admin/marketplace/orders/[id]/route.ts` loads one order with its payout ledger rows.
- `app/admin/dashboard/marketplace/orders/[id]/page.tsx` displays row status, net amount, platform fee, payout reference, and retry attempts.
- It does not compute seller-level balance across orders.

High-risk action note:

- `app/api/admin/marketplace/payouts/[id]/retry/route.ts` currently changes eligible `on_hold`, `failed`, or `pending` rows to `scheduled`.
- It is a payout safety concern for later COM tasks, but COM-016 only records that this retry path does not re-derive a seller balance before rescheduling.

## Photo Purchase Seller Payouts

Paths:

- `app/api/photos/purchase/route.ts`
- `app/api/photos/purchase/webhook/route.ts`
- `supabase/migrations/20250208000000_photo_album_marketplace_system.sql`
- `lib/marketplace/fees.ts`

Photo purchases store seller payout values per purchase:

- `purchase_price decimal`
- `platform_fee decimal`
- `seller_payout decimal`
- `payment_status`
- `transaction_id`

The purchase route uses the legacy marketplace fee helper:

```text
fees = calculateMarketplaceFeeBreakdown({ subtotal: photo.sale_price })
purchase_price = fees.buyerTotal
platform_fee = fees.platformFee
seller_payout = fees.sellerPayout
```

Webhook updates set purchase status to:

- `completed`
- `failed`
- `refunded`

No current photo purchase path found in this inventory computes a seller balance rollup, hold balance, paid balance, negative balance, or payout readiness summary. Photo purchases are therefore separate seller receivable rows rather than part of the marketplace payout ledger.

## Music Royalties

Paths:

- `supabase/migrations/20260717241000_music_royalties_allocations_payouts_statements.sql`
- `app/api/artist/music/payouts/status/route.ts`
- `lib/music/royalties/payout-provider.ts`

Music royalties has the strongest current payable model.

Allocation rows store integer minor units:

- `gross_minor`
- `deductions_minor`
- `recouped_minor`
- `held_minor`
- `payable_minor`
- `currency`

Hold rows store:

- `amount_minor`
- `currency`
- `hold_type`
- `status`
- `reason`
- `released_at`

Payout instructions store:

- `amount_minor`
- `currency`
- `status`
- `idempotency_key`
- `provider_transfer_id`
- `failure_reason`
- `paid_at`

Reconciliations store:

- `expected_minor`
- `paid_minor`
- `variance_minor`
- `status`

The artist payout status API returns payout batches and instructions for the authenticated owner. The payout provider uses idempotency keys and can submit Stripe Connect transfers when dry run is disabled.

Gap:

- This is scoped to music royalty owners and payee parties, not marketplace sellers or all commerce transactions.
- It cannot currently answer a unified Commerce Operations seller balance query across marketplace, photo, ticketing, subscription, promotion, and service transactions.

## Ticketing Settlements

Paths:

- `app/api/ticketing/settlements/route.ts`
- `lib/ticketing/settlements.ts`
- `supabase/migrations/20260602130000_settlements.sql`
- `supabase/migrations/20260719223037_admin_tour_foundation_security.sql`

Ticketing settlement currently derives event-level revenue shares rather than seller balances.

The settlement API loads:

- active `ticket_revenue_allocations`,
- event `financial_transactions`,
- the event `settlements` row.

Current event settlement formula:

```text
gross = sum(financial_transactions.amount)
where type = 'income' and category = 'ticket_revenue'

refunds = sum(financial_transactions.amount)
where category = 'refund'

fees = sum(financial_transactions.amount)
where category in ('platform_fee', 'processing_fee')

net = max(0, gross - refunds - fees)
```

Then `calculateRevenueShares` distributes `net` through active allocations by priority:

- flat shares,
- percentage shares,
- remainder share.

Legacy `settlements` rows store:

- `total_gross_revenue`
- `total_expenses`
- generated `net_profit`
- `artist_payout`
- `venue_payout`
- `promoter_payout`
- `status`

Gap:

- This is event/tour settlement math, not seller balance math.
- It uses decimal major-unit amounts.
- It does not track held amount, prior payouts, payout destination status, or available seller balance.

## Current Gaps Against Suite Balance Model

Missing canonical artifacts:

- `commerce_seller_balances` read model.
- Currency-aware seller balance DTO.
- Unified seller payable calculation across commerce sources.
- Dedicated hold records for marketplace seller balances.
- Dedicated adjustment records.
- Prior payout subtraction logic.
- Negative balance calculation.
- Dispute balance calculation.
- Provider-backed available balance verification.
- Canonical reconciliation between seller payable, holds, prior payouts, and available payout balance.

Marketplace-specific gaps:

- payout ledger lacks first-class currency,
- status values are narrower than the suite's payout states,
- paid amount is not derived as a seller balance component,
- held amount is not derived beyond row status,
- refunds move rows to `on_hold` instead of a refund/negative-balance model,
- admin and seller surfaces show row data, not seller-level balance,
- payout retry does not recompute balance before rescheduling.

Cross-domain gaps:

- photo purchase seller payouts are not included in marketplace payout ledger,
- music royalties use a separate payee-party model,
- ticketing settlements use event allocations, not commerce seller balances,
- legacy finance settlements are decimal and event/tour scoped.

## Implementation Implications

Later Commerce Operations phases should treat current marketplace `pendingPayouts` as a legacy display metric, not as available payout balance.

Before enabling canonical payout operations, the buildout should add a read model that can compute, per seller and currency:

- gross captured,
- discounts,
- refunds,
- disputes,
- platform fees,
- processing fees,
- adjustments,
- seller payable,
- pending amount,
- available amount,
- held amount,
- paid amount,
- disputed amount,
- negative balance,
- source transaction references,
- provider state freshness.

The first safe additive step is to create adapters that expose current marketplace, photo, music, ticketing, and finance records in normalized minor-unit form while preserving legacy decimal columns until reconciliation parity is proven.

## Verification

Commands run:

- `rg -n "seller balance|seller payable|balance|payout|gross sales|held amount|paid amount|available amount|available payout|payable" docs/admin-commerce-ops/11_SELLERS_STOREFRONTS_AND_BALANCES.md docs/admin-commerce-ops/15_PAYOUTS_SETTLEMENTS_AND_RECONCILIATION.md docs/admin-commerce-ops/08_UNIFIED_TRANSACTION_LEDGER.md docs/admin-commerce-ops/25_IMPLEMENTATION_TASK_CATALOG.md docs/admin-commerce-ops/02_AUDIT_BASELINE.md`
- `sed -n '1,240p' lib/marketplace/seller-analytics.ts`
- `sed -n '1,120p' app/api/marketplace/analytics/route.ts`
- `sed -n '1,140p' app/api/marketplace/payouts/route.ts`
- `sed -n '136,164p' supabase/migrations/20260410120000_marketplace_core.sql`
- `sed -n '220,365p' app/api/marketplace/checkout/route.ts`
- `sed -n '1,130p' lib/marketplace/order-lifecycle.ts`
- `sed -n '130,240p' lib/marketplace/webhook-processor.ts`
- `sed -n '1,180p' lib/marketplace/seller-payout-readiness.ts`
- `sed -n '1,260p' app/api/admin/marketplace/orders/[id]/route.ts`
- `sed -n '1,240p' app/admin/dashboard/marketplace/orders/[id]/page.tsx`
- `sed -n '1,120p' app/api/admin/marketplace/payouts/[id]/retry/route.ts`
- `sed -n '70,135p' app/api/photos/purchase/route.ts`
- `sed -n '45,130p' app/api/photos/purchase/webhook/route.ts`
- `sed -n '160,215p' supabase/migrations/20250208000000_photo_album_marketplace_system.sql`
- `sed -n '1,130p' app/api/artist/music/payouts/status/route.ts`
- `sed -n '40,205p' supabase/migrations/20260717241000_music_royalties_allocations_payouts_statements.sql`
- `sed -n '1,160p' lib/music/royalties/payout-provider.ts`
- `sed -n '1,160p' app/api/ticketing/settlements/route.ts`
- `sed -n '1,180p' lib/ticketing/settlements.ts`

Tests:

- Not run. COM-016 is documentation-only inventory; existing seller analytics unit coverage was inspected as evidence of current limited aggregation behavior.
