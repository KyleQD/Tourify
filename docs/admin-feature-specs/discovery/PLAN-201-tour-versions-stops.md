# PLAN-201 — Create `tour_versions` and `tour_stops`

## Acceptance criteria

Backfill is deterministic; route/order data reconciles with `tour_events`; unresolved conflicts are quarantined and reviewed.

## Shipped

1. **Schema** — `supabase/migrations/20260720194500_tour_versions_stops_plan201.sql`
   - `tour_versions` (draft/published/archived; unique `(tour_id, version_number)`)
   - `tour_stops` (versioned ordinals, stop types, optional `event_id`, bridge `tour_event_id`)
   - `tours.current_draft_version_id`
   - `tour_plan_quarantine` + `tour_plan_normalize_stats_v`
   - Org-member RLS on versions/stops; quarantine readable for review

2. **Deterministic backfill** — `lib/admin/tour-plan-backfill.ts`
   - Prefer `tour_events` order; merge compatible `settings.route[]` fields
   - Never invent `org_id`
   - Conflict types: `ordinal_mismatch`, `missing_event`, `route_only_orphan`, `duplicate_ordinal`, `unresolvable_org`

3. **Persist service** — `lib/admin/tour-plan-normalize.service.ts`
   - Upsert draft version at `tours.plan_version`, replace active stops, insert quarantine rows
   - Org batch backfill helper

4. **Plan service dual-write** — `writeTourPlan` calls normalize after reconcile; `readTourPlan` prefers `tour_stops` when present

5. **APIs**
   - `POST /api/admin/tours/plan/backfill` — single tour or org batch
   - `GET /api/admin/tours/plan/quarantine` — open conflicts for review

## Verify

```bash
npx vitest run __tests__/admin/tour-plan-backfill.test.ts
```

Apply migration when DB credentials available (`supabase db push`). Never `db reset`.

## Follow-ups

- PLAN-202 stop editor on normalized stops
- PLAN-602 full JSON/`tour_events`/stops reconciliation job
