# ADR-006 — Readiness blockers vs warnings

**Status:** Accepted  
**Date:** 2026-07-20  
**Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md`, `03_Tour_Builder_Stops_Routing_and_Holds.md`  
**Aligns with:** `PLAN-003`, `REL-005`

## Context

Readiness UI and tests disagree on whether venue profiles and staffing are mandatory before publication. Server and client must share one contract.

## Decision

### Mandatory blockers (publish rejected without authorized override)

- At least one confirmed show stop with local date window
- Unique ordinals / valid stop graph
- Organization ownership (`org_id`) present
- No unresolved route impossibilities marked blocker severity (when route engine enabled)
- Ticketing inventory not in a corrupt/unreconciled state when ticketing is in scope for the tour

### Warnings (publish allowed with explicit override + audit)

- Missing venue **profile** link when free-text venue draft exists (venue profile recommended, **not** a hard blocker)
- Incomplete staffing / uncovered shifts (**warning** for initial GA; organizations may raise to blocker via org policy flag later)
- Missing travel/lodging/equipment for party (logistics warnings; become blockers only when org readiness policy enables them)
- Unacknowledged prior publications (warning unless change-notice policy requires re-ack)

### Override policy

- Overrides require `tour.publish` (or domain publish capability), reason string, and audit event.
- Publish command re-evaluates rules server-side inside the transaction (`PUB-201`).

## Consequences

- UI, server readiness engine, fixtures, and targeted tests must use these rule IDs (`PLAN-003`, `REL-005`).
- Product may tighten staffing to blocker per-tenant later without changing the default contract.
