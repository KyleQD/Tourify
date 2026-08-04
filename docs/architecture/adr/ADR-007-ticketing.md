# ADR-007 — Canonical ticketing destination model

**Status:** Accepted  
**Date:** 2026-07-20  
**Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md`, `09_Ticketing_Admissions_and_Guest_Lists.md`  
**Aligns with:** `TIX-001`

## Context

Legacy and July 2026 ticketing foundations coexist; permissive RLS on legacy tables is a security risk.

## Decision

1. The **July 2026 ticketing foundation** is the **sole destination write model** for Admin. Its core records are `event_ticketing_config`, canonical order/item/payment records, `ticket_inventory_reservations`, `tickets`, `ticket_credentials`, `ticket_ownership_events`, `ticket_transfers`, `ticket_checkins`, `ticket_allocations`, `ticket_revenue_allocations`, event grants, provider webhook events, and canonical analytics events/read models.
2. Inventory is an append-only, balanced movement ledger. Reservation/finalization/release/void/refund/transfer/check-in commands are transactional and idempotent; derived availability is never edited as an independent source of truth. Concurrent commands must not oversell.
3. Event capacity comes only from an explicitly selected authoritative source (venue/configured sellable capacity or an approved external-provider allocation). Event creation never invents GA/VIP types or quantities. Missing setup is an incomplete/unavailable state, not zero capacity.
4. External providers remain external systems of record for their imported orders/payments. Provider identity, raw signed webhook evidence, sequence/idempotency, freshness, and reconciliation status are retained separately from Tourify-originated sales; unmatched or unverified events are quarantined and cannot alter sellable inventory.
5. Refund, void, transfer, comp, and manual inventory override are reasoned/audited state-machine commands. They require the documented capability and configured separation of duties. Financial history is corrected with linked movements/reversals, never by overwriting an approved sale or settlement amount.
6. Legacy `ticket_types`, `ticket_sales`, campaign/promo, and related routes become **migration/read-only** after `TIX-101` drops permissive policies; no new legacy writes. Historical reads remain available for reconciliation/retention until the explicit retirement gate passes.
7. Cutover is **organization-flagged**: dual-read/compare is allowed; dual-write is forbidden unless a separately approved reconciliation design proves one canonical movement per business action. Guest lists, comps, holds, scanners, and refunds use the canonical model only once the organization flag is enabled.
8. Cutover requires per-event counts, state totals, capacity/availability, gross/fees/tax/refunds, and check-in totals to match approved tolerances. A missing, denied, stale, or unavailable source blocks cutover and is shown as unavailable; it is never converted into a zero-valued total.
9. Settlement handoff to finance uses versioned canonical order/ticket/provider totals and preserves reconciliation evidence (`TIX-513`). Environment flags may enable code paths globally but cannot substitute for the persisted organization decision.
10. Ticket, payment-reference, admission, credential, refund, provider-event, reconciliation, and audit history follows ADR-009 retention/legal-hold rules. Archive never removes ledger evidence; physical purge is a separately authorized, previewed, audited retention job.

## Consequences

- UI rollout waits on `TIX-10x` security hardening.
- `TIX-601`–`TIX-603` govern migration and retirement.
- Canonical identifiers and signed credentials are unguessable; customer/provider payloads use the protected-data policy.
- Legacy tables are not dropped as part of cutover. Retirement is a separately reviewed forward migration after usage and reconciliation gates pass.
