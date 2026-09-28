# ADR-009 — Deletion and retention

**Status:** Accepted  
**Date:** 2026-07-20  
**Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md`, `02_Tour_Portfolio_Lifecycle_and_Command_Center.md`

## Context

Destructive delete of referenced tours/events risks tickets, contracts, settlements, and audit integrity.

## Decision

1. **Default:** archive (read-only retention) over hard delete for any tour/event that is published, ticketed, contracted, paid, staffed, or otherwise referenced.
2. **Hard delete** only for eligible unreferenced **drafts**, via eligibility service + `tour.delete`, transactional + audited (`TOUR-208`).
3. **Retention minimums (operational default):**
   - Security audit events: 7 years (append-only)
   - Finance, settlements, contracts, invoices: 7 years
   - Tickets/orders/admissions: 7 years (or jurisdiction max)
   - Incidents: 7 years
   - Uploaded operational docs: retain while parent retained + 1 year
4. **Cancellation** is a lifecycle state with impact workflow — not delete (`TOUR-502`).
5. Soft-delete/retention fields preferred; physical purge only via retention job after policy window + legal hold check (`SEC-605`).
6. Archive never shortens a retention window, clears a legal hold, revokes required historical access, or removes the audit trail.
7. Purge jobs are service-owned and organization-scoped, support a read-only preview/count report, require an idempotency key and audit event, and fail closed when ownership or retention evidence is unavailable.

## Consequences

- Archive/restore and cancellation impact ship before broad delete UX.
- Exports and shares respect retention and audience policy.
