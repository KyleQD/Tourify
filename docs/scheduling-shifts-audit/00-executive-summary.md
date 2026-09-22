# Tourify Scheduling & Shifts — Executive Summary

**Date:** 2026-08-03
**Auditor:** Kimi
**Scope:** Scheduling & Shifts ecosystem within Admin/Organization and Venue contexts
**Status:** Audit Complete — Implementation Roadmap Ready

---

## 1. What Currently Exists

The Tourify codebase contains a **partially implemented** Scheduling & Shifts ecosystem with both admin and venue-facing surfaces. The core data model (`staff_shifts` table), API layer, and basic UI components are in place. A workforce assignment bridge (`employment_assignments`) connects shifts to the Work Mode worker experience.

### Key Existing Components

| Layer | What Exists |
|-------|------------|
| **Database** | `staff_shifts`, `employment_assignments`, `staff_members`, `staff_zones`, `hiring_audit_events` |
| **Admin API** | `/api/admin/staffing/shifts` (CRUD), `/api/admin/staffing/zones`, `/api/admin/staffing/shifts/[id]/publish` |
| **Venue API** | `/api/venue/shifts`, `/api/venue/shifts/[id]`, `/api/venue/shifts/assignments`, `/api/venue/shifts/swaps`, `/api/venue/shifts/requests` |
| **Admin UI** | `StaffSchedulingTab` (week grid), `live-scheduling-panel.tsx`, `use-scheduling-data.ts` hook |
| **Venue UI** | `/venue/staff/scheduling` page with tabs: Calendar, Shifts, Templates, Requests, Analytics |
| **Work Mode Bridge** | `staff-shift-assignment-sync.ts` ↔ `employment_assignments` |
| **Notifications** | `shift-assignment-notify.ts` — assignment, update, cancel, response |
| **Conflict Detection** | Basic time-overlap detection in `use-scheduling-data.ts` |
| **Permissions** | RBAC via `hasEntityPermission` (Venue/Event entity checks) |

---

## 2. What Is Working

### ✅ Functional Systems
1. **Shift CRUD** — Create, read, update, delete shifts via REST APIs with Zod validation
2. **Shift-to-Work-Mode Sync** — Creating/updating a shift auto-creates an `employment_assignment` record so workers see it in their Work Mode dashboard
3. **Worker Accept/Decline** — Workers can respond to shift assignments; status mirrors back to `staff_shifts`
4. **Basic AuthZ** — API routes check `hasEntityPermission` for venue/event ownership
5. **Admin Week Grid** — Visual week view showing staff rows × day columns with shift cards
6. **Copy Week** — Duplicate all shifts in a week to the next week
7. **Conflict Detection** — Overlapping shift detection for same staff on same day
8. **Notifications** — Workers receive notifications on assignment, update, cancellation; admins receive notifications on worker response
9. **Demo Mode** — Rich demo data (`scheduling-data.ts`) for preview/testing without live data
10. **Audit Logging** — `hiring_audit_events` tracks shift assignment creation/updates/cancellations

---

## 3. What Is Partially Implemented

| Feature | Status | Evidence |
|---------|--------|----------|
| **Admin Scheduling UI** | UI-only, basic | `StaffSchedulingTab` has week grid + add dialog, but no edit, no bulk, no publish workflow, no templates |
| **Venue Scheduling Page** | Shell with likely placeholder components | `ShiftCalendar`, `ShiftManagement`, `ShiftTemplates`, `ShiftRequests`, `ShiftAnalytics` imported but not audited for completeness |
| **Zone Support** | Backend exists, UI minimal | `staff_zones` table, `/api/admin/staffing/zones`, zone dropdown in add shift form |
| **Event Linking** | Optional/fragile | `event_id` is optional; shifts can exist without event context |
| **Shift Publishing** | API exists, UI minimal | `/api/admin/staffing/shifts/publish` exists but `publishShifts` in hook may not be fully wired to UI |
| **Open Shifts** | Derived in data layer, not actionable | `deriveOpenShifts` computes coverage gaps but no self-signup UI |
| **Staff Roster Resolution** | Multiple fallback paths | Tries `/api/hiring/roster`, falls back to `/api/admin/staff` — inconsistent data shape handling |
| **Availability** | Stub in live mode | `deriveLiveAvailability` only shows "scheduled" vs "unavailable" — no persisted availability windows |
| **Shift Templates** | Demo fixtures only | `DEMO_SHIFT_TEMPLATES` exists; `LIVE_SHIFT_TEMPLATES` is empty |
| **Department Scheduling** | Type exists, no UI | `Department` type defined, no department-level views |

