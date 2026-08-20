# COM-015 Fee Calculations and Snapshots Inventory

Date: 2026-08-12

Source task: COM-015 — Document current fee calculations and snapshots.

## Scope

This inventory records current fee calculation, fee rule, fee persistence, and fee snapshot behavior before canonical `commerce_fee_snapshots` are introduced.

The suite requires completed transactions to retain immutable fee snapshots and later calls for:

- fee snapshot strategy,
- fee rule versioning,
- fixed, percentage, minimum, and maximum fees,
- transaction fee snapshots,
- platform fee reports,
- platform fee treatment preview.

No fee behavior or provider mutation was changed for this task.

## Current Fee Models

The repo currently has four fee patterns:

1. Marketplace fee rules and an order-level applied fee snapshot.
2. Ticketing fee config and scalar fee columns plus metadata `fee_breakdown`.
3. Photo purchase fee calculation using the legacy marketplace decimal helper.
4. Finance ledger rows that record fee categories, but not the original calculation rule.

There is not yet a canonical `commerce_fee_snapshots` table.

## Marketplace Fee Rules

Paths:

- `supabase/migrations/20260728000010_marketplace_fee_rules.sql`
- `app/api/marketplace/admin/fee-rules/route.ts`
- `lib/marketplace/fee-calculator.ts`

`marketplace_fee_rules` stores:

- version,
- description,
- percentage fee as decimal rate,
- fixed fee in cents,
- minimum fee in cents,
- maximum fee in cents,
- account scope,
- listing-kind scope,
- effective date range,
- active flag,
- creator.

Admin fee rule API behavior:

- creates new rule versions,
- lists fee rules,
- toggles active/inactive,
- never deletes fee rules,
- documents that existing orders' `applied_fee_snapshot` is immutable.

Auth gap:

- this API still uses marketplace admin surface access rather than the new Commerce Operations capability set.

Currency gap:

- fixed/min/max fee amounts are cents, but fee rules do not store currency. This is acceptable for single-currency operation, but needs currency scoping before multi-currency Commerce APIs rely on fixed fee rules.

## Marketplace Fee Calculation

Path: `lib/marketplace/fee-calculator.ts`

`loadActiveFeeSnapshot` loads active rules and returns a `FeeSnapshot` with:

- rule id,
- rule version,
- percentage fee,
- fixed fee cents,
- minimum fee cents,
- maximum fee cents,
- description.

Fallback:

- hardcoded 10% default snapshot when no active rule exists.

`calculateFeeBreakdown` works in cents:

- rounds subtotal cents,
- applies percentage fee,
- adds fixed fee,
- applies min/max,
- rounds tax cents,
- returns subtotal/platform/tax/total cents plus the snapshot.

Risk:

- the rule matching score does not fully exclude nonmatching account/listing scope; it scores matching/all rules higher, but a nonmatching rule may still be present in the candidate set. Later fee rule work should harden selection before broad admin use.

## Marketplace Fee Persistence

Path: `app/api/marketplace/checkout/route.ts`

At checkout:

- `feeSnapshot` is loaded from `marketplace_fee_rules`,
- `feeBreakdown` is calculated in cents,
- order decimal columns are populated from cents with `/ 100`,
- `marketplace_orders.applied_fee_snapshot` stores the fee snapshot object,
- payout ledger stores `feeSnapshotId` in metadata,
- Stripe Checkout includes the platform fee as a line item,
- Stripe Connect `application_fee_amount` uses platform fee cents.

Snapshot strength:

- marketplace orders do have an immutable-looking applied fee snapshot column.

Snapshot gaps:

- the snapshot stores rule inputs but not the full computed fee breakdown as a typed record,
- payout ledger stores only fee snapshot id in metadata, not a full snapshot,
- marketplace order items do not carry item-level fee allocation,
- no standalone `commerce_fee_snapshots` record exists.

## Legacy Marketplace and Photo Purchase Fees

Paths:

- `lib/marketplace/fees.ts`
- `app/api/photos/purchase/route.ts`

The legacy fee helper:

- takes decimal major-unit subtotal,
- applies default 10% platform fee,
- rounds with `Math.round(amount * 100) / 100`,
- returns decimal `platformFee`, `sellerPayout`, `taxAmount`, `total`, and `buyerTotal`.

Photo purchase:

- stores `platform_fee` and `seller_payout` decimal values,
- converts the fee to Stripe cents with `Math.round(fees.platformFee * 100)`,
- sends `application_fee_amount` to Stripe.

Snapshot gaps:

