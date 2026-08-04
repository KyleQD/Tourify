# PLAN-003 — Readiness contract (implemented)

**Status:** Complete  
**Date:** 2026-07-20  
**ADR:** [ADR-006](../../architecture/adr/ADR-006-readiness.md)

## Decision (locked)

- Venue **profile** missing with free-text venue draft → **warning**
- Staffing incomplete → **warning** (org may elevate later)
- No venue identity at all → **blocker**
- Shared rule IDs in `lib/admin/readiness-contract.ts`
- `getEventReadiness` / tests updated to match

## Files

- `lib/admin/readiness-contract.ts`
- `lib/admin/operations-readiness.ts`
- `__tests__/admin/events-tours-utility-hub.test.ts`
- `__tests__/admin/tour-event-operations.test.ts`

## Verify

`npx vitest run __tests__/admin/events-tours-utility-hub.test.ts __tests__/admin/tour-event-operations.test.ts` — passed.