---

## 4. What Is Broken

### 🔴 Critical Issues

#### Finding: Venue Scheduling Components Are Unverified
**Severity:** High
**Evidence:** `app/venue/staff/scheduling/page.tsx` imports `ShiftCalendar`, `ShiftManagement`, `ShiftTemplates`, `ShiftRequests`, `ShiftAnalytics` — these components were not found in the repository search. They may be stubs, missing, or located in unindexed paths.
**Impact:** Venue administrators may see a shell page with non-functional or missing content.

#### Finding: Admin Scheduling UI Lacks Edit Capability
**Severity:** High
**Evidence:** `live-scheduling-panel.tsx` has add dialog and delete button, but no edit shift dialog. Administrators cannot modify an existing shift's time, role, or assigned staff without deleting and recreating.
**Impact:** Basic scheduling workflow is incomplete — administrators cannot correct mistakes.

#### Finding: No Publish Validation Workflow
**Severity:** High
**Evidence:** The `publishShifts` API and hook function exist, but there is no publish review UI (confirmation of changes, conflict check, affected worker preview). The `PUBLISH_CHANGES` and `PUBLISH_CHECKLIST` demo data exists but is not connected to live mode.
**Impact:** Administrators may publish schedules with unresolved conflicts or missing information.

### 🟡 Medium Issues

#### Finding: Dual API Patterns for Same Entity
**Severity:** Medium
**Evidence:** Both `/api/admin/staffing/shifts` and `/api/venue/shifts` exist with different auth patterns (hiring actor vs venue context), different response shapes (`{data}` vs `{success, data}`), and different field handling (`venue_id` vs `adhoc_venue_id`).
**Impact:** Confusion for developers, potential data inconsistencies, maintenance burden.

#### Finding: Venue Shift API Uses `adhoc_venue_id` Workaround
**Severity:** Medium
**Evidence:** `app/api/venue/shifts/route.ts` inserts with `venue_id: null, adhoc_venue_id: mappedVenue.venuesV2Id`. This suggests a legacy migration issue where venue IDs don't align between systems.
**Impact:** Shifts created via venue API may not appear in admin queries that filter by `venue_id`.

#### Finding: `staff_shifts` Table Missing Worker Response Status
**Severity:** Medium
**Evidence:** The shift status enum is `scheduled | confirmed | completed | cancelled`. There is no `pending_worker_response` or `declined_by_worker` status. Worker declines map to `cancelled`, which conflates cancellation reasons.
**Impact:** Administrators cannot distinguish between a manager-cancelled shift and a worker-declined shift.

---

## 5. What Is Missing

### Required for Production Foundation (Phase 1)
- [ ] **Shift Edit UI** — Edit existing shifts (time, role, staff, notes)
- [ ] **Publish Workflow** — Review changes, validate conflicts, preview affected workers, confirm publish
- [ ] **Worker Schedule View** — Mobile-friendly view of assigned shifts with details
- [ ] **Shift Detail Sheet** — Full shift info: location, supervisor, dress code, credentials, parking
- [ ] **Schedule Status Clarity** — Draft vs Published state distinction in UI

### Required for Workforce Coordination (Phase 2)
- [ ] **Worker Availability** — Persisted availability windows, exceptions
- [ ] **Time-Off Requests** — Request, approval, impact on scheduling
- [ ] **Open Shifts / Self-Signup** — Workers can claim unassigned shifts
- [ ] **Shift Swap Request** — Worker-initiated swap with manager approval
- [ ] **Conflict Detection Enhancements** — Rest-period warnings, overtime warnings, travel-time warnings
- [ ] **Bulk Operations** — Bulk create, assign, publish, cancel
- [ ] **Department/Zone Views** — Group shifts by department or zone

### Required for Attendance & Operations (Phase 3)
- [ ] **Check-In/Clock-In** — Worker arrival confirmation
- [ ] **Clock-Out** — Shift completion tracking
- [ ] **Late Arrival Tracking** — Auto-flag late check-ins
- [ ] **No-Show Tracking** — Mark absent, trigger replacement workflow
- [ ] **Break Tracking** — Record break times
- [ ] **Attendance Review** — Admin review of check-in/out history

