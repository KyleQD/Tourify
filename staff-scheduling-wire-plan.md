# Staff Scheduling — Full Integration & Live Data Wire-Up Plan

## Top-Level Overview

The staff scheduling page (`/admin/dashboard/staff?tab=scheduling`) has **one root cause compounding across 5 client components**: none of their `fetch` calls send the `x-acting-profile-id` / `x-acting-account-type` / `x-acting-org-id` acting context headers. Every Admin API route is protected by `withAdminCapability`, which calls `resolveActingAdminContext`. Without those headers (and without a matching `user_sessions` row), the API returns a 409 `acting_context_required` error. The client components then surface this as:

- **"Select an organization account before continuing."** — shown by `SchedulingConflictsPanel` and `AttendanceCorrectionPanel` (the two red banners above the scheduler)
- **"Events unavailable for this account — you can still schedule org-wide shifts."** — shown inside the scheduling board itself

Because events fail to load, the scheduler stays in or falls back to `"demo"` mode and shows hard-coded placeholder data: **"Neon Skyline Tour"**, **"The Prism Arena"**, **"Midnight Echo Festival"**, etc.

The `useActingContext()` hook (in `hooks/use-acting-context.ts`) already builds the correct ready-to-spread `actingHeaders` object from `useMultiAccount()`. It just isn't being called by any of these components.

**No API routes need to change.** The fix is purely client-side: call `useActingContext()` and spread `actingHeaders` into every `fetch` call in the affected files.

### Affected Files
| File | Problem |
|---|---|
| `components/admin/workforce/scheduling-conflicts-panel.tsx` | `load()` fetches `/api/admin/workforce/conflicts` with no headers → 409 → red "Select org" banner |
| `components/admin/workforce/attendance-correction-panel.tsx` | `load()` and `submitCorrection()` fetch `/api/admin/workforce/attendance` with no headers → 409 → red "Select org" banner |
| `components/admin/scheduling/use-scheduling-data.ts` | `getJson()` helper and all mutation `fetch` calls omit headers → events/roster/shifts fail → demo data shown |
| `components/admin/scheduling/live-scheduling-panel.tsx` | `fetchData()`, `addShift()`, `removeShift()`, `copyWeek()` all omit headers → shifts don't load |
| `components/hiring/roster-assignment-dialog.tsx` | `loadOptions()` (events + tours + managers), `loadShifts()`, `ensureShiftStub()`, `handleSubmit()` all omit headers → empty Tour/Event dropdowns |

---

## Sub-Tasks

### Sub-Task 1 — Fix `SchedulingConflictsPanel` (first red banner)

**Intent**
`SchedulingConflictsPanel` calls `useActingContext()` to get `actingAccount` but then ignores `actingHeaders` in the actual fetch call. Spread the headers into the request.

**Expected Outcomes**
- The first "Select an organization account before continuing." red banner disappears
- The panel either shows real conflicts or correctly renders "No open conflicts." for DreamStream

**Todo List**
1. In `scheduling-conflicts-panel.tsx`, destructure `actingHeaders` from `useActingContext()` (it already destructures `actingAccount`).
2. Add `headers: actingHeaders` to the `fetch("/api/admin/workforce/conflicts?...")` call inside `load()` (line 111).
3. Add `actingHeaders` to the `useCallback` dependency array for `load`.

**Relevant Context**
- `components/admin/workforce/scheduling-conflicts-panel.tsx` — `load` callback at line 107
- `hooks/use-acting-context.ts` — `useActingContext()` returns `{ actingHeaders, actingAccount, isActingReady, ... }`

**Status**: [x] done

---

### Sub-Task 2 — Fix `AttendanceCorrectionPanel` (second red banner)

**Intent**
`AttendanceCorrectionPanel` also calls `useActingContext()` for `actingAccount` but omits `actingHeaders` from its fetch calls.

**Expected Outcomes**
- The second "Select an organization account before continuing." red banner disappears
- The panel shows real attendance entries or "No attendance entries." for DreamStream
- Submitting a manual correction routes to the correct org