- no fee rule/version/snapshot is stored with photo purchase,
- currency is hardcoded `usd` in Stripe calls,
- fee calculation is not tied to marketplace fee rules.

## Ticketing Fee Configuration

Paths:

- `supabase/migrations/20260712120000_event_ticketing_foundation.sql`
- `app/api/ticketing/config/route.ts`

`event_ticketing_config` stores:

- currency,
- platform fee type,
- platform fee amount,
- processing fee passthrough flag,
- tax enabled flag,
- tax rate.

Supported platform fee types:

- flat per ticket,
- percentage,
- flat per order,
- none.

Config updates are event-scoped and require ticketing permission, but there is no versioned fee-rule history or immutable config snapshot at the table level.

## Ticketing Fee Calculation

Paths:

- `lib/ticketing/fees.ts`
- `lib/ticketing/orders.ts`
- `app/api/ticketing/enhanced/route.ts`

`calculateTicketFees` works in decimal major units:

- subtotal = unit price times quantity,
- discount applied,
- platform fee based on event config,
- tax based on event config,
- processing fee defaulted to 3% unless passthrough disabled,
- buyer total rounded to two decimals.

Fallback path:

- when ticketing v2 is disabled, processing fee is approximated as 3% and platform/tax are zero.

Order persistence:

- `ticket_sales.total_amount`
- `ticket_sales.discount_amount`
- `ticket_sales.platform_fee_amount`
- `ticket_sales.processing_fee_amount`
- `ticket_sales.tax_amount`
- `ticket_sales.net_amount`
- `ticket_sales.metadata.fee_breakdown`

Snapshot strength:

- ticket order metadata stores the computed `fee_breakdown` for later inspection.

Snapshot gaps:

- no immutable fee-rule/config version is stored,
- no separate fee snapshot id exists,
- fee config can change after the order, and the order cannot prove which config row/version was used except by the metadata values,
- ticketing currency is inferred from event config, not snapshotted on the sale row.

## Ticketing Ledger Fee Rows

Paths:

- `lib/ticketing/finalize.ts`
- `lib/ticketing/ledger.ts`

After ticket payment/finalization, ticketing writes finance ledger rows:

- ticket revenue income row,
- platform fee expense row when platform fee is positive,
- processing fee expense row when processing fee is positive,
- tax expense row when tax is positive.

Rows are written to `financial_transactions` with idempotency keys.

These rows are useful accounting entries, but they are not fee calculation snapshots:

- they use decimal legacy `amount`,
- they do not store the fee config/rule version,
- they do not store currency,
- they do not preserve the full calculation inputs.

## Ticketing Reports

Path: `app/api/ticketing/reports/route.ts`

Reports aggregate:

- gross revenue,
- refunds,
- platform fees,
- discounts,
- net revenue.

The report reads scalar decimal fee columns from `ticket_sales`.

Risk:

- report aggregation assumes a single implicit currency and decimal major-unit values.

## Subscription Fees

Paths:

- `app/api/subscriptions/checkout/route.ts`
- `app/api/subscriptions/tiers/sync/route.ts`
- `app/api/subscriptions/webhook/route.ts`

Subscriptions delegate price, recurring interval, and billing behavior to Stripe Price ids.

Artist tier sync:

- reads decimal tier price,
- converts to Stripe cents,
- hardcodes `usd`,
- stores Stripe product and price ids.

Local subscription rows store Stripe price id but do not snapshot:

- plan amount,
- plan currency,
- Stripe application/platform fee treatment,
- fee rule version.

## Promotion Fees

COM-013 found no dedicated paid-promotion checkout/fee path.

Promotion fee snapshots are therefore absent. Later promotion commerce work needs an explicit fee model rather than reusing organic campaign `budget`/`spent` fields.

## Payout and Settlement Fee Treatment

Paths:

- `marketplace_payout_ledger`
- `app/api/ticketing/settlements/route.ts`
- `lib/admin/finance-command.service.ts`

Marketplace payout ledger stores platform fee decimal amount and fee snapshot id metadata.

Ticketing settlements read financial transactions by fee categories to compute settlement views.

Admin finance settlement commands transition accounting status but do not calculate or snapshot fees.

Gap:

- seller payable and settlement reconciliation do not currently point to immutable canonical fee snapshots.

## Snapshot Coverage Matrix

