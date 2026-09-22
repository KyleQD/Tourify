# ADR-004 — Canonical event and tour records

**Status:** Accepted  
**Date:** 2026-07-20  
**Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md`, `03_Tour_Builder_Stops_Routing_and_Holds.md`

## Context

`tours`, `events_v2`, and `tour_events` coexist. Builder updates can diverge from JSON route settings. Normalized `tour_stops` are specified but not yet authoritative everywhere.

## Decision

1. **`tours`** is the identity root for a tour (metadata, lifecycle, org ownership, versions).
2. **`events_v2`** is the operational show/event identity (ticketing, advancing, live ops, settlements).
3. **`tour_stops`** (normalized, versioned) is the authoritative tour placement of shows and non-show days (ordinal, type, windows, venue relation, event link). `tour_events` becomes a compatibility projection during migration.
4. **Detach vs delete:** removing a stop detaches/archives the tour relation; it does not silently delete a shared or published `events_v2` row.
5. **Legacy adapters:** JSON route/settings and owner-scoped `/api/tours/*` are read-compatible until Phase 6 retirement (`PLAN-603`, `TOUR-604`). New writes go through canonical plan commands only.
6. **Retirement target:** after reconciliation reports zero unexplained drift and org flags disable legacy writes — not a fixed calendar date; gated by `PLAN-602` / `REL-610`.

### Identity and retention rules

| Operation | Canonical result |
|---|---|
| Create a new show stop | Create one `events_v2` identity and one versioned `tour_stops` placement in the acting organization. |
| Attach an existing event | Create only the tour placement after same-organization ownership validation; do not clone or rewrite the event. |
| Share an event across tours | Keep one event identity with multiple tour placements; primary-tour metadata is explicit and never inferred from membership/order. |
| Add a non-show day | Create a stop with the appropriate non-show type and `event_id = null`; do not invent an event. |
| Detach a stop | Mark/detach the placement according to plan version policy; retain the event and historical placement evidence. |
| Cancel an event | Transition the event lifecycle and retain its stop/history so downstream impacts can be reviewed; cancellation is not deletion. |
| Archive a tour | Retain plan versions, stops, events, publications, tickets, contracts, staffing, finance, and audit history as read-only records. |
| Hard-delete an eligible draft tour | Require the separate draft-only eligibility command; detach event relations but never cascade-delete `events_v2`. Event deletion has its own eligibility check. |
| Change a settled/protected stop | Require an impact/correction workflow; never bypass ticket, contract, staffing, publication, or settlement protection through a plan write. |

## Consequences

- `PLAN-001` / `PLAN-201` implement stop identity and tables.
- Dual-write is temporary and measured; never guess org on backfill.
