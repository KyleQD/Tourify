# Assign Shifts Fix Plan

## Overview

Fix the "Assign staff member" modal and its broken assignment pipeline. There are four distinct problem areas:

1. **UI label fixes** — Modal title and field labels need to reflect the actual user being assigned.
2. **Root cause of assignment failure** — The service calls `staff_shift_assignments` (table does not exist) and updates columns (`assigned_zone`, `assigned_manager_id`, `notes`, `position`) that do not exist in the real `staff_members` schema.
3. **Tour/Event selector "All" option** — Allow assigning a user to all events within a tour.
4. **Onboarding-to-scheduling gap audit** — Several places reference non-existent columns or use wrong logic when bridging hired users to the scheduling/admin features.

---

## Sub-Tasks

---

### Task 1 — Fix modal title and role/position display

**Status:** `[ ] pending`

**Intent:**
Change "Assign staff member" → "Assign [user's name]" in the dialog title. Change the `Zone` field label to `Zone / Assignment` and pre-fill it with the member's current `role` from `staff_members.role` (which is the position they onboarded for), not from `assignedZone` (which doesn't exist in DB). Also rename the "Assigned manager ID" label to "Assigned manager".

**Relevant Context:**
- File: [`components/hiring/roster-assignment-dialog.tsx`](components/hiring/roster-assignment-dialog.tsx)
- Line 264: `<DialogTitle>Assign staff member</DialogTitle>` → `Assign {member?.profile.fullName ?? "staff member"}`
- Line 73: `useState(member?.assignedZone ?? "")` — `assignedZone` doesn't exist in `staff_members`; should default to `member?.position ?? ""`
- Line 354: Label "Assigned manager ID" → "Assigned manager"
- `member.position` maps to `staff_members.role` column (via `resolveMemberPosition` in the service, which reads `row.position ?? row.role`)

