# COM-020 - Baseline Reconciliation Reports

Date: 2026-08-12

## Source Task

- Task: `COM-020`
- Phase: `P0 - Discovery and Financial Safety Baseline`
- Requirement: create baseline reconciliation reports.

## Scope

This document defines the current-state reconciliation baseline that later Commerce Operations read models, issue rules, and migrations must preserve or improve.

These are read-only report definitions and evidence notes. No provider-side mutation, database migration, destructive command, checkout creation, webhook replay, or production data change was performed.

## Baseline Report Set

| Report | Current support level | Primary sources | Purpose |
| --- | --- | --- | --- |
| Marketplace order amount reconciliation | Runnable from current schema | `marketplace_orders`, `marketplace_order_items` | Compare order totals to item totals, platform fees, and tax. |
| Marketplace payout ledger reconciliation | Runnable from current schema | `marketplace_orders`, `marketplace_payout_ledger` | Compare gross, platform fee, seller net, payout state, and payment state. |
| Marketplace webhook/checkout exception report | Runnable from current schema | `marketplace_payment_events`, `marketplace_checkout_attempts` | Find failed webhook events and stale checkout attempts. |
| Ticket paid-versus-issued report | Runnable from current schema when ticketing v2 tables exist | `ticket_sales`, `tickets`, `ticket_credentials` | Find paid orders without expected issued tickets or credentials. |
| Ticket issued-without-capture report | Runnable with source labels | `ticket_sales`, `tickets` | Find tickets issued without provider-paid state, separating comp/free/cash/allocation paths. |
| Ticket ledger amount reconciliation | Runnable from current schema | `ticket_sales`, `financial_transactions` | Compare ticket sale amounts to event finance ledger rows. |
| Event ticket settlement baseline | Partially runnable | `financial_transactions`, `ticket_revenue_allocations`, `settlements` | Recreate gross/refund/fee/net math used by the event settlement route. |
| Finance mismatch queue | Runnable if migrated | `finance_reconciliation_mismatches` | List open/under-review mismatches; current API degrades if table is absent. |
| Subscription state projection health | Runnable from current schema | `subscriptions`, `profiles`, `artist_subscription_tiers` | Find duplicate, stale, or orphaned Stripe subscription projections. |
| Subscription entitlement reconciliation | Not currently complete | `subscriptions`, entitlement sources not linked | Required by suite, but no subscription-entitlement coupling is confirmed. |
| Promotion paid-vs-activated report | Not currently complete | `artist_marketing_campaigns`, `promotion_posts`, `events_v2` | Required by suite, but no paid promotion payment source exists. |
| Promotion spend/budget sanity report | Runnable as operational sanity only | `artist_marketing_campaigns` | Find spend over budget or paid-commerce fields without payment evidence. |
| Currency baseline | Partially runnable | Marketplace order currency, ticket hard-coded USD, subscription Stripe price hard-coded USD | Identify mixed/unknown currency risks before canonical minor-unit APIs. |

## Report 1 - Marketplace Order Amount Reconciliation

### Goal

Identify marketplace orders where stored order totals do not match source line totals and fee/tax columns.

### Read-Only Query Shape

```sql
select
  o.id as order_id,
  o.order_number,
  o.currency,
  o.payment_status,
  o.status,
  o.subtotal_amount,
  coalesce(sum(i.line_total), 0) as item_line_total,
  o.platform_fee_amount,
  o.tax_amount,
  o.total_amount,
  round((coalesce(sum(i.line_total), 0) - coalesce(o.subtotal_amount, 0))::numeric, 2) as subtotal_variance,
  round((coalesce(o.subtotal_amount, 0) + coalesce(o.platform_fee_amount, 0) + coalesce(o.tax_amount, 0) - coalesce(o.total_amount, 0))::numeric, 2) as total_variance,
  o.created_at
from public.marketplace_orders o
left join public.marketplace_order_items i on i.order_id = o.id
group by o.id
having
  round((coalesce(sum(i.line_total), 0) - coalesce(o.subtotal_amount, 0))::numeric, 2) <> 0
  or round((coalesce(o.subtotal_amount, 0) + coalesce(o.platform_fee_amount, 0) + coalesce(o.tax_amount, 0) - coalesce(o.total_amount, 0))::numeric, 2) <> 0
order by o.created_at desc;
```

