# PLAN-001 — Stop / event identity ADR

**Status:** Accepted  
**Date:** 2026-07-20  
**Parent:** [ADR-004](../../architecture/adr/ADR-004-canonical-event-tour-records.md)  
**Spec:** `03_Tour_Builder_Stops_Routing_and_Holds.md`

## Decision

| Scenario | Rule |
|----------|------|
| New show stop | Creates `tour_stop` + new `events_v2` (or deferred event create with explicit command); both carry `org_id` |
| Attach existing event | Links `tour_stop.event_id` to existing org-owned (or grant-accessible) `events_v2`; no silent org change |
| Shared event | Allowed only with explicit policy; detach does not delete event |
| Non-show day | `tour_stop` type travel/rest/load/promo/etc.; `event_id` null |
| Detach | Removes/archives stop link; event retained unless separately eligible for delete |
| Cancel stop/event | Lifecycle commands; history preserved |
| Archive | Read-only; see ADR-009 |
| Delete | Blocked when published, ticketed, contracted, settled, or staffed |
| Settlement protection | Settled/ticketed events cannot be hard-deleted; stop detach requires impact preview |

## Consequences

Implemented by `PLAN-101`–`PLAN-204`.
