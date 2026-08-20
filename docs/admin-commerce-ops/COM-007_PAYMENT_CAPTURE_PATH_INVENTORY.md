# COM-007 — Payment Capture Path Inventory

Date: 2026-08-12

## Source Task

- Task: `COM-007`
- Phase: `P0 — Discovery and Financial Safety Baseline`
- Requirement: identify every payment capture path.

## Definition Used

For this inventory, a payment capture path is any code path that either:

- receives a provider event or provider session state proving payment was paid/captured,
- updates local payment state to paid, completed, active, or confirmed because provider state says money succeeded,
- or manually marks an internal finance record as paid without provider confirmation.

Display-only endpoints that retrieve a paid Stripe session but do not mutate payment state are listed separately as exclusions.

## Provider-Confirmed Capture Paths

| Path | Provider event / proof | Local mutation | Idempotency / replay protection |
| --- | --- | --- | --- |
| Marketplace Stripe webhook | `checkout.session.completed` with `session.payment_status === "paid"`. | `marketplace_orders.payment_status = "paid"`, `marketplace_orders.status = "confirmed"`, `payment_reference = payment_intent || session.id`; `marketplace_payout_ledger.payout_status = "scheduled"`, `payout_reference = payment_reference`; inventory decrement; entitlements and Printful fulfillment requests. | Inserts `marketplace_payment_events.provider_event_id` before processing; duplicate provider event IDs return duplicate/200. |
| Ticketing Stripe webhook | `checkout.session.completed` with `session.payment_status === "paid"`. | `finalizePaidOrder`: `ticket_sales.payment_status = "completed"`, stores payment intent/session/event IDs, finalizes inventory, issues tickets, writes finance ledger rows, emits analytics. | `ticket_stripe_webhook_events` claim when ticketing v2 is enabled; `finalizePaidOrder` exits if already completed and issued. |
| Photo purchase Stripe webhook | `checkout.session.completed` with `session.payment_status === "paid"`. | `photo_purchases.payment_status = "completed"`, `transaction_id = session.payment_intent`, download expiration set. | Signature is verified; no explicit provider-event receipt or duplicate table found. |
| Subscription Stripe webhook | `invoice.paid`. | `subscriptions.status = "active"` by `stripe_subscription_id`. | Signature is verified; no explicit subscription webhook event receipt or duplicate table found. |
| Music licensing partner webhook | Partner `invoice.paid`. | `music_license_invoices.status = "paid"`, `paid_at`, `payment_provider_event_id`; emits `music_licensing_outbox` event `payment.reconciled`. | Stores `music_licensing_partner_events` and checks provider/external event ID before processing. |

## Provider-Verified Client / Return-Path Capture

| Path | Provider check | Local mutation | Risk notes |
| --- | --- | --- | --- |
| `GET /api/payment` | Retrieves Stripe Checkout session and requires `session.payment_status === "paid"`, then checks session metadata `bookingId` and `userId`. | Updates user-owned `bookings.status = "confirmed"`. | This is a client/return-path verification model, not a webhook model. No provider event receipt, retry trail, or local payment attempt record was confirmed. |

## Provider-State Verification Without Capture Mutation

These routes read provider session state and require payment to be paid, but do not mark local payment captured:

| Path | Purpose | Mutation |
| --- | --- | --- |
| `GET /api/ticketing/verify` | Loads paid Checkout session and matching `ticket_sales` for success-page display. | None. |
| `GET /api/ticketing/delivery` | Loads paid Checkout session and matching sale/tickets to render a ticket text file. | None. |
| `POST /api/ticketing/delivery` | Loads paid Checkout session and sends/resends ticket email. | May send email; does not mark payment captured. |

## Manual or Internal Paid-State Paths

These paths set paid/completed status without a provider capture event. They are important for canonical classification but should not be treated as provider capture.

| Path | Local mutation | Notes |
| --- | --- | --- |
| Ticketing free/complimentary path in `POST /api/ticketing/enhanced` | `ticket_sales.payment_status = "completed"` and immediate issuance for zero-buyer-total orders. | No provider payment exists. This belongs with issuance/order state, not provider capture. |
| Box-office comp path in `POST /api/ticketing/box-office` | `ticket_sales.payment_status = "completed"` and immediate issuance. | No provider payment exists. |
| Box-office cash path in `POST /api/ticketing/box-office` | `ticket_sales.payment_status = "completed"`, then `finalizePaidOrder` with synthetic `stripeEventId = cash_${orderId}`. | This records non-provider payment as completed; canonical payment attempts must distinguish `cash` from Stripe capture. |
| Ticket allocations in `POST /api/ticketing/allocations` | Creates completed complimentary ticket sale/allocation state. | Allocation/comp flow, no provider capture. |
| Admin finance transaction commands | `financial_transactions.payment_status = "paid"` with `paid_at` / `posted_at`. | Requires finance capabilities and audit; manual accounting state, not provider capture. |
| Admin finance settlement transition | `settlements.status = "paid"`, `settled_at`, `settled_by`. | Manual settlement state, not provider capture. |
| Admin finance adjustments | Creates adjustment transaction with `payment_status = "paid"`. | Manual accounting adjustment. |
| Ticketing ledger writes from `finalizePaidOrder` | Creates `financial_transactions` rows with `payment_status = "paid"` and `payment_method = "stripe"`. | Downstream ledger effect of ticketing provider capture; not a separate capture source. |

