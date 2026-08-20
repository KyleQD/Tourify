# COM-010 — Refund Path Inventory

Date: 2026-08-12

## Source Task

- Task: `COM-010`
- Phase: `P0 — Discovery and Financial Safety Baseline`
- Requirement: identify every refund path.

## Provider Refund Execution Paths

| Path | Scope | Provider call | Local state mutation | Safeguards |
| --- | --- | --- | --- | --- |
| `POST /api/admin/ticketing/refund` | Admin ticket sale refund. | `stripe.refunds.create` with `payment_intent`, amount, reason metadata, and deterministic idempotency key. | v2: `refundOrderTickets` / `apply_ticket_refund`; classic: `ticket_sales.payment_status = "refunded"`, inventory decrement, refund ledger. | Requires `ticketing.refund`, reason, org target verification, service-role job wrapper, duplicate/refundable checks, partial-ticket validation, audit log. |
| `POST /api/ticketing/box-office` with `action = "refund"` | Box-office refund. | `stripe.refunds.create` when Stripe and payment intent/reference are present. | Calls `refundOrderTickets`, which applies local ticket/ticket credential refund state. | Requires `process_refunds` ticketing grant. No explicit reason or Stripe idempotency key found. |

No marketplace admin refund execution route was confirmed in this pass.

## Provider Refund Observation Paths

These paths observe provider refund events and update local state.

| Path | Provider event | Local mutation |
| --- | --- | --- |
| `app/api/marketplace/webhook/route.ts` / `lib/marketplace/webhook-processor.ts` | Stripe `charge.refunded`. | `marketplace_orders.status = "refunded"`, `marketplace_orders.payment_status = "refunded"`, `payment_reference = payment_intent`; `marketplace_payout_ledger.payout_status = "on_hold"`. |
| `app/api/ticketing/webhook/route.ts` | Stripe `charge.refunded`. | Finds sale by `stripe_payment_intent_id` or `payment_reference`; v2 calls `refundOrderTickets`; classic marks `ticket_sales.payment_status = "refunded"` and restores sold quantity. |
| `app/api/photos/purchase/webhook/route.ts` | Stripe `charge.refunded`. | `photo_purchases.payment_status = "refunded"` by `transaction_id = charge.payment_intent`. |

## Ticket Local Refund Engine

`lib/ticketing/finalize.ts#refundOrderTickets` calls the database function `public.apply_ticket_refund`.

`apply_ticket_refund`:

- requires a positive refund amount,
- locks the ticket sale,
- requires `ticket_sales.payment_status` in `completed` or `paid`,
- blocks already-refunded sales by metadata,
- validates partial ticket IDs,
- updates target `tickets.status = "refunded"`,
- revokes active `ticket_credentials`,
- inserts `ticket_ownership_events.event_type = "refunded"`,
- updates `ticket_sales.payment_status` to `refunded` for full refunds or keeps `completed` for partial refunds,
- records refund metadata,
- returns event/org/order information for downstream refund ledger writes.

`refundOrderTickets` then writes refund ledger rows, emits `ticket_refunded` analytics, and sends buyer notification when possible.

## Accounting Reversal / Adjustment Paths

These are finance corrections, not provider refunds:

| Path | Purpose | Notes |
| --- | --- | --- |
| `lib/admin/finance-command.service.ts#createReversal` | Creates an offsetting posted `financial_transactions` row for paid/refunded transactions. | Requires `finance.pay`; uses expected `updated_at`; prevents duplicate reversal. |
| `lib/admin/finance-command.service.ts#createAdjustment` | Creates a linked posted adjustment against a paid/refunded transaction. | Requires `finance.pay`; uses expected `updated_at`. |
| `transition_payment_status` in finance commands | Can move a finance transaction to `refunded`. | Requires `finance.pay`; manual accounting status, not provider refund. |

## Refund-Adjacent Status Models

The codebase contains refund statuses in additional schemas, including lodging, travel, service requests/bookings, music marketplace subscriptions/orders, and finance/offering records. In this pass these were only confirmed as status fields or state machines, not active provider refund execution paths.

## Gaps for Later Phases

- Marketplace has webhook-observed refunds but no confirmed admin/provider refund execution workflow.
- Photo purchases can be marked refunded by webhook, but no admin/provider refund execution route or refund idempotency model was confirmed.
- Subscription refund/credit workflow was not confirmed; subscriptions only react to invoice paid/failed and subscription lifecycle webhooks.
- Box-office refunds call Stripe without an explicit reason or idempotency key.
- Provider refund objects are not persisted in a canonical refund table with amount, currency, actor, reason, idempotency key, provider refund ID, and affected items.
- Refund state is spread across order tables, ticket SQL functions, financial ledger rows, and webhook handlers.

## Evidence Commands

- `rg -n "COM-010|refund path|Refund Workflow|refund|charge\\.refunded|refunds\\.create|apply_ticket_refund|payment_status.*refunded|refundOrderTickets|create_reversal|reversal|adjustment" docs/admin-commerce-ops/14_PAYMENTS_REFUNDS_DISPUTES_AND_CHARGEBACKS.md docs/admin-commerce-ops/17_TICKETING_COMMERCE_INTEGRATION.md docs/admin-commerce-ops/20_BACKEND_APIS_SERVICES_EVENTS_AND_WEBHOOKS.md docs/admin-commerce-ops/25_IMPLEMENTATION_TASK_CATALOG.md app lib supabase/migrations -g '*.md' -g '*.ts' -g '*.tsx' -g '*.sql'`
- `sed -n '1,330p' app/api/admin/ticketing/refund/route.ts`
- `sed -n '210,270p' app/api/ticketing/box-office/route.ts`
- `sed -n '250,330p' lib/ticketing/finalize.ts`
- `sed -n '677,805p' supabase/migrations/20260719230353_admin_ticketing_security.sql`
- `sed -n '208,235p' lib/marketplace/webhook-processor.ts`
- `sed -n '90,125p' app/api/photos/purchase/webhook/route.ts`
- `sed -n '85,145p' app/api/ticketing/webhook/route.ts`
- `sed -n '785,890p' lib/admin/finance-command.service.ts`
- `sed -n '895,975p' lib/admin/finance-command.service.ts`
- `sed -n '1,90p' lib/marketplace/order-lifecycle.ts`
- `sed -n '1,130p' lib/admin/finance-reversal-rules.ts`
