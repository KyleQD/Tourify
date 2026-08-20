# COM-014 Money Units and Currency Handling Inventory

Date: 2026-08-12

Source task: COM-014 — Document current money units and currency handling.

## Scope

This inventory records current money representations across commerce-adjacent code before canonical `Money` contracts are introduced.

The target suite contract is:

```ts
interface Money {
  amountMinor: number
  currency: string
}
```

Suite rules:

- use integer minor units,
- preserve provider values,
- validate currency across related records,
- never aggregate mixed currencies without explicit conversion,
- use currency-specific decimal rules,
- store fee and refund snapshots,
- avoid floating-point settlement calculations.

No schema or provider behavior was changed for this task.

## Current Patterns

The repo currently uses three money styles:

1. Decimal major-unit values in legacy commerce tables.
2. Integer cents/minor units in newer helpers, provider calls, and newer finance/music tables.
3. Decimal UI/business values that are rounded with `Math.round(value * 100) / 100`.

The canonical Commerce Operations buildout must bridge all three without breaking existing checkout, ticketing, payout, and finance flows.

## Marketplace Core

### Database Units

Path: `supabase/migrations/20260410120000_marketplace_core.sql`

Marketplace core tables use decimal major units:

- `marketplace_listings.currency text default 'USD'`
- `marketplace_listings.base_price numeric(10,2)`
- `marketplace_listing_variants.price numeric(10,2)`
- `marketplace_orders.currency text default 'USD'`
- `marketplace_orders.subtotal_amount numeric(10,2)`
- `marketplace_orders.platform_fee_amount numeric(10,2)`
- `marketplace_orders.tax_amount numeric(10,2)`
- `marketplace_orders.total_amount numeric(10,2)`
- `marketplace_order_items.unit_price numeric(10,2)`
- `marketplace_order_items.line_total numeric(10,2)`
- `marketplace_payout_ledger.gross_amount numeric(10,2)`
- `marketplace_payout_ledger.platform_fee_amount numeric(10,2)`
- `marketplace_payout_ledger.net_amount numeric(10,2)`

Currency exists on listings and orders. `marketplace_payout_ledger` does not have a first-class currency column and currently relies on order context and metadata.

### Calculation and Stripe Conversion

Paths:

- `lib/marketplace/fee-calculator.ts`
- `app/api/marketplace/checkout/route.ts`

The newer marketplace fee calculator uses cents internally:

- `subtotalCents`
- `platformFeeCents`
- `taxCents`
- `totalCents`
- fee-rule fixed/min/max amounts in cents

At checkout, cents are converted back to decimal DB values with `/ 100` when writing marketplace orders and payout ledger rows.

Stripe Checkout uses minor units:

- line item `unit_amount: Math.round(item.unitPrice * 100)`
- platform fee line item `unit_amount: feeBreakdown.platformFeeCents`
- Connect `application_fee_amount: feeBreakdown.platformFeeCents`
- Stripe currency lowercased from the order currency.

Risk:

- listing item prices are still decimal numbers before Stripe conversion,
- payout ledger rows are decimal and currency-less,
- the fee calculator is cents-based but the persistence layer is not.

### Legacy Marketplace Fee Helper

Path: `lib/marketplace/fees.ts`

This helper accepts decimal major-unit inputs and rounds to two decimals using `Math.round(amount * 100) / 100`.

It is used by photo purchase flows and remains a floating-point major-unit helper, not a canonical minor-unit helper.

## Marketplace Fee Rules

Path: `supabase/migrations/20260728000010_marketplace_fee_rules.sql`

`marketplace_fee_rules` stores:

- `percentage_fee numeric(5,4)`
- `fixed_fee_cents integer`
- `minimum_fee_cents integer`
- `maximum_fee_cents integer`

This table already separates percentage decimal rates from fixed/min/max minor-unit fee components.

Gap:

- fee rules do not include a currency column, so fixed cent amounts are implicitly tied to the checkout currency and should be constrained or snapshotted before multi-currency expansion.

## Ticketing

### Database Units

Paths:

- `supabase/migrations/20260328130000_ticketing_v2.sql`
- `supabase/migrations/20260712120000_event_ticketing_foundation.sql`