## Failure and Refund Capture-Adjacent Paths

These do not capture money, but they mutate payment state based on provider events and must be reconciled with payment attempts later:

| Path | Event | Local mutation |
| --- | --- | --- |
| Marketplace webhook | `payment_intent.payment_failed` | Marks marketplace order failed/held and releases reservations where possible. |
| Marketplace webhook | `charge.refunded` | Marks marketplace order/payout refunded or on hold through lifecycle helpers. |
| Ticketing webhook | `payment_intent.payment_failed` | Marks ticket sale failed and releases reservation when possible. |
| Ticketing webhook | `charge.refunded` | Applies ticket refund state and inventory restoration. |
| Photo webhook | `payment_intent.payment_failed` | Marks photo purchase failed by transaction ID. |
| Photo webhook | `charge.refunded` | Marks photo purchase refunded by transaction ID. |
| Subscription webhook | `invoice.payment_failed` | Marks subscription past due. |

## Non-Capture Partner Webhooks

The following webhook families are commerce-adjacent but were not confirmed as payment capture paths in this pass:

- `app/api/webhooks/music-marketplace/[partner]/route.ts` can transition partner order/subscription statuses and reconcile settlement events, but no explicit paid/captured invoice mutation was confirmed.
- `app/api/institutional/partners/webhooks/[provider]/route.ts` stores partner events and emits fund NAV outbox events; no payment capture mutation was confirmed.
- `app/api/webhooks/music-royalty-payouts/route.ts` tracks payout transfer events, not incoming payment capture.

## Gaps for Later Phases

- There is no single canonical `PaymentAttempt` model tying checkout creation, provider event receipt, local payment state, refund totals, and payout state together.
- Marketplace has the strongest webhook idempotency receipt model; ticketing has one when v2 is enabled; photos and subscriptions do not have equivalent event receipt tables.
- Legacy `/api/payment` confirms bookings through return-path session retrieval rather than webhook processing.
- Cash/comp/manual finance paths currently share paid/completed statuses with provider-captured payments unless callers inspect payment method/source.
- Ticketing ledger writes are downstream of capture and should not be double-counted as separate captures in canonical read models.

## Evidence Commands

- `rg -n "checkout\\.session\\.completed|payment_intent\\.succeeded|payment_intent\\.payment_failed|charge\\.refunded|invoice\\.paid|invoice\\.payment_failed|customer\\.subscription|payment_status.*paid|payment_status.*completed|status.*paid|status.*confirmed|finalizePaidOrder|processMarketplaceWebhook|handle.*Webhook|webhooks\\.constructEvent|sessions\\.retrieve|payment_status === ['\\\"]paid|session\\.payment_status" app lib -g '*.ts' -g '*.tsx'`
- `find app/api -type f -name route.ts | rg 'webhook|payment|purchase|ticketing|subscriptions|marketplace|photos' | sort`
- `sed -n '1,260p' app/api/marketplace/webhook/route.ts`
- `sed -n '1,280p' lib/marketplace/webhook-processor.ts`
- `sed -n '1,280p' app/api/ticketing/webhook/route.ts`
- `sed -n '1,300p' lib/ticketing/finalize.ts`
- `sed -n '1,180p' app/api/photos/purchase/webhook/route.ts`
- `sed -n '1,140p' app/api/subscriptions/webhook/route.ts`
- `sed -n '190,260p' app/api/payment/route.ts`
- `sed -n '1,120p' app/api/ticketing/delivery/route.ts`
- `sed -n '1,100p' app/api/ticketing/verify/route.ts`
- `sed -n '1,140p' 'app/api/licensing/partners/webhooks/[provider]/route.ts'`
- `sed -n '1,170p' 'app/api/webhooks/music-marketplace/[partner]/route.ts'`
- `sed -n '1,140p' 'app/api/institutional/partners/webhooks/[provider]/route.ts'`
- `sed -n '100,160p' lib/admin/finance-command.service.ts`
- `sed -n '300,340p' lib/admin/finance-command.service.ts`
- `sed -n '720,780p' lib/admin/finance-command.service.ts`
- `sed -n '920,950p' lib/admin/finance-command.service.ts`
- `sed -n '1,120p' lib/ticketing/ledger.ts`
