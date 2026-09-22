# TOUR-202 — Implement transition commands

**Date:** 2026-07-20  
**Spec:** `02_Tour_Portfolio_Lifecycle_and_Command_Center.md`

## Acceptance criteria

Status cannot be patched directly; commands enforce readiness/state/capability and write transaction + audit + outbox event.

## What shipped

### API

`POST /api/admin/tours/:id/transitions/:command`

Commands: `start_planning` | `mark_ready` | `publish` | `retract` | `activate` | `complete` | `settle` | `cancel` | `archive` | `restore`

Body: `{ reason?, idempotency_key? }` — reason required for retract/cancel/restore. Header `Idempotency-Key` supported.

### Service

`lib/admin/tour-transition.service.ts`

1. Tour access + acting org
2. Blocker collection (`readiness.mandatory`, `stops.all_ended`, `finance.settlements_approved`)
3. `evaluateTourTransition` (capability, SoD, legal retention)
4. Persist `status` + `settings.lifecycle` (+ metadata_version bump)
5. `commitDomainWithOutbox` for `tour.lifecycle_changed` (+ published/retracted/cancelled/archived)
6. `logAuditEvent` — rollback status if outbox fails

### Direct status patch ban

`update_status_direct` denied for **all** tour states (including draft) → clients must use transition commands.

### Registry

`/api/admin/tours/[id]/transitions/[command]` registered.

## Tests

`__tests__/admin/tour-transition.test.ts` + state-aware direct-status ban

## Follow-ups

- Legacy `POST .../publish` remains; migrate UI to transitions
- TOUR-203 command-center summary BFF