**Expected Outcomes:**
- Modal title reads "Assign Kyle" (or whatever the user's name is)
- Zone field is pre-populated with the member's role/position from onboarding
- Manager label is human-readable

**Todo List:**
1. In `roster-assignment-dialog.tsx`, change `<DialogTitle>` to use `member?.profile.fullName`
2. Change `useState(member?.assignedZone ?? "")` → `useState(member?.position ?? "")`
3. Update zone field to reset to `member?.position ?? ""` inside the `open` useEffect
4. Change label "Assigned manager ID" → "Assigned manager"

---

### Task 2 — Fix the assignment failure (schema mismatch)

**Status:** `[ ] pending`

**Intent:**
The core cause of "Failed to assign staff" is the service trying to write to columns and tables that don't exist in the actual database. Fix `assignShiftZone` in `HiringRosterService` to only write to columns that actually exist.

**Grounded Schema Facts:**
- `staff_members` real columns: `id`, `user_id`, `venue_id`, `name`, `email`, `phone`, **`role`** (not `position`), `department`, `status`, `employment_type`, `permissions`, **`assigned_zones`** (text array, not `assigned_zone`), `employer_entity_type`, `employer_entity_id`, `compliance_status`, `org_id`
- Columns that **do NOT exist**: `assigned_zone`, `assigned_manager_id`, `notes`, `position`
- `staff_shift_assignments` table does **NOT exist** — this is the primary crash point
- `employment_assignments` real columns: no `tour_id`, no `zone` — do not attempt to update them
- `hiring_audit_events` table **does** exist ✓
- `staff_shifts` table **does** exist with: `id`, `event_id`, `staff_member_id`, `shift_date`, `start_time`, `end_time`, `zone_assignment`, `role_assignment`, `status`, `notes`, `created_by`, `org_id`

**Expected Outcomes:**
- Assignment no longer throws an error
- `staff_members.role` is updated when zone/position is set (maps `zone` arg to `role` as override, or leave as-is)
- `staff_members.assigned_zones` (array) is updated by appending the new zone value when provided
- The `staff_shift_assignments` insert block is either removed entirely or wrapped in a try/catch that silently skips (preferred: remove it since the table doesn't exist)
- The `employment_assignments` update block that tries to set `tour_id` and `zone` (non-existent columns) is removed or corrected to only update real columns (`event_id`, `staff_member_id`)
- The `staff_shifts` update path remains intact (those columns exist)

**Design Decision:** Use only existing columns — no new columns added. Map service fields to real schema:
- `zone` arg → append to `assigned_zones[]` array on `staff_members`
- `assignedManagerId` → store in `permissions` JSONB as `{ manager_id: "..." }`
- `notes` → skip updating on `staff_members` (no column); pass to `staff_shifts.notes` only
- `position` → read from `role` (already handled by `resolveMemberPosition`)

**Todo List:**
1. In `lib/services/hiring-roster.service.ts` `assignShiftZone()`:
   a. Replace the `staff_members.update()` block: remove `assigned_zone`, `assigned_manager_id`, `notes`; instead append `args.zone` to `assigned_zones` array using a Postgres array append (use `supabase.rpc` or fetch+update pattern); store manager in `permissions` JSONB
   b. Remove the `staff_shift_assignments` insert block entirely (table does not exist)
   c. Fix the `employment_assignments` update block: only update `event_id` and `staff_member_id` (remove `tour_id` and `zone` which don't exist in that table)

**Relevant Context:**
- [`lib/services/hiring-roster.service.ts`](lib/services/hiring-roster.service.ts:851) — `assignShiftZone` method
- [`app/api/hiring/roster/[memberId]/assignment/route.ts`](app/api/hiring/roster/[memberId]/assignment/route.ts)

---

### Task 3 — Tour/Event selector: add "All events" option

**Status:** `[ ] pending`

**Intent:**
The admin should be able to assign a user to:
- **All events within a specific tour** (select a tour, then choose "All events in [Tour Name]")
- A single specific event (existing behavior)

When "All events in tour" is selected, the system **fans out**: it creates one shift stub + one assignment record per event in the tour, **plus** records a tour-level assignment. This means the user ends up assigned to every event individually as well as the tour itself.

**Expected Outcomes:**
- When a tour is selected, the event dropdown filters to only events belonging to that tour
- Event dropdown has an "All events in [tour name]" option (value `__all_tour_events__`)
- When "All events in tour" is selected, the dialog calls `assignShiftZone` once per event (fan-out loop) plus once with `tourId` only (no `eventId`) for the tour-level record
- Single event assignment works as before
- The event dropdown always shows "No event" as a valid option (assign to tour only, no specific event)

**Relevant Context:**
- [`components/hiring/roster-assignment-dialog.tsx`](components/hiring/roster-assignment-dialog.tsx:96) — events/tours fetch + selectors
- Events are fetched from `/api/admin/events` — need to add `?tour_id=` filter support or filter client-side from the returned events' `tour` array (events include `tours` in their response via the join)
- [`app/api/admin/events/route.ts`](app/api/admin/events/route.ts) — may need a `tour_id` query param to pre-filter
- [`lib/admin/tour-event-operations.service.ts`](lib/admin/tour-event-operations.service.ts:1018) — `listEvents` already filters by `scopedTourIds` via `tour_events`; add `tourId` param support

**Todo List:**
1. In `roster-assignment-dialog.tsx`, extend `EventOption` to carry `tourId?: string`
2. Enrich the events fetch: parse `event.tours[0]?.id` (already returned by `listEvents`) and store on each `EventOption`
3. When a tour is selected, filter displayed events client-side to those whose `tourId` matches the selected tour
4. Add an "All events in [tour name]" `SelectItem` (value `__all_tour_events__`) when a tour is chosen and there are events in that tour
5. In `handleSubmit`, detect `eventId === "__all_tour_events__"`:
   - Collect all `EventOption` items matching the selected `tourId`
   - Loop and call the assignment API once per event (fan-out) — each call uses the standard `ensureShiftStub` + `assignShiftZone` path
   - After the loop, make one final call with `tourId` only and no `eventId` to record the tour-level assignment
   - Show a loading state during the loop; surface any per-event errors as a count (e.g. "2 of 5 failed")
6. The event dropdown shows "No event" (assign to tour only) as the first option — this is the existing `__none__` item

---

### Task 4 — Audit and bridge onboarding → scheduling gap

**Status:** `[ ] pending`

**Intent:**
Several areas reference missing `staff_members` columns or make assumptions about data that doesn't exist yet. Do a targeted fix-up so hired users properly surface in scheduling and admin features.

**Grounded Gap Findings:**
- `staff_members` has no `position` column (only `role`) — `resolveMemberPosition()` handles this correctly via fallback, but the service update path in `assignShiftZone` sets `assigned_zone`/`assigned_manager_id`/`notes` which don't exist (fixed in Task 2)
- `staff_shifts` shifts created via `POST /api/events/[id]/staff` do not pass `org_id` — so they are invisible to queries that filter by `org_id`
- `employment_assignments` lacks `tour_id` and `zone` — the service's update block silently fails; since we're not adding columns (decision: use existing), this block should be removed or scoped to only real columns
- The `listEvents` API for `/api/admin/events` does not support `?tour_id=` filter query param — needed for Task 3 fan-out to know which events belong to a tour (client-side filtering from full list is acceptable and already works with `event.tours`)

**Expected Outcomes:**
- Missing `staff_members` columns added via migration (from Task 2 migration — handled there)
- `POST /api/events/[id]/staff` passes `org_id` when creating a shift stub (so scheduling tab can see it)
- `employment_assignments` updated to include `tour_id` and `zone` columns via migration (so the service's update path works)
- No other hard crashes in the assignment / scheduling flow

**Todo List:**
1. In `POST /api/events/[id]/staff` — after resolving the event reference, include `org_id` from the event row when inserting into `staff_shifts` (query `events_v2.org_id` via `resolveEventReference` or a follow-up select)
2. In `assignShiftZone` — remove the `employment_assignments` update block entirely (columns `tour_id` and `zone` do not exist; no migration planned)
3. Verify `resolveMemberPosition` works correctly — it already does (`row.position ?? row.role ?? "Staff"`); no changes needed
4. Confirm the roster member list query selects `assigned_zones` correctly (not the non-existent `assigned_zone`) so the array appears in the member detail panel

---

## No Migrations Required

Per user decision: use existing columns only. All fixes are code-only:
- `staff_members.assigned_zones[]` (exists) — append zone value
- `staff_members.permissions` (exists, JSONB) — store manager_id
- `staff_members.role` (exists) — already used for position
- Remove all writes to non-existent columns

---

## Implementation Order

1. **Task 2** first (fix the crash) — highest priority, purely service-side + migration
2. **Task 1** (UI label fixes) — quick, purely frontend
3. **Task 3** (All events option) — frontend + minor API enhancement
4. **Task 4** (gap audit) — remaining schema + API fixes
