# TRAVEL-103 — Replace arbitrary CRUD payloads

**Date:** 2026-07-20  
**Spec:** `07_Travel_Transport_and_Lodging.md`

## Acceptance criteria

Per-command schemas allow explicit fields and state transitions; record and parent belong to acting org; unknown fields are rejected.

## What shipped

### Schemas

`lib/admin/travel-command-schemas.ts` — strict Zod schemas for every travel-coordination create/update command (`.strict()` rejects unknown fields). Shared `parseTravelCoordinationCommand` + `canTransitionTravelStatus` allowlist.

### API wire

`app/api/admin/travel-coordination/route.ts`:

- Resolves acting org via `resolveActingAdminContext`
- POST/PUT parse through command schemas before mutation
- Parent/record `org_id` must match acting org (`assertOrgMatch`)
- Creates stamp `org_id` from parent or acting org (never invent across orgs)
- PUT loads existing row, enforces status transitions, scopes updates with `.eq('org_id', actingOrgId)`
- DELETE travel group also org-scoped

### Tests

`__tests__/admin/travel-command-schemas.test.ts` — unknown fields, unknown actions, transitions, update schemas.

## Follow-ups

- `TRAVEL-104` — coordination language/state honesty for auto-coordinate UI