| Area | Fee Rule Source | Fee Calculation Unit | Persisted Fee Values | Snapshot Quality |
| --- | --- | --- | --- | --- |
| Marketplace checkout | `marketplace_fee_rules` or fallback 10% | cents | order decimal columns, payout decimal columns | partial order-level `applied_fee_snapshot` |
| Photo purchase | hardcoded 10% helper default | decimal major units | purchase decimal fields | no rule/version snapshot |
| Ticketing checkout | `event_ticketing_config` or v2-disabled fallback | decimal major units | `ticket_sales` scalar columns and metadata `fee_breakdown` | computed values only, no config version |
| Ticketing ledger | ticket order fee values | decimal major units | `financial_transactions` rows by category | accounting entries, not calculation snapshots |
| Subscriptions | Stripe Price | Stripe/provider | Stripe price id only | no local amount/currency/fee snapshot |
| Promotions | none found | none | none | absent |
| Music royalties | not platform fee oriented | bigint minor units | royalty deductions/holds/payable | royalty accounting model, not commerce fee snapshot |

## Gaps for Later Phases

1. No canonical `commerce_fee_snapshots` table exists.
2. Marketplace has the strongest fee snapshot, but it is stored inline on orders and not normalized.
3. Ticketing stores computed fee breakdown but not fee config version.
4. Ticketing fee config updates are not versioned.
5. Photo marketplace uses a separate hardcoded 10% helper and no fee rule snapshot.
6. Subscription local records do not snapshot plan amount, currency, or fee treatment.
7. Promotion paid-fee workflows are missing.
8. Marketplace fixed/min/max fee rules are cents without currency scoping.
9. Legacy finance ledger fee rows lack currency and calculation provenance.
10. Fee report paths aggregate decimal rows with implicit currency.
11. Future canonical APIs need `{ amountMinor, currency }` fee DTOs and issue rules for missing/mismatched snapshots.

## Verification Commands

Commands run for this inventory:

```bash
rg -n "COM-015|fee calculation|fee snapshot|fee rule|platform fee|processing fee|tax|snapshot|Completed transactions must retain" docs/admin-commerce-ops/06_CANONICAL_COMMERCE_DOMAIN_MODEL.md docs/admin-commerce-ops/08_UNIFIED_TRANSACTION_LEDGER.md docs/admin-commerce-ops/14_PAYMENTS_REFUNDS_DISPUTES_AND_CHARGEBACKS.md docs/admin-commerce-ops/15_PAYOUTS_SETTLEMENTS_AND_RECONCILIATION.md docs/admin-commerce-ops/18_SUBSCRIPTIONS_FEES_AND_PROMOTIONS.md docs/admin-commerce-ops/19_SUPABASE_DATA_MODEL_AND_MIGRATIONS.md docs/admin-commerce-ops/25_IMPLEMENTATION_TASK_CATALOG.md
rg -n "feeSnapshot|FeeSnapshot|applied_fee_snapshot|fee_breakdown|feeSnapshotId|platform_fee|processing_fee|tax_amount|calculate.*Fee|loadActiveFeeSnapshot|marketplace_fee_rules|platformFee|processingFee|fee_rule|snapshot" app lib supabase/migrations -g '*.ts' -g '*.tsx' -g '*.sql'
find app/api lib supabase/migrations -path '*fee*' -o -path '*fees*' | sort
rg -n "application_fee_amount|processing_fee_amount|platform_fee_amount|fee_breakdown|applied_fee_snapshot|feeSnapshot|tax_amount" app/api lib -g '*.ts'
sed -n '1,180p' app/api/marketplace/admin/fee-rules/route.ts
sed -n '1,220p' lib/marketplace/fee-calculator.ts
sed -n '1,220p' lib/marketplace/fees.ts
sed -n '280,455p' app/api/marketplace/checkout/route.ts
sed -n '1,220p' lib/ticketing/fees.ts
sed -n '1,170p' lib/ticketing/orders.ts
sed -n '140,195p' lib/ticketing/finalize.ts
sed -n '1,135p' lib/ticketing/ledger.ts
sed -n '1,120p' app/api/ticketing/config/route.ts
sed -n '80,160p' app/api/photos/purchase/route.ts
sed -n '40,80p' app/api/subscriptions/checkout/route.ts
sed -n '1,110p' supabase/migrations/20260728000010_marketplace_fee_rules.sql
sed -n '24,116p' supabase/migrations/20260712120000_event_ticketing_foundation.sql
```

## COM-015 Result

COM-015 is complete as an inventory task. The implementation risk remains open: fee calculations exist in several domains, but only marketplace has a partial immutable order-level fee snapshot. The Commerce Operations buildout still needs a canonical fee snapshot strategy, versioned ticketing/subscription/promotion fee treatment, and minor-unit fee DTO adapters.