### Known Limitations

- Uses decimal major-unit values because canonical `{ amountMinor, currency }` columns do not exist yet.
- Does not prove Stripe captured amount; it reconciles internal order math only.
- Marketplace payout ledger currency is inferred from the order because the payout table has no first-class currency column.

## Report 2 - Marketplace Payout Ledger Reconciliation

### Goal

Identify seller payable mismatches and payout states that are inconsistent with order payment state.

### Read-Only Query Shape

```sql
select
  o.id as order_id,
  o.order_number,
  o.currency,
  o.payment_status,
  o.status as order_status,
  p.id as payout_ledger_id,
  p.payout_status,
  p.gross_amount,
  p.platform_fee_amount,
  p.net_amount,
  round((coalesce(p.gross_amount, 0) - coalesce(p.platform_fee_amount, 0) - coalesce(p.net_amount, 0))::numeric, 2) as seller_net_variance,
  p.payout_reference,
  p.retry_attempts,
  p.available_at,
  p.updated_at
from public.marketplace_payout_ledger p
join public.marketplace_orders o on o.id = p.order_id
where
  round((coalesce(p.gross_amount, 0) - coalesce(p.platform_fee_amount, 0) - coalesce(p.net_amount, 0))::numeric, 2) <> 0
  or (o.payment_status = 'paid' and p.payout_status not in ('scheduled', 'processing', 'paid', 'on_hold'))
  or (o.payment_status in ('failed', 'refunded') and p.payout_status not in ('on_hold', 'cancelled', 'reversed'))
order by p.updated_at desc nulls last;
```

### Known Limitations

- Current marketplace checkout uses Stripe Connect transfer destination at payment time. The payout ledger is a local payable/projection, not proof of a separate external payout object.
- The existing retry route is a local reschedule path and is not provider-reconciled yet.

## Report 3 - Marketplace Webhook And Checkout Exceptions

### Goal

Find marketplace webhooks that failed or remain unprocessed, and checkout attempts that stayed pending past expiration.

### Read-Only Query Shape

```sql
select
  'marketplace_payment_event' as source,
  provider_event_id as source_id,
  event_type,
  processing_status as status,
  attempts,
  received_at as observed_at,
  processed_at,
  last_error
from public.marketplace_payment_events
where processing_status <> 'processed'

union all

select
  'marketplace_checkout_attempt' as source,
  idempotency_key as source_id,
  null as event_type,
  status,
  null as attempts,
  created_at as observed_at,
  null as processed_at,
  null as last_error
from public.marketplace_checkout_attempts
where status = 'pending' and expires_at < now()
order by observed_at desc;
```

### Known Limitations

- This report does not re-fetch Stripe event state.
- It relies on local event tables that only cover the newer marketplace webhook processor.

## Report 4 - Ticket Paid Versus Issued

### Goal

Find provider-paid or locally completed ticket orders without the expected number of tickets and active credentials.

### Read-Only Query Shape

```sql
with issued as (
  select
    t.order_id,
    count(*) as ticket_count,
    count(tc.id) filter (where tc.status = 'active') as active_credential_count
  from public.tickets t
  left join public.ticket_credentials tc on tc.ticket_id = t.id
  where t.status in ('valid', 'used')
  group by t.order_id
)
select
  s.id as order_id,
  s.order_number,
  s.event_id,
  s.ticket_type_id,
  s.payment_status,
  s.issuance_status,
  s.quantity as expected_quantity,
  coalesce(i.ticket_count, 0) as ticket_count,
  coalesce(i.active_credential_count, 0) as active_credential_count,
  s.stripe_checkout_session_id,
  s.stripe_payment_intent_id,
  s.payment_reference,
  s.webhook_event_id,
  s.updated_at
from public.ticket_sales s
left join issued i on i.order_id = s.id
where
  s.payment_status in ('completed', 'paid')
  and (
    coalesce(i.ticket_count, 0) <> coalesce(s.quantity, 0)
    or coalesce(i.active_credential_count, 0) <> coalesce(s.quantity, 0)
    or coalesce(s.issuance_status, '') <> 'issued'
  )
order by s.updated_at desc;
```

### Known Limitations

