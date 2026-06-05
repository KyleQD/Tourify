# Phase 4 — Workforce: Staff, Scheduling, RBAC, Applications

> **Goal:** Give event coordinators a complete crew management system — one unified roster, a visual shift scheduler, functional RBAC permissions, and a useful applications pipeline with bulk actions. Remove all mock/stub data from workforce surfaces.

---

## 4.1 Unify staff roster tables

**Problem:** Two parallel tables — `staff_members` (event staff) and `venue_team_members` (venue-level staff) — create a split view. Joins are complex and the UI masks it with mock data.

**Tasks:**

1. Audit both tables. Run in local Supabase: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name IN ('staff_members', 'venue_team_members');`
2. Create migration `YYYYMMDD_unified_staff_roster.sql`:
   - Add `entity_type` column to `staff_members`: `'event' | 'venue' | 'tour' | 'org'`
   - Add `entity_id` column: UUID referencing the specific event/venue/tour
   - Backfill existing `venue_team_members` rows into `staff_members` as `entity_type = 'venue'`
   - Add a view `unified_staff_roster` that selects from `staff_members` with all `entity_type`s
   - Mark `venue_team_members` as deprecated (add a comment, don't drop yet)
3. Update `app/api/admin/staff/route.ts` to query `staff_members` (not the old split queries).
4. Update `app/api/admin/team-members/route.ts` to also use `staff_members`.

**Done when:** `GET /api/admin/staff` returns staff from events, venues, and tours in a unified list.

---

## 4.2 Staff page: real roster with filtering

**Current state:** `app/admin/dashboard/staff/page.tsx` (1384 lines) has many tabs and uses `AdminOnboardingStaffService` which falls back to mock data.

**Tasks:**

1. After Phase 0.8 removes mock fallback, ensure the roster tab renders from real API data.
2. Add filter bar (use `AdminFilterBar` from Phase 1.2) with:
   - Search by name/email
   - Filter by `entity_type`: All / Events / Venues / Tours
   - Filter by `role`: All roles dropdown
   - Filter by `status`: Active / Inactive / Pending
3. Each staff card should show: name, avatar, role, assigned entity name, contact info, status badge.
4. **Add staff dialog** (`add-staff-dialog.tsx`): search existing users via `GET /api/admin/users/search`, select role, assign to entity. Calls `POST /api/admin/staff`.
5. **Staff detail drawer:** Clicking a staff member opens a right-side sheet showing: full profile, assignment history, documents, shift history.

**Done when:** Roster shows real staff data; filter/search work; adding staff persists.

---

## 4.3 Scheduling & shifts UI

**Current state:** `/api/admin/staffing/shifts` and `/api/admin/staffing/zones` routes exist but the staff page has no real scheduling UI — only toast-only handlers and sample data.

**Tasks:**

1. Create a `SchedulingTab` component (or page at `/admin/dashboard/staff?tab=scheduling`).
2. **Week view calendar grid.** Rows = staff members, columns = days of the week. Each shift appears as a colored block showing role + hours.
3. **Add shift dialog:** Select staff member (from roster), zone/area (from `GET /api/admin/staffing/zones`), start_time, end_time, date, role. Calls `POST /api/admin/staffing/shifts`.
4. **Edit/delete shift:** Click on a shift block → edit dialog or delete confirmation. Calls `PATCH` / `DELETE /api/admin/staffing/shifts/[id]`.
5. **Shift zones:** The zones API (`GET /api/admin/staffing/zones`) returns named areas (Stage, Front Gate, VIP, etc.). Color-code shifts by zone.
6. **Conflict detection:** On adding a shift, check if the staff member already has a shift overlapping the time window. Show a warning (not a block).
7. **Copy week:** "Copy this week's schedule" button that duplicates all shifts to next week.
8. **Filter by event/entity:** Dropdown to scope the schedule to a specific event or tour.

**API shape for shifts:**
```ts
// GET /api/admin/staffing/shifts?event_id=<id>&week_start=<iso>
// POST /api/admin/staffing/shifts
{
  staff_member_id: string,
  zone_id: string,
  event_id?: string,
  tour_id?: string,
  start_time: string,  // ISO datetime
  end_time: string,
  role: string,
  notes?: string
}
```

**Done when:** Week grid shows color-coded shifts; adding/editing/deleting shifts persists.

---

## 4.4 Teams by job: persist mutations

**Current state:** `app/admin/(dashboard-shell)/teams/[jobId]/page.tsx` has team management UI but mutations (add/remove member) may only log to console.

**Tasks:**

1. Open the file. Find the add-member and remove-member handlers.
2. Wire add-member to `POST /api/admin/tours/teams` (or `POST /api/admin/team-members`): `{ job_id, user_id, role }`.
3. Wire remove-member to `DELETE /api/admin/tours/teams?job_id=<id>&user_id=<id>`.
4. Wire role-change to `PATCH /api/admin/tours/teams`: `{ job_id, user_id, role }`.
5. After mutation, re-fetch the team list to reflect changes.

**Done when:** Adding a team member to a job in the UI is visible after page refresh.

---

## 4.5 RBAC: user/entity picker + permission matrix fix

**Current state:** `app/admin/dashboard/rbac/page.tsx` uses `components/admin/rbac-role-assignment.tsx` and `components/admin/permissions-matrix.tsx`. The permission matrix may show inaccurate data; the user picker may not query real users.

**Tasks:**

1. **User picker:** In `rbac-role-assignment.tsx`, wire user search to `GET /api/admin/users/search?q=<query>`. Show display name, email, avatar in results. On select, populate user_id field.
2. **Entity picker:** Wire entity picker to `GET /api/admin/events?search=<q>` or tours for entity scope.
3. **Assign role:** `POST /api/admin/rbac/assign-role` with `{ user_id, entity_id, entity_type, role }`. The route already exists — ensure it writes to the RBAC tables from `supabase/migrations/20250812090000_entity_rbac_core.sql`.
4. **Permission matrix:** `components/admin/permissions-matrix.tsx` currently uses `Math.random() > 0.5` to populate matrix cells — completely disconnected from the DB. Delete this component and replace with a real matrix: load role-permission assignments from `GET /api/admin/rbac/roles`, load capability list from `GET /api/admin/capabilities`. Build a checkbox grid where `hasPermission(role, capability)` checks actual role.permissions data. Saving calls `PATCH /api/admin/rbac/roles/[id]` with updated permission set. Note: the `rbac/page.tsx` RBAC dashboard has a separate but equally broken matrix that shows every permission checked if `role.permission_count > 0` — fix that same logic there.
5. **Feature flag gate:** Enable the RBAC UI path (currently behind `FEATURE_ENTITY_RBAC` env flag). Add `FEATURE_ENTITY_RBAC=true` to `.env.local`.
6. **Audit trail:** Each RBAC change should be written to `app/api/admin/rbac/entity/[entityType]/[entityId]/audit/route.ts`.

**Done when:** Can assign a role to a user for a specific event; the permission matrix reflects their capabilities.

---

## 4.6 Applications: bulk export + bulk messaging

**Current state:** `app/admin/(dashboard-shell)/applications/page.tsx` has an applications pipeline but bulk actions may be stub.

**Tasks:**

1. **Bulk select:** Add checkboxes to the applications list. "Select all" checkbox in the header.
2. **Bulk actions toolbar** (appears when 1+ selected): "Move to stage", "Send message", "Export", "Reject".
3. **Bulk export:** Selected applications → CSV download. Fields: name, email, job title, stage, applied_at, resume_url. Call `GET /api/admin/applications?ids=<csv>&format=csv`.
4. **Bulk message:** Opens a dialog with a subject + body textarea. Calls `POST /api/admin/messages/broadcast` with `{ recipient_ids: [], subject, message }` for each selected applicant.
5. **Individual messaging:** Per-applicant "Message" button that opens a direct message thread via the unified messaging system (Phase 7 will refactor this, but for now: call `POST /api/admin/communications` with `{ recipient_id, message, type: 'direct' }`).
6. **Stage transitions:** Drag-and-drop Kanban OR simple stage dropdown: Applied → Review → Interview → Offer → Hired / Rejected. Calls `PATCH /api/admin/applications/[id]` with `{ stage }`.

**Done when:** Can select multiple applications, export as CSV, and send a bulk message.

---

## 4.7 Staff analytics tab

**Current state:** Staff page analytics tab shows "coming soon."

**Tasks:**

1. Wire analytics tab to real queries:
   - **Headcount by role:** `SELECT role, count(*) FROM staff_members WHERE org_id = ? GROUP BY role`
   - **Shift hours this month:** join `shifts` + aggregate hours per staff member
   - **Open positions:** count of `job_postings` with `status = 'open'`
   - **Application pipeline count:** count by stage from `job_applications`
2. Display as:
   - `AdminStatCard` for: Total Staff, Total Shift Hours, Open Positions, Pending Applications
   - BarChart (recharts): staff by role
   - BarChart: shifts scheduled vs filled per week (last 4 weeks)

**Done when:** Analytics tab shows real counts; charts render from DB data.

---

## 4.8 Remove test routes

**Current state:** `app/admin/(dashboard-shell)/test/page.tsx`, `app/admin/dashboard/staff/test/page.tsx`, `app/admin/dashboard/staff/test-integration.tsx`, `app/admin/dashboard/staff/test-job-posting.tsx` are dev-only routes.

**Tasks:**

1. Delete `app/admin/(dashboard-shell)/test/page.tsx`.
2. Delete `app/admin/dashboard/staff/test/page.tsx`.
3. Move `test-integration.tsx` and `test-job-posting.tsx` to a `__tests__` directory or delete if they are not actual test files.
4. If any sidebar link points to these test routes, remove the link.

**Done when:** No test routes are accessible in production build.

---

## 4.9 Staff Communications tab

**Current state:** Communications tab on staff page shows mock data or "coming soon."

**Tasks:**

1. Wire to `GET /api/admin/communications?type=team` which queries `team_communications` table (Phase 7 will unify this, but for now use the legacy table).
2. Show: message subject, sender, recipients, sent_at, type (announcement/bulletin/broadcast).
3. "New Message" button → dialog with: subject, message body, recipient picker (staff members), priority (normal/urgent).
4. Calls `POST /api/admin/communications` with `{ subject, content, recipients, priority, type: 'staff_bulletin' }`.

**Done when:** Staff communications tab shows real messages; new messages can be sent.

---

## Phase 4 Exit Criteria

- [ ] Staff roster shows unified real data (no mock fallback)
- [ ] Filtering by entity type, role, and status works
- [ ] Shift calendar shows weekly grid with color-coded shifts
- [ ] Adding/editing/deleting shifts persists
- [ ] Teams mutations persist after page refresh
- [ ] RBAC user picker queries real users; role assignments save
- [ ] Applications bulk export as CSV works
- [ ] Bulk messaging sends to selected applicants
- [ ] Analytics tab shows real counts and charts
- [ ] Test routes deleted
- [ ] `npm run build` passes
