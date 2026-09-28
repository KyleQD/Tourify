# TIX-002 — Legacy and canonical ticketing consumer inventory

**Status:** Revalidated repository inventory  
**Date:** 2026-07-21  
**Parent:** ADR-007 / TIX-001  
**Retirement owner:** Ticketing platform owner with Security (RLS), Finance (settlement), and Release (cutover) approval

## Classification rules

- **Canonical:** July 2026 foundation record or command that remains after cutover.
- **Bridge:** pre-existing table extended by the foundation and still used while a true ledger/order destination is completed. It is not proof of canonical cutover by itself.
- **Compatibility:** read-only legacy consumer during dual-read; no new writes after the organization enters canonical-only mode.
- **Retire:** route/query/write removed or redirected only after per-organization evidence is approved at `TIX-603`.
- Environment flags may expose code, but `admin_ticketing_canonical_v1` must be persisted per organization with reconciliation evidence before a consumer changes authority.

## Data inventory

| Relation / contract | Class now | Canonical destination | Compatibility and reconciliation | Retirement milestone |
|---|---|---|---|---|
| `events_v2` | canonical parent | same | Every ticketing child resolves event → `org_id`; guessed cross-org IDs fail. | retained |
| `event_ticketing_config` | canonical | same, extended at `TIX-501` with explicit capacity source/version | Compare enabled state, currency, windows, capacity source and configured capacity to approved event/provider evidence. Missing/denied/error is unavailable, never zero. | retained |
| `ticket_types` | bridge | versioned canonical product/price-tier plus ledger accounts at `TIX-501/502` | Compare type identity, configured quantity, sold/reserved counters and monetary rules. Counters are compatibility/read-model fields, not ledger authority. | counter writes stop at `TIX-601`; table retained or forward-migrated at `TIX-603` |
| `ticket_sales` | bridge | canonical order/payment records plus immutable refund/chargeback movements | Compare order count, quantity, gross, fees, tax, discounts, net, refund/chargeback and provider IDs. Direct mutation stops when command service covers every state. | legacy direct writers removed `TIX-601/603`; history retained |
| `event_ticket_types` | inactive legacy compatibility | none; `ticket_types` bridge/canonical product destination | SEC-108 makes it authenticated read-only; no runtime `.from("event_ticket_types")` consumer is present. Confirm deployed row count and query telemetry. | retirement candidate at `TIX-603`; Security approves policy removal and Ticketing approves retained historical export |
| `ticket_inventory_reservations` | canonical hold primitive | same plus balanced inventory ledger | Active quantity must equal hold account balance; consumed/released/expired rows reconcile to order and movement IDs. | retained |
| `tickets` | canonical issued unit | same | Issued rows reconcile to completed order quantities, comps, transfers, void/refund state and allocation issuance. | retained |
| `ticket_credentials` | canonical credential | signed/rotatable format at `TIX-508` | One active credential per eligible ticket; revoked/superseded state and key version reconcile. Plain opaque token storage is not final security approval. | retained with forward key migration |
| `ticket_ownership_events` | canonical history | append-only ownership ledger | Ticket current owner/state must be reconstructible; missing event blocks cutover. | retained under ADR-009 |
| `ticket_transfers` | canonical workflow | same | Pending/accepted/declined/canceled/expired state matches ticket owner and ownership event. | retained |
| `ticket_checkins` | canonical admission log | same plus device/offline identity at `TIX-509/510` | Active valid scans reconcile to ticket state, credential, event, checkpoint and offline package/version. | retained under ADR-009 |
| `ticket_allocations` | canonical pool primitive | balanced allocation accounts/movements at `TIX-502/503` | Total/issued/released/used balances reconcile to tickets and holds; no direct counter-only authority. | retained/expanded |
| `ticket_revenue_allocations` | canonical settlement input | versioned settlement allocation | Active shares reconcile to canonical gross/net and finance handoff; replacement is versioned, not delete/reinsert. | retained/expanded at `TIX-513` |
| `event_ticketing_grants` | canonical delegated access | same, aligned with Admin capability/entity-grant policy | Active event/org ownership and expiry matrix must pass. | retained |
| `ticket_stripe_webhook_events` | canonical provider idempotency evidence | generalized provider inbox/quarantine at `TIX-512` | Signature, provider account, event order, replay key, raw evidence retention and mapped order are required. | retained or forward-migrated; never erased at cutover |
| `ticket_analytics_events` | canonical event stream/read-model input | same | Counts/totals derive from authoritative movements and carry freshness/version. | retained |
| `settlements` ticketing records | canonical/bridge settlement output | versioned settlement handoff at `TIX-513` | Reconcile gross, allocations, fees, tax, refunds/chargebacks and finance settlement version; current provider-statement job is absent. | retained/forward-versioned |
| `ticket_campaigns`, `promo_codes` | legacy/bridge marketing | governed canonical campaign/promo schema at `TIX-505` | Compare scope, codes, limits/current uses, windows, discount/budget approval and redemption totals. Public promo lookup cannot expose unrestricted rows. | compatibility reads only after `TIX-505`; direct writes retire `TIX-603` |
| `ticket_shares`, `ticket_referrals`, `ticket_analytics`, `social_media_performance` | legacy marketing analytics | canonical campaign attribution + `ticket_analytics_events`/reporting read models | Compare click/conversion/revenue attribution and referral redemption; classify protected contact data. | migrate `TIX-601`, retire consumers `TIX-603` |
| `financial_transactions` ticket categories | finance bridge | versioned `TIX-513` settlement handoff | Gross/fees/tax/refunds/chargebacks/net/allocations tie to approved settlement version. | direct ticketing writes stop at finance handoff cutover; history retained |
| backup-only `ticketing_integrations`, `ticketing_webhooks` | non-deployed historical artifact | provider inbox/adapter boundary at `TIX-512` | Present only under `supabase/migrations_backup`; no active migration or runtime consumer. Never treat as deployed capability. | keep outside active chain; Release verifies they are not introduced by migration reconciliation |