- Classic ticketing paths may not issue individual tickets unless ticketing v2 is enabled.
- Free and comp orders can be legitimate without Stripe references and must not be counted as payment-capture mismatches.

## Report 5 - Ticket Issued Without Provider Capture

### Goal

Find issued tickets where the order has no provider payment reference, while preserving legitimate non-provider source categories for review.

### Read-Only Query Shape

```sql
select
  s.id as order_id,
  s.order_number,
  s.event_id,
  s.payment_status,
  s.payment_method,
  s.issuance_status,
  s.quantity,
  count(t.id) as issued_ticket_count,
  s.total_amount,
  s.stripe_checkout_session_id,
  s.stripe_payment_intent_id,
  s.payment_reference,
  s.metadata,
  case
    when s.payment_method in ('cash', 'comp') then 'non_provider_expected'
    when coalesce((s.metadata->>'box_office'), '') = 'true' then 'operator_path_review'
    when coalesce(s.total_amount, 0) = 0 then 'free_checkout_expected'
    when s.payment_reference is null and s.stripe_payment_intent_id is null then 'provider_reference_missing'
    else 'provider_reference_present'
  end as baseline_classification
from public.ticket_sales s
join public.tickets t on t.order_id = s.id
where t.status in ('valid', 'used')
group by s.id
having
  count(t.id) > 0
  and (
    s.payment_reference is null
    and s.stripe_payment_intent_id is null
    and coalesce(s.total_amount, 0) > 0
    and coalesce(s.payment_method, '') not in ('cash', 'comp')
  )
order by s.updated_at desc;
```

### Known Limitations

- The exact non-provider source classification depends on metadata conventions that are not yet canonical.
- Later Commerce timeline work should store a normalized issuance source and payment source.

## Report 6 - Ticket Ledger Amount Reconciliation

### Goal

Compare ticket sale order amounts to immutable finance ledger rows written by `lib/ticketing/ledger.ts`.

### Read-Only Query Shape

```sql
with ledger as (
  select
    ticket_order_id,
    sum(amount) filter (where type = 'income' and category = 'ticket_revenue') as ledger_ticket_revenue,
    sum(amount) filter (where type = 'expense' and category = 'platform_fee') as ledger_platform_fee,
    sum(amount) filter (where type = 'expense' and category = 'processing_fee') as ledger_processing_fee,
    sum(amount) filter (where type = 'expense' and category = 'tax') as ledger_tax,
    sum(amount) filter (where category = 'refund') as ledger_refunds
  from public.financial_transactions
  where ticket_order_id is not null
  group by ticket_order_id
)
select
  s.id as order_id,
  s.order_number,
  s.event_id,
  s.payment_status,
  s.total_amount,
  s.platform_fee_amount,
  s.processing_fee_amount,
  s.tax_amount,
  coalesce(l.ledger_ticket_revenue, 0) as ledger_ticket_revenue,
  coalesce(l.ledger_platform_fee, 0) as ledger_platform_fee,
  coalesce(l.ledger_processing_fee, 0) as ledger_processing_fee,
  coalesce(l.ledger_tax, 0) as ledger_tax,
  coalesce(l.ledger_refunds, 0) as ledger_refunds,
  round((coalesce(l.ledger_platform_fee, 0) - coalesce(s.platform_fee_amount, 0))::numeric, 2) as platform_fee_variance,
  round((coalesce(l.ledger_processing_fee, 0) - coalesce(s.processing_fee_amount, 0))::numeric, 2) as processing_fee_variance,
  round((coalesce(l.ledger_tax, 0) - coalesce(s.tax_amount, 0))::numeric, 2) as tax_variance
from public.ticket_sales s
left join ledger l on l.ticket_order_id = s.id
where
  s.payment_status in ('completed', 'paid', 'refunded')
  and (
    l.ticket_order_id is null
    or round((coalesce(l.ledger_platform_fee, 0) - coalesce(s.platform_fee_amount, 0))::numeric, 2) <> 0
    or round((coalesce(l.ledger_processing_fee, 0) - coalesce(s.processing_fee_amount, 0))::numeric, 2) <> 0
    or round((coalesce(l.ledger_tax, 0) - coalesce(s.tax_amount, 0))::numeric, 2) <> 0
  )
order by s.updated_at desc;
```

### Known Limitations

