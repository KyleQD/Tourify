# TOUR-201 — Version-aware metadata edits

**Date:** 2026-07-20  
**Spec:** `02_Tour_Portfolio_Lifecycle_and_Command_Center.md`

## Acceptance criteria

`expectedVersion` prevents silent overwrite; user sees conflicting fields and can reload or intentionally reapply changes.

## What shipped

- Column `tours.metadata_version` (migration `20260720184600_tour_metadata_version_tour201.sql`) — distinct from `plan_version`
- `lib/admin/tour-metadata-version-diff.ts` — conflict field diff + `TourMetadataVersionConflictError`
- `updateTour` checks `expected_version` / `metadata_version`, increments version, optimistic `.eq(metadata_version)`
- PATCH `/api/admin/tours/[id]` returns 409 with `diff` + server tour snapshot
- `presentTour` exposes `metadata_version` / `metadataVersion`

## Client contract

```json
{ "name": "…", "expected_version": 3 }
```

On conflict: reload from `tour` payload or re-submit with `currentVersion`.

## Tests

`__tests__/admin/tour-metadata-version.test.ts`

## Follow-ups

- Wire admin tour edit UI to send `expected_version` and show conflict dialog
- TOUR-202 transition commands