## Admin surfaces

| Surface | Current sources/behavior | Destination | Gate and retirement milestone |
|---|---|---|---|
| `app/admin/dashboard/ticketing/page.tsx` | primary shell still calls the legacy enhanced Admin API and embeds the dual-read panel | tour/event canonical ticketing workspace/BFF | Replace enhanced-source dependency, show source state/freshness and block commands on mismatch; retained. |
| `app/admin/dashboard/ticketing/enhanced/page.tsx` | redirect/compatibility entry | canonical ticketing route | Redirect telemetry reaches zero bookmarked/internal dependencies at `TIX-603`. |
| `components/admin/event-ticket-manager.tsx` | event type/sale management | canonical setup/command APIs | No direct legacy mutation after `TIX-501`. |
| `components/admin/event-ticketing-ops-panels.tsx` | operational setup/admissions panels | canonical commands/read models | Retained; incomplete states remain truthful. |
| `components/admin/ticketing/ticketing-read-model-panel.tsx` | legacy/canonical comparison | persisted org/event cutover evidence | Retained through `TIX-601`; comparison view becomes history after `TIX-603`. |
| `app/api/admin/ticketing/read-model/route.ts` | dual-read comparison | governed cutover/read-model endpoint | Must fail closed for any unavailable source; retained through migration. |
| `app/api/admin/ticketing/commands/route.ts` | mixed bridge/canonical command service | canonical state/ledger commands | Per-command ownership/capability/idempotency/audit required at `TIX-103`; retained. |
| `app/api/admin/ticketing/refund/route.ts` | dual `ticket_sales`/`tickets` updates | transactional reversal/refund command | Direct writes retire at `TIX-506`; retain route contract or versioned replacement. |
| `app/api/admin/ticketing/enhanced/route.ts` | reads `ticket_types`, campaigns, promos, sales, analytics | canonical BFF | Legacy source branches retire after `TIX-505/601`; route may remain. |
| `app/api/admin/dashboard/stats/route.ts` | `ticket_sales` aggregate | governed reporting read model | Replace at `REP-20x`; legacy query retires `TIX-603`. |
| `app/api/admin/events/[id]/analytics/route.ts` | `ticket_sales`/`ticket_types` | governed event ticket analytics | Replace at `TIX-507`/reporting; compatibility read only. |
| `app/api/admin/events/[id]/export/route.ts` | `ticket_sales` export | durable authorized canonical export | Replace at `TIX-507/513`; protect customer/financial fields. |
| `app/admin/dashboard/events/[id]/check-in/page.tsx`, `lib/admin/check-in.ts` | admission UI/read logic | canonical admissions/device dashboard | Retained after `TIX-509/511`; source freshness mandatory. |
| `app/admin/dashboard/tours/planner/components/ticketing-financials-step.tsx` | planner ticket finance summary | canonical stop ticketing + settlement handoff | Replace aggregate source at `TIX-507/513`; no zero fallback. |
| `app/api/admin/tours/[id]/stops/impact/route.ts`, `lib/admin/tour-event-operations.service.ts` | protection/impact from ticket rows/sales | canonical protected-state query | Retained; inability to verify blocks destructive detach/delete. |

