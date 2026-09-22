# CAL-102 — Enforce acting context and visibility

**Date:** 2026-07-20  
**Spec:** `12_Calendar_Communications_and_Notifications.md`

## Acceptance criteria

Calendar queries use signed active org, capabilities, source access, and protected-field projection; multi-org tests include guessed source IDs and feeds.

## What shipped

### Signed acting org

`GET /api/admin/calendar` uses `resolveActingAdminContext` (required org). Tour/event scopes go through `assertAdminTourAccess` / `assertAdminEventAccess`.

Export + token routes also resolve acting context (token rotate requires `org.settings.manage`).

Aggregate scopes `events_v2` with exclusive `org_id` (no `created_by` OR leak).

### Source capability gates

`lib/admin/calendar/source-access.ts` maps kinds/sources → capabilities. Aggregate skips unauthorized sources.

### Protected-field projection

`lib/admin/calendar/field-projection.ts` redacts passengers/staff/assignment meta and person suffixes in titles unless manage-level caps; feed mode always redacts.

### Feeds

`GET /api/calendar/org/[orgId]` uses `isValidCalendarFeedToken` + feed projection.

### Multi-org contract

`lib/admin/calendar/visibility-contract.ts` + `__tests__/admin/calendar-visibility.test.ts` — Org A/B + guessed record IDs + feed token cases.

## Follow-ups

- `CAL-103` remove heterogeneous calendar POST inserts
- Live persona matrix against `ADMIN_RLS_TEST_DATABASE_URL` when available