**Todo List**
1. Destructure `actingHeaders` from the existing `useActingContext()` call in `attendance-correction-panel.tsx`.
2. Add `headers: actingHeaders` to the `fetch("/api/admin/workforce/attendance?limit=50")` GET call inside `load()` (line 77).
3. Add `headers: { "Content-Type": "application/json", ...actingHeaders }` to the `fetch("/api/admin/workforce/attendance", { method: "POST", ... })` call inside `submitCorrection()` (line 106).
4. Add `actingHeaders` to the `useCallback` dependency array for `load`.

**Relevant Context**
- `components/admin/workforce/attendance-correction-panel.tsx` — `load` at line 73, `submitCorrection` at line 102

**Status**: [x] done

---

### Sub-Task 3 — Fix `use-scheduling-data.ts` GET fetches (events, roster, shifts, zones)

**Intent**
The `getJson()` helper in `use-scheduling-data.ts` is a module-level function with no access to acting headers. It is used for all 4 data-loading fetches in `reload()`. Convert it to accept headers so the acting context reaches the Admin API.

**Expected Outcomes**
- `/api/admin/events` returns DreamStream's real events — "All Events" dropdown populates
- "Events unavailable for this account" soft-error disappears
- `/api/hiring/roster` returns DreamStream's approved staff — "Staff & Crew" panel populates with real names
- `/api/admin/staffing/shifts` returns real scheduled shifts — the schedule board shows real data
- Mode stays `"live"` (not `"demo"`)

**Todo List**
1. Add `useActingContext()` call inside `useSchedulingData()` to obtain `actingHeaders`.
2. Change `getJson(url: string)` to `getJson(url: string, headers?: Record<string, string>)` — merge the extra headers into the `fetch` options.
3. Pass `actingHeaders` as the second argument to all 4 `getJson(...)` calls inside `reload()`:
   - `getJson("/api/admin/events", actingHeaders)`
   - `getJson(\`/api/hiring/roster?...\`, actingHeaders)`
   - `getJson(\`/api/admin/staffing/shifts?...\`, actingHeaders)`
   - `getJson(\`/api/admin/staffing/zones?...\`, actingHeaders)` (inside `zonesPromise`)
4. Add `actingHeaders` to the `reload` `useCallback` dependency array.

**Relevant Context**
- `components/admin/scheduling/use-scheduling-data.ts` — `getJson` at line 638, `reload` at line 705
- The `/api/hiring/roster` route uses `resolveHiringActorFromRequest` (reads `entity_type` + `entity_id` query params) — does **not** require admin acting headers, so adding them is safe and won't break roster loading

**Status**: [x] done

---

### Sub-Task 4 — Fix `use-scheduling-data.ts` mutation fetches

**Intent**
All write operations (create/update/delete/assign/publish shifts) call `fetch` directly without acting headers. These fail silently or route to the wrong org.

**Expected Outcomes**
- Creating, editing, deleting, assigning, and publishing shifts all succeed against DreamStream's org
- No "401 Unauthorized" or "409 acting_context_required" errors on save

**Todo List**
1. Using the `actingHeaders` already available from Sub-Task 3, spread into each mutation's `headers` object:
   - `createShift` — POST to `/api/admin/staffing/shifts` (~line 903): add `...actingHeaders`
   - `updateShift` — PATCH to `/api/admin/staffing/shifts/${shiftId}` (~line 930): add `...actingHeaders`
   - `updateShiftStatus` — PATCH to `/api/admin/staffing/shifts/${shiftId}` (~line 958): add `...actingHeaders`
   - `deleteShift` — DELETE to `/api/admin/staffing/shifts/${shiftId}` (~line 972): add `headers: actingHeaders`
   - `assignStaff` — PATCH (~line 995) and POST for extra staff (~line 1010): add `...actingHeaders`
   - `publishShifts` — POST to `/api/admin/staffing/shifts/publish` (~line 1044): add `...actingHeaders`

**Relevant Context**
- `components/admin/scheduling/use-scheduling-data.ts` lines 877–1056

**Status**: [x] done

---

### Sub-Task 5 — Fix `live-scheduling-panel.tsx`

**Intent**
`live-scheduling-panel.tsx` is a separate legacy scheduling component rendered in some workforce contexts. It makes its own direct `fetch` calls to the staffing API without acting headers.