## Purchase, holder, venue, and artist consumers

| Consumer family | Exact paths | Current classification | Destination / retirement |
|---|---|---|---|
| Purchase and holder UI | `app/tickets/page.tsx`, `purchase`, `confirmation`, `success`, `cancel`, `my-tickets`; `components/ticketing/ticket-purchase-form.tsx`, QR/share tools | mixed bridge order plus canonical tickets/credentials | Canonical order/reservation/issuance commands. Legacy branches retire per-org at `TIX-601/603`; public routes remain. |
| Ticket APIs | `app/api/ticketing/route.ts`, `enhanced`, `delivery`, `wallet`, `verify` | mixed | Canonical typed services with holder/event authorization; direct table code retires `TIX-103/506/508`. |
| Checkout/issuance services | `lib/ticketing/orders.ts`, `inventory.ts`, `finalize.ts`, `issuance.ts`, `credentials.ts`, `fees.ts`, `notifications.ts` | foundation implementation over bridge + canonical tables | Consolidate under canonical transaction boundary at `TIX-103/502`; retained modules may be refactored, but no dual write. |
| Transfer/admission APIs | `app/api/ticketing/transfers/route.ts`, `check-in/route.ts`, `box-office/route.ts`, `allocations/route.ts` | canonical records with some legacy counters/sales reads | Replace direct writes with state-machine commands at `TIX-506/509/510`; route contracts may remain. |
| Reporting/settlement APIs | `app/api/ticketing/reports/route.ts`, `settlements/route.ts` | mixed; settlement currently mutates active allocations | Versioned canonical reporting/settlement. Delete/reinsert allocation behavior retires at `TIX-513`. |
| Provider webhook | `app/api/ticketing/webhook/route.ts`, `lib/ticketing/finalize.ts` | Stripe-specific bridge updates plus idempotency row | Signed provider inbox, raw evidence, quarantine and ordered mapping at `TIX-512`; old mutation path retires after replay comparison. |
| Artist surfaces | `app/artist/tickets/page.tsx`, `event-wizard/event-wizard-ticketing.tsx`, `ticket-sales/page.tsx`, guest-list manager; artist analytics/promote actions | mostly legacy types/sales plus guest list | Canonical setup, allocation/guest approval, and read models at `TIX-501/504/507`; legacy writes retire `TIX-603`. |
| Venue surfaces | `app/venue/dashboard/tickets/page.tsx`, `app/venue/tickets/page.tsx`, event check-in page, ticket generator, ticketing integration; `app/api/venue/ticketing/route.ts` | legacy types/sales and mixed admissions | Canonical delegated venue grant and scoped projections; direct legacy writes retire `TIX-603`. |
| Business ticket page | `app/business/tickets/page.tsx` | consumer/aggregate | Governed canonical read model; retire legacy source at `TIX-603`. |
| Event guest list | `app/api/events/[id]/guestlist/route.ts`, `app/artist/events/components/guestlist-manager.tsx` | separate guest-list path | Canonical comp/guest approval and credential issuance at `TIX-504`; compatibility path retires after count/attendance reconciliation. |
| Promotions | `app/api/promotions/route.ts`, artist/venue promotion pages/actions/components | legacy campaign/promo ecosystem | Canonical governed campaigns at `TIX-505`; historical attribution migrates before retirement. |

## Other read/report consumers that must move

- `app/api/analytics/route.ts`, `app/api/events/[id]/finances/route.ts`, `app/api/events/[id]/route.ts`.
- `app/artist/events/actions/analytics.ts`, `app/artist/events/actions/get-event-analytics.ts`.
- `lib/events/get-public-event-page.ts`, `lib/discover/ticket-price.ts`, `lib/services/ticketing.service.ts`.
- `app/api/events/planner/publish/route.ts` and `lib/admin/event-ops-provision.ts` currently participate in type/default provisioning; both must stop fabricating GA/VIP capacity at `TIX-105`.
- `app/api/ticketing/reports/route.ts`, Admin event export, tour planner financials, and finance/show settlement must share one governed totals definition.
- `lib/admin/reporting-consumer-inventory.ts` must list the canonical ticketing read model and freshness contract before reporting cutover.