- Ticketing ledger writes gross revenue as total minus platform, processing, and tax; source order columns must be interpreted consistently before canonical settlement math is added.
- Legacy finance ledger rows lack first-class currency and fee calculation provenance.

## Report 7 - Event Ticket Settlement Baseline

### Goal

Recreate the current event settlement route's gross/refund/fee/net math so future settlement read models can prove parity.

### Read-Only Query Shape

```sql
select
  ft.event_id,
  coalesce(sum(ft.amount) filter (where ft.type = 'income' and ft.category = 'ticket_revenue'), 0) as gross,
  coalesce(sum(ft.amount) filter (where ft.category = 'refund'), 0) as refunds,
  coalesce(sum(ft.amount) filter (where ft.category in ('platform_fee', 'processing_fee')), 0) as fees,
  greatest(
    0,
    coalesce(sum(ft.amount) filter (where ft.type = 'income' and ft.category = 'ticket_revenue'), 0)
    - coalesce(sum(ft.amount) filter (where ft.category = 'refund'), 0)
    - coalesce(sum(ft.amount) filter (where ft.category in ('platform_fee', 'processing_fee')), 0)
  ) as net,
  s.id as settlement_id,
  s.status as settlement_status
from public.financial_transactions ft
left join public.settlements s on s.event_id = ft.event_id
where ft.event_id is not null
group by ft.event_id, s.id, s.status
order by ft.event_id;
```

### Known Limitations

- The current route calculates shares in application code with `calculateRevenueShares`; this SQL only reproduces the gross/refunds/fees/net inputs.
- It does not reconcile against Stripe balance transactions or actual provider payout state.

## Report 8 - Finance Mismatch Queue

### Goal

List open/under-review finance mismatch records where the FIN-601 table exists.

### Read-Only Query Shape

```sql
select
  id,
  type,
  date,
  currency,
  event_id,
  provider_id,
  source_total,
  finance_entry_total,
  variance,
  owner,
  status,
  evidence,
  created_at,
  updated_at
from public.finance_reconciliation_mismatches
where status in ('open', 'under_review')
order by date desc
limit 100;
```

### Known Limitations

- `app/api/admin/finances/reconciliation/route.ts` treats this table as optional and returns an unavailable state when it is absent.
- This queue is finance-specific and not yet the canonical Commerce issue queue.

## Report 9 - Subscription Projection Health

### Goal

Find local Stripe subscription projections that are duplicate, orphaned, stale, or missing important local relationships.

### Read-Only Query Shape

```sql
with duplicate_active as (
  select
    user_id,
    stripe_price_id,
    count(*) as active_count
  from public.subscriptions
  where status in ('active', 'trialing', 'past_due')
  group by user_id, stripe_price_id
  having count(*) > 1
)
select
  s.id,
  s.user_id,
  s.stripe_subscription_id,
  s.stripe_price_id,
  s.stripe_customer_id,
  s.status,
  s.current_period_end,
  s.cancel_at_period_end,
  s.canceled_at,
  p.id as profile_id,
  p.stripe_customer_id as profile_stripe_customer_id,
  case
    when p.id is null then 'profile_missing'
    when p.stripe_customer_id is distinct from s.stripe_customer_id then 'customer_id_mismatch'
    when da.active_count is not null then 'duplicate_active_subscription'
    when s.status in ('active', 'trialing') and s.current_period_end is not null and s.current_period_end < now() then 'active_period_expired'
    when s.status = 'canceled' and s.canceled_at is null then 'canceled_without_canceled_at'
    else 'ok'
  end as baseline_issue
from public.subscriptions s
left join public.profiles p on p.id = s.user_id
left join duplicate_active da on da.user_id = s.user_id and da.stripe_price_id = s.stripe_price_id
where
  p.id is null
  or p.stripe_customer_id is distinct from s.stripe_customer_id
  or da.active_count is not null
  or (s.status in ('active', 'trialing') and s.current_period_end is not null and s.current_period_end < now())
  or (s.status = 'canceled' and s.canceled_at is null)
order by s.updated_at desc;
```

### Known Limitations

- This report does not prove Stripe's current subscription state; it only validates the local webhook projection.
- No local subscription webhook event claim table was confirmed.
- No subscription entitlement table or status coupling was confirmed, so payment-to-entitlement reconciliation cannot yet be fully reported.