**Expected Outcomes**
- `fetchData()` loads real shifts, zones, and roster for the org
- `addShift()`, `removeShift()`, and `copyWeek()` mutations succeed against the correct org

**Todo List**
1. Import and call `useActingContext()` at the top of `StaffSchedulingTab` in `live-scheduling-panel.tsx` to obtain `actingHeaders`.
2. Spread `actingHeaders` into the three GET fetch calls inside `fetchData()` (shifts, zones, roster — lines ~133–140).
3. Spread `actingHeaders` into the fallback staff fetch (~line 183).
4. Spread `actingHeaders` into the POST inside `addShift()` (~line 244).
5. Spread `actingHeaders` into the DELETE inside `removeShift()` (~line 272).
6. Spread `actingHeaders` into every POST inside `copyWeek()` (~line 302).
7. Add `actingHeaders` to the `fetchData` `useCallback` dependency array.

**Relevant Context**
- `components/admin/scheduling/live-scheduling-panel.tsx`

**Status**: [x] done

---

### Sub-Task 6 — Fix `RosterAssignmentDialog` (Tour/Event dropdowns)

**Intent**
The "Assign staff member" modal fetches `/api/admin/events` and `/api/admin/tours` for its dropdowns. Both requests omit acting headers so the dropdowns are always empty. The shift-load fetch and submission requests have the same problem.

**Expected Outcomes**
- The Tour dropdown populates with DreamStream's real tours
- The Event dropdown populates with DreamStream's real events
- The Shift dropdown populates with real existing shifts when an event is selected
- Assigning a staff member routes to the correct org

**Todo List**
1. Import and call `useActingContext()` inside `RosterAssignmentDialog` in `components/hiring/roster-assignment-dialog.tsx`.
2. Spread `actingHeaders` into the 3 `loadOptions` fetch calls:
   - `fetch("/api/admin/events", ...)` — add `headers: actingHeaders`
   - `fetch("/api/admin/tours", ...)` — add `headers: actingHeaders`
   - `fetch(\`/api/hiring/roster?...\`, ...)` — add `headers: actingHeaders`
3. Spread `actingHeaders` into the `loadShifts` fetch: `fetch(\`/api/events/${eventId}/staff\`, ...)`.
4. Spread `actingHeaders` into the `ensureShiftStub` POST fetch (`/api/events/${eventId}/staff`).
5. Spread `actingHeaders` into the `handleSubmit` POST fetch (`/api/hiring/roster/${member.id}/assignment`).

**Relevant Context**
- `components/hiring/roster-assignment-dialog.tsx` — `loadOptions` effect at line 89, `loadShifts` at line 161, `ensureShiftStub` at line 199, `handleSubmit` at line 221

**Status**: [x] done

---

### Sub-Task 7 — Validation

**Intent**
Confirm the full scheduling flow works end-to-end with real DreamStream data after all fixes.

**Expected Outcomes**
- Zero "Select an organization account before continuing." banners on the scheduling page
- Zero "Events unavailable for this account" errors
- "All Events" dropdown shows DreamStream's real events and tours
- "Staff & Crew" panel shows real onboarded staff (not "Ava Chen", "Marcus Rivera", etc.)
- Create/edit/assign/publish shift operations complete without API errors
- "Assign staff member" modal Tour and Event dropdowns are populated
- TypeScript typecheck passes with no new errors
- Existing scheduling tests pass

**Todo List**
1. Run `tsc --noEmit` — confirm no type errors.
2. Run `__tests__/hiring/scheduling-demo-live-mode.test.ts` and `__tests__/hiring/org-admin-scheduling-scope.test.ts`.
3. Navigate to `/admin/dashboard/staff?entity_type=organization&entity_id=ab1456e2-6563-46ad-8b5c-79f40232b924&display_name=DreamStream&tab=scheduling` and confirm:
   - No red banners
   - Real events load in the filter dropdown
   - Scheduling board shows real data (or empty state — not demo placeholders)
4. Open the "Assign staff member" modal from the Team tab — confirm Tour and Event dropdowns populate.

**Relevant Context**
- `__tests__/hiring/scheduling-demo-live-mode.test.ts`
- `__tests__/hiring/org-admin-scheduling-scope.test.ts`

**Status**: [x] done