## Jobs and missing operational consumers

- The Stripe webhook route and `ticket_stripe_webhook_events` are the only deployed provider ingestion/idempotency worker boundary found.
- No ticketing cron, provider polling job, provider-statement reconciliation worker, quarantine repair worker, reservation-expiry worker owned by Admin, or offline-scan reconciliation job was found.
- These absences are not treated as empty queues or completed operations. `TIX-502`, `TIX-510`, `TIX-512`, and `TIX-513` must create durable workers/outbox state, freshness, retries, dead letters, and operator remediation before cutover.
- Release owns job/runtime telemetry; Ticketing owns reconciliation correctness; Security owns webhook/device attack gates; Finance owns provider-statement and settlement approval.

## Reconciliation evidence

The repository comparison contract is `lib/admin/ticketing-read-model.ts` and the Admin endpoint is `/api/admin/ticketing/read-model`. It must evolve from environment enablement to persisted organization/event evidence. The minimum approved comparison is:

1. configured type/product count and capacity source;
2. active reservations/holds and allocation balances;
3. completed/paid order count and quantity;
4. issued, valid, transferred, voided, refunded, comped, and checked-in ticket counts;
5. gross, discount, fees, tax, refund, chargeback and net by currency/provider;
6. campaign/promo redemption and guest/comp issuance;
7. provider inbox received/matched/quarantined counts and oldest lag;
8. admission active scans versus ticket state, including offline pending/conflicts.

Read-only baseline queries for manual branch review:

```sql
select e.org_id, tt.event_id,
       count(*) as ticket_types,
       sum(tt.quantity_available) as configured_quantity,
       sum(tt.quantity_sold) as legacy_sold,
       sum(tt.quantity_reserved) as legacy_reserved
from public.ticket_types tt
join public.events_v2 e on e.id = tt.event_id
group by e.org_id, tt.event_id;

select e.org_id, t.event_id, t.status, count(*) as tickets
from public.tickets t
join public.events_v2 e on e.id = t.event_id
group by e.org_id, t.event_id, t.status;

select e.org_id, r.event_id, r.status, sum(r.quantity) as quantity
from public.ticket_inventory_reservations r
join public.events_v2 e on e.id = r.event_id
group by e.org_id, r.event_id, r.status;

select e.org_id, s.event_id, s.payment_status,
       count(*) as orders,
       sum(s.quantity) as quantity,
       sum(s.total_amount) as gross,
       sum(s.platform_fee_amount) as platform_fees,
       sum(s.processing_fee_amount) as processing_fees,
       sum(s.tax_amount) as tax,
       sum(s.net_amount) as net
from public.ticket_sales s
join public.events_v2 e on e.id = s.event_id
group by e.org_id, s.event_id, s.payment_status;
```

These queries never authorize cutover alone. An unavailable relation, RLS denial, null ownership, currency mismatch, or unmatched provider event produces a blocker rather than a zero.

## Compatibility and retirement gates

1. `TIX-101/102`: permissive legacy policies are absent and two-organization direct-client isolation passes.
2. `TIX-103/105`: all writes use scoped commands; implicit capacity/type provisioning is gone.
3. `TIX-501–513`: canonical setup, ledger, operations, provider, admission, and settlement workflows are live.
4. `TIX-601`: each organization/event has persisted comparison evidence within approved tolerances; unresolved records are quarantined.
5. Disable legacy writes per organization. Observe at least one complete on-sale/refund/scan/settlement cycle with no legacy-only write or reader discrepancy.
6. `TIX-603`: route registry, runtime telemetry, webhook replay evidence, reports, bookmarks, and jobs show no legacy dependency. Remove code paths and insecure policies only through a separately reviewed forward migration; retain historical rows under ADR-009.

## Known implementation contradiction (must remain visible)

The July foundation references and actively writes `ticket_types` and `ticket_sales`; therefore they are bridge anchors, not tables that can simply become read-only today. The ADR describes the destination behavior, while `TIX-502`, `TIX-506`, and `TIX-601` must supply the balanced movement ledger, immutable correction path, and write cutover before those counters/direct mutations can retire. Likewise, `lib/ticketing/ledger.ts` is a domain contract, not a persisted append-only inventory ledger table. The inventory may be marked complete as discovery only; the underlying convergence is intentionally not marked implemented.