## Report 10 - Subscription Entitlement Gap Baseline

### Goal

Record that subscription entitlement reconciliation is required but not currently complete.

### Current Baseline

- Local subscription state is stored in `subscriptions`.
- Purchased one-time marketplace entitlements are stored in `marketplace_entitlements`.
- Artist subscription tier setup is stored in `artist_subscription_tiers`.
- No confirmed path couples `subscriptions.status` to explicit subscription entitlement grant, revocation, repair, or notification.

### Baseline Output

For Commerce Operations, the correct current baseline is not an empty successful report. It is:

```json
{
  "status": "unavailable",
  "reason": "subscription_entitlement_reconciliation_not_implemented",
  "requiredIssueRules": [
    "payment_succeeded_entitlement_missing",
    "entitlement_active_after_cancellation",
    "plan_mismatch",
    "duplicate_subscription",
    "renewal_failed_without_user_notice",
    "grace_period_expired_without_entitlement_update"
  ]
}
```

## Report 11 - Promotion Paid Versus Activated Gap Baseline

### Goal

Record that paid promotion reconciliation is required by the suite but no paid promotion payment source exists today.

### Current Baseline

- `promotion_posts` supports organic content creation/scheduling.
- `artist_marketing_campaigns` stores campaign budget/spend/status operational records.
- `events.promoted_event_v2_id` and `events_v2` support artist event promotion into ticketing.
- `ticket_campaigns` and `promo_codes` support ticket discount activation and redemption.
- No dedicated paid promotion checkout, provider payment, refund/credit, spend ledger, or payment-to-activation source was found.

### Baseline Output

For Commerce Operations, the correct current baseline is not an empty successful report. It is:

```json
{
  "status": "unavailable",
  "reason": "paid_promotion_payment_source_not_implemented",
  "requiredIssueRules": [
    "payment_captured_campaign_not_activated",
    "campaign_delivered_without_captured_payment",
    "campaign_cancelled_without_refund_or_credit",
    "spend_exceeds_budget",
    "promotion_entitlement_mismatch"
  ]
}
```

## Report 12 - Promotion Spend And Budget Sanity

### Goal

Identify operational marketing campaign records where spend exceeds budget or paid-commerce-like status is present without a payment source.

### Read-Only Query Shape

```sql
select
  id,
  user_id,
  name,
  type,
  status,
  budget,
  spent,
  start_date,
  end_date,
  created_at,
  updated_at,
  case
    when coalesce(spent, 0) > coalesce(budget, 0) and coalesce(budget, 0) > 0 then 'spend_exceeds_budget'
    when status in ('active', 'completed') and coalesce(budget, 0) > 0 then 'active_budget_without_payment_source'
    else 'ok'
  end as baseline_issue
from public.artist_marketing_campaigns
where
  (coalesce(spent, 0) > coalesce(budget, 0) and coalesce(budget, 0) > 0)
  or (status in ('active', 'completed') and coalesce(budget, 0) > 0)
order by updated_at desc;
```

### Known Limitations

- This is an operational sanity report, not financial reconciliation.
- It should not be used as proof of paid promotion revenue or liability.

## Report 13 - Currency Baseline

### Goal

Identify source records where currency is known, inferred, or missing before canonical minor-unit APIs and mixed-currency safeguards are built.

### Read-Only Query Shape

```sql
select
  'marketplace_orders' as source,
  currency,
  count(*) as record_count,
  sum(total_amount) as amount_major
from public.marketplace_orders
group by currency

union all

select
  'ticket_sales_inferred_usd' as source,
  'USD' as currency,
  count(*) as record_count,
  sum(total_amount) as amount_major
from public.ticket_sales

union all

select
  'subscriptions_projection_currency_missing' as source,
  'UNKNOWN' as currency,
  count(*) as record_count,
  null::numeric as amount_major
from public.subscriptions

union all

select
  'artist_marketing_campaigns_currency_missing' as source,
  'UNKNOWN' as currency,
  count(*) as record_count,
  sum(budget) as amount_major
from public.artist_marketing_campaigns;
```

### Known Limitations

