# COM-009 — Ticket Issuance Path Inventory

Date: 2026-08-12

## Source Task

- Task: `COM-009`
- Phase: `P0 — Discovery and Financial Safety Baseline`
- Requirement: identify every ticket issuance path.

## Core Issuance Model

Ticketing v2 issuance is centralized in `lib/ticketing/issuance.ts#issueTicketsForOrder`.

For each requested admission, the helper:

- checks whether `tickets` already exist for the order and returns existing active credentials when present,
- inserts one `tickets` row per unit,
- inserts one active `ticket_credentials` row with an opaque token per ticket,
- inserts a `ticket_ownership_events` row with `event_type = "issued"`,
- updates `ticket_sales.issuance_status = "issued"` and `finalized_at`,
- increments `ticket_allocations.quantity_issued` when an allocation ID is supplied.

## Confirmed Issuance Paths

| Path | Trigger | Issuance behavior | Payment relationship |
| --- | --- | --- | --- |
| `app/api/ticketing/webhook/route.ts` via `finalizePaidOrder` | Stripe `checkout.session.completed` with `payment_status = "paid"`. | Calls `issueTicketsForOrder` when ticketing v2 is enabled. | Provider-paid order. |
| `app/api/ticketing/enhanced/route.ts` free-ticket branch | Buyer total is zero after pricing/discounts. | Marks `ticket_sales.payment_status = "completed"`, finalizes inventory, calls `issueTicketsForOrder`. | No provider payment; complimentary/free issuance. |
| `app/api/ticketing/box-office/route.ts` comp branch | Box-office operator sells with `payment_method = "comp"`. | Marks sale completed, finalizes inventory, calls `issueTicketsForOrder`. | No provider payment; operator-issued comp. |
| `app/api/ticketing/box-office/route.ts` cash branch | Box-office operator sells with `payment_method = "cash"`. | Marks sale completed, then calls `finalizePaidOrder`, which calls `issueTicketsForOrder` when v2 is enabled. | Non-provider cash payment. |
| `app/api/ticketing/allocations/route.ts` issue branch | Operator issues from ticket allocation. | Creates pending order, marks completed/complimentary, finalizes inventory, calls `issueTicketsForOrder` with `allocationId`. | No provider payment; allocation issuance. |

## Credential Reissue and Transfer Path

`app/api/ticketing/transfers/route.ts` accepts transfers by:

- updating the ticket owner,
- calling `revokeAndReissueCredential`,
- marking the old active credential `superseded`,
- inserting a new active credential,
- inserting `ticket_ownership_events` with `event_type = "reissued"`,
- then inserting another ownership event with `event_type = "transfer_accepted"`.

This is not a new ticket issuance, but it is a new credential issuance and must be included in Commerce reconciliation.

## Refund / Revocation Path

`lib/ticketing/finalize.ts#refundOrderTickets` calls database function `public.apply_ticket_refund`.

`apply_ticket_refund`:

- validates the order is refundable,
- selects target tickets,
- updates `tickets.status = "refunded"`,
- updates active `ticket_credentials.status = "revoked"`,
- records `ticket_ownership_events.event_type = "refunded"`,
- updates `ticket_sales.payment_status` to `refunded` or keeps it `completed` for partial refunds.

This is a revocation path, not issuance, but it is essential for the critical reconciliation rule: refund completed without ticket void or revocation.

## Ticket Delivery and Wallet Read Paths

The following paths read issued tickets/credentials but do not issue them:

- `GET /api/ticketing/wallet`
- `GET /api/ticketing/delivery`
- `POST /api/ticketing/delivery`
- `GET /api/ticketing/verify`
- `GET /api/ticketing/reports`

## Non-Ticket Credentials Excluded

The codebase also has physical event/workforce credential systems and music-rights credentials. Those are not ticket commerce admission issuance and are excluded from this task.

## Gaps for Later Phases

- Paid Stripe card orders only issue tickets when ticketing v2 is enabled; classic paths may only increment sold counts.
- `issueTicketsForOrder` is idempotent by checking existing tickets for the order, but there is no explicit issuance idempotency key or expected-version guard.
- Credential reissue on transfer is separate from payment state and must be correlated in the canonical timeline.
- Free, comp, allocation, cash, and provider-paid ticket issuance share `tickets`/`ticket_credentials` output but need distinct canonical source labels.
- Refund revocation lives partly in SQL, so API-level reconciliation needs database-function coverage.

## Evidence Commands

- `rg -n "COM-009|ticket issuance|ticket\\.issued|issue tickets|credentials|ticket_credentials|tickets" docs/admin-commerce-ops/17_TICKETING_COMMERCE_INTEGRATION.md docs/admin-commerce-ops/20_BACKEND_APIS_SERVICES_EVENTS_AND_WEBHOOKS.md docs/admin-commerce-ops/25_IMPLEMENTATION_TASK_CATALOG.md docs/admin-commerce-ops/09_ORDERS_AND_ORDER_DETAILS.md`
- `rg -n "issueTicketsForOrder|ticket_credentials|from\\(['\\\"]tickets['\\\"]\\)|from\\(['\\\"]ticket_credentials['\\\"]\\)|ticket_issued|credential|issue.*ticket|tickets\\.insert|ticket_sales.*issuance_status" app lib supabase/migrations -g '*.ts' -g '*.tsx' -g '*.sql'`
- `sed -n '1,260p' lib/ticketing/issuance.ts`
- `sed -n '560,610p' app/api/ticketing/enhanced/route.ts`
- `sed -n '110,140p' app/api/ticketing/box-office/route.ts`
- `sed -n '160,200p' app/api/ticketing/allocations/route.ts`
- `sed -n '90,150p' lib/ticketing/finalize.ts`
- `sed -n '140,225p' app/api/ticketing/transfers/route.ts`
- `sed -n '150,220p' supabase/migrations/20260712120000_event_ticketing_foundation.sql`
- `sed -n '677,805p' supabase/migrations/20260719230353_admin_ticketing_security.sql`
