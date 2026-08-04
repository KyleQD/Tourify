# EVENT-201 — Unify event readiness rules (implemented)

**Status:** Complete  
**Date:** 2026-07-20  
**Spec:** `docs/admin-feature-specs/05_Event_Advancing_Day_Sheets_and_Live_Ops.md` — EVENT-201  
**ADR:** [ADR-006](../../architecture/adr/ADR-006-readiness.md)

## Acceptance criteria

Event readiness has stable rule IDs / severity / evidence / remediation and is used by builder, command center, and server publication.

## Decision (locked)

- Shared rule catalog in `lib/admin/readiness-contract.ts` (`listEventReadinessRules`, remediation paths, override policy).
- Pure engine `evaluateEventReadiness` + warning overrides in `lib/admin/event-readiness-engine.ts`.
- Persisted evaluation via `evaluateEventReadinessFromPersisted` for APIs and publish.
- `getEventReadiness` returns checklist + `evaluation` for builder / command-center payloads.
- `publishEvent` rejects contract blockers (`AdminEventPublishReadinessError` / `event_not_ready`).

## Surfaces

| Surface | Wiring |
|---------|--------|
| Builder | `app/admin/dashboard/events/create/page.tsx` → `getEventReadiness` |
| Command center / event GET | `presentEvent` → `readiness.evaluation` |
| Server publish | `POST /api/admin/events/[id]/publish` |
| Read API | `GET|POST /api/admin/events/[id]/readiness` |

## Files

- `lib/admin/readiness-contract.ts`
- `lib/admin/event-readiness-engine.ts`
- `lib/admin/event-readiness-engine.service.ts`
- `lib/admin/operations-readiness.ts`
- `lib/admin/tour-event-operations.service.ts`
- `app/api/admin/events/[id]/publish/route.ts`
- `app/api/admin/events/[id]/readiness/route.ts`
- `lib/admin/api-route-registry.ts`
- `__tests__/admin/event-readiness-engine.test.ts`

## Verify

`npx vitest run __tests__/admin/event-readiness-engine.test.ts __tests__/admin/events-tours-utility-hub.test.ts __tests__/admin/tour-event-operations.test.ts __tests__/admin/tour-event-hardening.test.ts`