- Ticketing and subscription code hard-code USD at Stripe creation points, but local tables do not consistently store currency.
- Promotion budgets have no confirmed currency or payment source.
- This report intentionally avoids mixed-currency aggregation as a final answer; it only exposes the baseline risk.

## Current Admin/API Coverage

- `app/api/admin/finances/reconciliation/route.ts` lists open finance mismatches from `finance_reconciliation_mismatches` and returns an explicit unavailable payload if the table does not exist.
- `app/api/admin/finances/settlements/route.ts` lists and mutates settlement records with `finance.view` and `finance.manage` capabilities.
- `app/api/ticketing/settlements/route.ts` calculates event ticket gross, refunds, fees, net, allocations, shares, and settlement state from event finance tables.
- `app/api/admin/marketplace/orders/route.ts` and `app/api/admin/marketplace/orders/[id]/route.ts` expose marketplace order and payout detail, but still use legacy admin access patterns.
- No admin Commerce subscription reconciliation or paid promotion reconciliation route currently exists.

## Baseline Gaps To Carry Forward

- No canonical `commerce_transaction_ledger_v`, `commerce_payout_reconciliation_v`, `commerce_ticket_reconciliation_v`, or `commerce_subscription_health_v` exists yet.
- Current reports rely on decimal major-unit values and inconsistent currency availability.
- Provider reconciliation is local-projection-only unless a report explicitly re-fetches provider state later.
- Subscription entitlement reconciliation and paid promotion reconciliation are not yet implemented and must be represented as unavailable/error states in future APIs, never as legitimate empty datasets.
- Marketplace payout retry remains unsafe for canonical Commerce payout tooling until provider re-fetch, duplicate payout detection, reason capture, idempotency, permission checks, and audit logging are complete.
- Existing finance mismatch queue is not the Commerce issue queue and should not be treated as full coverage for Commerce Needs Attention.

## Evidence Commands

- `rg -n "COM-020|baseline reconciliation|reconciliation report|reconcile|reconciliation|ledger|settlement|variance|mismatch|source of truth" docs/admin-commerce-ops -g '*.md'`
- `sed -n '1,260p' docs/admin-commerce-ops/02_AUDIT_BASELINE.md`
- `sed -n '1,260p' docs/admin-commerce-ops/08_UNIFIED_TRANSACTION_LEDGER.md`
- `sed -n '1,230p' docs/admin-commerce-ops/15_PAYOUTS_SETTLEMENTS_AND_RECONCILIATION.md`
- `sed -n '1,190p' docs/admin-commerce-ops/17_TICKETING_COMMERCE_INTEGRATION.md`
- `sed -n '1,170p' docs/admin-commerce-ops/18_SUBSCRIPTIONS_FEES_AND_PROMOTIONS.md`
- `sed -n '1,180p' docs/admin-commerce-ops/19_SUPABASE_DATA_MODEL_AND_MIGRATIONS.md`
- `sed -n '1,260p' app/api/admin/finances/reconciliation/route.ts`
- `sed -n '1,260p' app/api/admin/finances/settlements/route.ts`
- `sed -n '1,230p' app/api/ticketing/settlements/route.ts`
- `sed -n '1,180p' lib/ticketing/ledger.ts`
- `sed -n '1,260p' app/api/admin/marketplace/orders/route.ts`
- `sed -n '1,260p' 'app/api/admin/marketplace/orders/[id]/route.ts'`
- `sed -n '1,220p' app/api/marketplace/payouts/route.ts`
- `rg -n "subscriptions|artist_subscription_tiers|subscription.*admin|admin.*subscription|billing" app/api/admin app/admin lib/admin app/api/subscriptions components -g '*.{ts,tsx}'`
- `rg -n "create table if not exists marketplace_orders|create table marketplace_orders|marketplace_payout_ledger|marketplace_order_items|marketplace_payment_events|marketplace_checkout_attempts" supabase/migrations -g '*.sql'`
- `rg -n "create table if not exists ticket_sales|create table ticket_sales|ticket_stripe_webhook_events|ticket_credentials|financial_transactions|settlements|finance_reconciliation_mismatches" supabase/migrations -g '*.sql'`
- `rg -n "create table if not exists subscriptions|create table subscriptions|artist_subscription_tiers|promotion_posts|artist_marketing_campaigns|promo_codes|ticket_campaigns" supabase/migrations -g '*.sql'`