### Advanced (Phase 4)
- [ ] **Recurring Shifts** — Weekly/monthly recurrence
- [ ] **Shift Templates (Live)** — Org-owned reusable templates
- [ ] **Cost Forecasting** — Labor cost based on scheduled hours × rates
- [ ] **Schedule Export** — PDF/printable schedules
- [ ] **Calendar Sync** — iCal/Google Calendar export
- [ ] **Schedule Version History** — Track changes over time

---

## 6. Highest-Risk Findings

1. **Venue scheduling components may be non-functional stubs** — Risk of 500 errors or empty content
2. **No edit capability in admin scheduling** — Forces delete+recreate workflow, error-prone
3. **Worker decline conflated with cancellation** — Data integrity risk for attendance tracking
4. **Dual API patterns with different auth models** — Security inconsistency risk
5. **Demo data mixed with live mode** — `scheduling-data.ts` contains 900+ lines of demo fixtures that could leak into production if imported incorrectly

---

## 7. Recommended Information Architecture

### Admin/Organization Scheduling
```
/admin/dashboard/staff?tab=scheduling
├── Schedule (week grid — current default)
├── Open Shifts (coverage gaps + self-signup)
├── Conflicts (double-bookings, availability clashes)
├── Availability (staff availability matrix)
├── Time Off (requests + calendar)
├── Templates (org-owned shift templates)
└── Settings (departments, zones, roles)
```

### Venue Scheduling
```
/venue/staff/scheduling
├── Calendar (month/week/day views)
├── Shifts (list view + filters)
├── Templates (venue-specific templates)
├── Requests (swaps, drops, pickups)
└── Analytics (coverage, hours, costs)
```

### Worker Experience
```
/work-mode (or /dashboard)
├── My Shifts (upcoming + past)
├── Open Shifts (claimable shifts)
├── Schedule (calendar view)
├── Requests (my swap/drop requests)
└── Notifications (shift updates)
```

---

## 8. Proposed Implementation Phases

### Phase 0 — Critical Repairs (Immediate)
- Verify/fix venue scheduling component stubs
- Add shift edit capability to admin UI
- Separate worker-decline from cancellation status
- Unify API response shapes where safe

### Phase 1 — Production Scheduling Foundation (2–3 weeks)
- Complete admin scheduling UI (edit, duplicate, bulk delete)
- Implement publish workflow with validation
- Build worker schedule view (mobile-first)
- Add shift detail sheet with full context
- Add draft/published state indicator
- Write integration tests for core flows

### Phase 2 — Workforce Coordination (3–4 weeks)
- Worker availability system (DB + UI)
- Time-off request system
- Open shifts + self-signup
- Shift swap request workflow
- Enhanced conflict detection
- Bulk operations
- Department/zone grouping

### Phase 3 — Attendance & Operations (3–4 weeks)
- Check-in/clock-in system
- Clock-out + shift completion
- Late/no-show tracking
- Break tracking
- Attendance review dashboard
- Replacement suggestion workflow

### Phase 4 — Advanced Scheduling (4+ weeks)
- Recurring shifts
- Live shift templates
- Cost forecasting
- Schedule export
- Calendar sync
- Version history

---

## 9. First Implementation Task

**Task:** Add shift edit capability to the admin `StaffSchedulingTab` component.

**Why:** This is the most critical gap preventing basic scheduling operations. Administrators cannot correct mistakes without deleting and recreating shifts.

**Scope:**
1. Reuse existing `scheduling-edit-shift-sheet.tsx` component (already exists in repo)
2. Wire edit button to shift cards in week grid
3. Call existing `updateShift` from `useScheduling-data.ts`
4. Ensure notifications fire on update
5. Add basic validation (no overlapping shifts)

**Files to modify:**
- `components/admin/scheduling/live-scheduling-panel.tsx` (add edit trigger)
- `components/admin/scheduling/scheduling-edit-shift-sheet.tsx` (verify completeness)

---

## 10. Blockers Requiring External Input

1. **Venue scheduling component location** — `ShiftCalendar`, `ShiftManagement`, etc. are imported in `app/venue/staff/scheduling/page.tsx` but were not found in standard component directories. Need to locate or confirm they are stubs.
2. **`adhoc_venue_id` vs `venue_id` migration status** — Need confirmation on whether the venue ID alignment issue is being resolved elsewhere.
3. **Mobile app integration** — The `apps/mobile` directory exists. Need to know if shift notifications and worker views need mobile-specific implementation or if responsive web is sufficient.
4. **Payroll integration scope** — `payroll-export-panel.tsx` exists. Need to know expected payroll data export format and timing.

---

*This summary is based on a read-only codebase audit per Rule 1. No code was modified during this audit.*