Ticketing uses decimal major units:

- `ticket_types.price numeric`
- `ticket_sales.unit_price numeric`
- `ticket_sales.total_amount numeric`
- `ticket_sales.discount_amount numeric`
- `ticket_sales.platform_fee_amount numeric`
- `ticket_sales.processing_fee_amount numeric`
- `ticket_sales.tax_amount numeric`
- `ticket_sales.net_amount numeric`

`event_ticketing_config.currency` exists and defaults to lowercase `usd`.

Risk:

- `ticket_sales` does not have a first-class currency column,
- the config currency is lowercase while many other commerce tables default to uppercase `USD`,
- row-level ticket sale currency must currently be inferred from event config.

### Calculation and Stripe Conversion

Paths:

- `lib/ticketing/fees.ts`
- `lib/ticketing/orders.ts`
- `app/api/ticketing/enhanced/route.ts`
- `app/api/admin/ticketing/refund/route.ts`

`calculateTicketFees` accepts decimal major-unit amounts and rounds to two decimals with `roundMoney`.

Ticket order creation stores decimal major-unit totals into `ticket_sales`.

Stripe checkout uses cents:

- `unit_amount: Math.round(fees.buyerTotal * 100)`
- hardcoded Stripe currency `usd`.

Refunds convert decimal refund amounts to cents:

- `refundAmount = Math.round(decimal * 100) / 100`
- `refundAmountCents = Math.round(refundAmount * 100)`

Risk:

- ticketing math is decimal/floating-point before conversion,
- Stripe currency is hardcoded `usd` in ticket purchase/refund paths,
- currency is not snapshotted on the sale row.

## Finance and Budgets

### Legacy Finance Tables

Path: `supabase/migrations/20260328140000_financial_tables.sql`

Legacy finance tables use decimal major units:

- `financial_transactions.amount numeric`
- `budgets.allocated_amount numeric`
- `budgets.spent_amount numeric`

These rows do not include currency columns in the base table.

Paths:

- `lib/admin/finance-command-schemas.ts`
- `app/api/admin/finances/route.ts`

Finance command schemas accept `amount`, `allocated_amount`, `artist_payout`, `venue_payout`, and related fields as decimal numbers. The admin finances route returns numeric totals from `get_finance_overview` and legacy rows.

Risk:

- currency is not present on legacy finance transaction/budget rows,
- mixed-currency aggregation cannot be detected in the legacy shape,
- command schemas use generic numbers rather than canonical Money.

### Newer Admin Finance Surfaces

Paths:

- `app/api/admin/finances/commitments/route.ts`
- `app/api/admin/finances/expenses/route.ts`
- `app/api/admin/finances/budget-rollup/route.ts`

Newer admin finance endpoints already expose minor-unit shapes:

- purchase orders read `amount_minor` and `currency`, then respond with `amountMinor`
- expense reports read `total_amount_minor` and `currency`, then respond with `totalAmountMinor`
- budget rollup reads `total_minor_units`, `amount_minor_units`, and `currency`

These are useful patterns for the canonical Commerce Operations API contract, but they coexist with decimal legacy finance rows.

## Organization Currency Configuration

Paths:

- `app/api/admin/organization/settings/route.ts`
- `app/api/admin/organization/finance-settings/route.ts`

Org settings expose `baseCurrency` from `admin_org_settings.base_currency`.

Finance settings expose FX config:

- `finance_fx_configs.base_currency`
- `finance_fx_configs.reporting_currency`

Risk:

- base/reporting currency exists as configuration, but most legacy commerce rows do not carry row-level currency or FX snapshots.

## Photo Marketplace

Path: `app/api/photos/purchase/route.ts`

Photo purchase uses decimal marketplace fee helper values:

- `purchase_price`
- `platform_fee`
- `seller_payout`

Stripe line items convert decimal values to cents with `Math.round(decimal * 100)` and hardcode currency `usd`.

Risk:

- photo purchase rows are decimal major-unit values,
- currency is hardcoded in provider calls and not evident as a first-class row field in the inspected purchase write.

## Subscriptions

Paths:

- `app/api/subscriptions/checkout/route.ts`
- `app/api/subscriptions/webhook/route.ts`
- `app/api/subscriptions/tiers/sync/route.ts`
- `supabase/migrations/20260413400000_stripe_connect_and_subscriptions.sql`

Subscription checkout delegates amount/currency to the Stripe Price id.

The `subscriptions` table stores:

- Stripe subscription id,
- Stripe price id,
- Stripe customer id,
- status,
- period dates,
- cancellation state.

It does not store recurring amount or currency locally.

Artist tier sync computes `priceInCents = Math.round(Number(tier.price) * 100)` and creates Stripe Prices in hardcoded `usd`.

Risk:

- local subscription rows cannot produce a complete Money value without resolving the Stripe Price or joining/snapshotting tier data,
- tier prices are decimal major units and Stripe currency is hardcoded `usd`.

## Music Royalties

Paths:

- `lib/music/royalties/money.ts`
- `app/api/artist/music/royalties/imports/route.ts`
- `supabase/migrations/20260717241000_music_royalties_allocations_payouts_statements.sql`

Music royalty systems already use integer minor units with bigint:

- `MoneyAmount { currency, minorUnits: bigint }`
- `parseMinorUnits` rejects non-integer values
- allocation math uses bigint rational shares
- `assertBalancedJournal` compares debit/credit minor units
- normalized import rows store `gross_royalty_minor`, `deductions_minor`, `net_royalty_minor`
- allocation, recoupment, hold, statement, batch, instruction, and reconciliation tables use `*_minor` bigint fields with currency.

This area is closest to the target canonical Money approach.

## Music Marketplace and Institutional Music Finance

Paths:

- `supabase/migrations/20260718001450_music_marketplace_offerings_investors.sql`
- `supabase/migrations/20260718001540_music_marketplace_positions_orders.sql`
- `app/api/music-marketplace/subscriptions/route.ts`

Music marketplace uses minor-unit columns for investment/order amounts:

- `target_raise_minor`
- `amount_minor`
- `price_minor`
- `fee_minor`
- `bid_minor`
- `ask_minor`
- `last_minor`
- `currency`

Some quantity-like values use `numeric(78,0)` and are not fiat money.

Risk:

- quantities and fiat minor amounts share a `*_minor` naming pattern and need typed DTOs to prevent mixing unit quantities with currency money.

## Logistics and Other Operational Finance

Path: `lib/logistics/money.ts`

Logistics explicitly documents its current convention:

- USD major-unit numbers,
- decimal-style operational costs,
- default currency `USD`.

This is not canonical for Commerce Operations, but it is useful evidence that adjacent admin finance areas still rely on major-unit numbers.

## Currency Case and Defaults

Observed defaults:

- marketplace listings/orders: `USD`
- event ticketing config: `usd`
- Stripe calls often lowercase currency manually or hardcode `usd`
- music royalties and newer finance generally use uppercase `USD`
- finance/org settings expose configurable base/reporting currencies

Risk:

- the canonical layer must normalize currency casing and validate ISO-style three-letter currency codes before exposing new Commerce APIs,
- lower/upper casing should be adapted at provider boundaries rather than leaking inconsistently through DTOs.

## Canonical Adapter Needs

Required before new commerce APIs expose money:

1. Convert marketplace decimal DB rows to `{ amountMinor, currency }` using the order/listing currency.
2. Add or infer payout ledger currency from the source order until a nullable first-class currency column exists.
3. Convert ticketing decimal sale rows to `{ amountMinor, currency }` using event ticketing config until sales carry currency directly.
4. Preserve Stripe provider minor-unit amounts from provider events where available.
5. Avoid mixed-currency aggregation in overview, ledger, payout, settlement, subscription, and promotion summaries.
6. Normalize currencies to uppercase in canonical responses while preserving provider casing at provider call boundaries.
7. Treat music royalty bigint amounts carefully when converting to JSON-safe numbers; large values may require string transport or range validation.
8. Keep legacy decimal DB columns supported through adapters until parity and backfills are proven.

## Verification Commands

Commands run for this inventory:

