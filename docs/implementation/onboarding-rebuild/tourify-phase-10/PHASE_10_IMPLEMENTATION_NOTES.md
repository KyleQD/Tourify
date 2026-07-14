# Phase 10 Implementation Notes

## What this package does

Phase 10 adds the live staff roster and Work Mode management layer.

It includes:

- Typed roster and Work Mode models.
- Work Mode permission fallback mapping.
- Roster service for real Supabase rows.
- Universal Team Roster panel.
- Member detail drawer.
- Assignment dialog.
- Guarded roster API routes.
- CSV export route.
- Admin roster mount example.

## What this package does not do

It does not:

- Add mock roster rows.
- Add mock staff members.
- Add mock Work Mode assignments.
- Create staff from the client.
- Replace the scheduling system.
- Implement Phase 11 uploads or credentials vault behavior.

## Merge guidance

1. If `components/hiring/team-roster-panel.tsx` already exists from Phase 6, replace the placeholder with this real-data version.
2. If `/api/hiring/roster/route.ts` already exists from Phase 4, merge this service-backed version into the existing route.
3. If the repo has existing staff roster tables with different column names, adapt `HiringRosterService` only. Keep component props and API response shape stable.
4. If `staff_shift_assignments` does not exist, remove the insert block in `assignShiftZone()` and keep `assigned_zone` on `staff_members` until scheduling is wired.
5. If employment assignment uniqueness constraints differ, update the `upsert(..., { onConflict })` keys in `upsertRosterFromCompletedOnboarding()`.

## Validation

Run:

```bash
pnpm typecheck
pnpm lint
```

Then test with real data:

```txt
GET /api/hiring/roster?entity_type=venue&entity_id=<venue_id>
GET /api/hiring/roster/<member_id>?entity_type=venue&entity_id=<venue_id>
PATCH /api/hiring/roster/<member_id>
POST /api/hiring/roster/<member_id>/assignment
GET /api/hiring/roster/export?entity_type=venue&entity_id=<venue_id>
```

Repeat for `organization` and `artist` scope.