```bash
rg -n "COM-014|Money|amountMinor|minor|currency|decimal|numeric|cents|minor units|floating|float|fee|tax" docs/admin-commerce-ops/06_CANONICAL_COMMERCE_DOMAIN_MODEL.md docs/admin-commerce-ops/08_UNIFIED_TRANSACTION_LEDGER.md docs/admin-commerce-ops/14_PAYMENTS_REFUNDS_DISPUTES_AND_CHARGEBACKS.md docs/admin-commerce-ops/15_PAYOUTS_SETTLEMENTS_AND_RECONCILIATION.md docs/admin-commerce-ops/18_SUBSCRIPTIONS_FEES_AND_PROMOTIONS.md docs/admin-commerce-ops/19_SUPABASE_DATA_MODEL_AND_MIGRATIONS.md docs/admin-commerce-ops/25_IMPLEMENTATION_TASK_CATALOG.md
rg -n "amountMinor|minorUnits|amount_minor|minor|Cents|cents|toFixed|parseFloat|Math\\.round|numeric\\(|decimal\\(|money|currency|unit_amount|amount_total|gross_amount|net_amount|platform_fee|processing_fee|tax_amount|discount_amount" app lib supabase/migrations -g '*.ts' -g '*.tsx' -g '*.sql'
rg -n "create table.*(orders|transactions|sales|subscriptions|payout|settlement|campaign|fee|refund)|amount numeric|numeric\\(|decimal\\(|currency text|amount_minor|price numeric|total_amount|gross_amount|net_amount|platform_fee|processing_fee|tax_amount|discount_amount" supabase/migrations -g '*.sql'
find lib app -path '*money*' -o -path '*fee*' -o -path '*currency*' | sort
sed -n '1,220p' lib/marketplace/fee-calculator.ts
sed -n '1,220p' lib/marketplace/fees.ts
sed -n '1,220p' lib/ticketing/fees.ts
sed -n '1,220p' lib/music/royalties/money.ts
sed -n '280,455p' app/api/marketplace/checkout/route.ts
sed -n '1,170p' lib/ticketing/orders.ts
sed -n '145,180p' app/api/admin/ticketing/refund/route.ts
sed -n '28,155p' supabase/migrations/20260410120000_marketplace_core.sql
sed -n '36,72p' supabase/migrations/20260328130000_ticketing_v2.sql
sed -n '24,116p' supabase/migrations/20260712120000_event_ticketing_foundation.sql
sed -n '1,50p' supabase/migrations/20260328140000_financial_tables.sql
sed -n '1,100p' app/api/admin/finances/commitments/route.ts
sed -n '1,90p' app/api/admin/finances/expenses/route.ts
sed -n '1,115p' app/api/admin/finances/budget-rollup/route.ts
sed -n '80,160p' app/api/photos/purchase/route.ts
sed -n '40,80p' app/api/subscriptions/checkout/route.ts
sed -n '90,130p' app/api/subscriptions/webhook/route.ts
sed -n '150,230p' app/api/artist/music/royalties/imports/route.ts
sed -n '40,110p' supabase/migrations/20260717241000_music_royalties_allocations_payouts_statements.sql
sed -n '1,180p' lib/admin/finance-command-schemas.ts
sed -n '120,210p' app/api/admin/finances/route.ts
sed -n '1,110p' app/api/admin/organization/settings/route.ts
sed -n '1,90p' app/api/admin/organization/finance-settings/route.ts
rg -n "purchase_orders|expense_reports|budget_versions|budget_commitment_entries|total_minor_units|amount_minor|total_amount_minor|amount_minor_units|currency text" supabase/migrations app/api/admin/finances lib/admin -g '*.sql' -g '*.ts'
sed -n '1,120p' lib/logistics/money.ts
sed -n '1,120p' lib/admin/time-currency-location.ts
sed -n '1,110p' supabase/migrations/20260728000010_marketplace_fee_rules.sql
```

## COM-014 Result

COM-014 is complete as an inventory task. The implementation risk remains open: core marketplace, ticketing, legacy finance, photo purchase, subscriptions, logistics, and promotion areas still require canonical Money adapters before new Commerce Operations APIs expose money values.
