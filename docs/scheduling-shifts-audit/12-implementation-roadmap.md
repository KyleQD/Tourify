# Tourify Scheduling & Shifts — Implementation Roadmap

**Date:** 2026-08-03
**Status:** Audit Complete — Roadmap Ready

---

## Phase 0 — Critical Repairs (Week 1)

### Objective
Fix broken routing, missing edit capability, and data integrity issues before building new features.

### Tasks

#### P0-1: Wire Shift Edit in Admin UI
- **File:** `components/admin/scheduling/live-scheduling-panel.tsx`
- **Change:** Add edit button to shift cards; wire to `scheduling-edit-shift-sheet.tsx`
- **Reuse:** `updateShift` from `use-scheduling-data.ts`
- **Validation:** Prevent overlaps on edit
- **Acceptance:** Admin can click a shift → edit time/role/staff/notes → save → see updated shift

#### P0-2: Verify Venue Scheduling Components Exist
- **File:** `app/venue/staff/scheduling/page.tsx`
- **Action:** Locate `ShiftCalendar`, `ShiftManagement`, `ShiftTemplates`, `ShiftRequests`, `ShiftAnalytics`
- **If missing:** Create stub components with "Coming Soon" or integrate admin components
- **Acceptance:** Venue scheduling page loads without 500 errors

#### P0-3: Add `deleted_at` Soft Delete to `staff_shifts`
- **Migration:** Add `deleted_at` column, update all queries to filter `.is("deleted_at", null)`
- **Files:** `app/api/admin/staffing/shifts/route.ts`, `app/api/venue/shifts/route.ts`, `app/api/admin/staffing/shifts/[id]/route.ts`
- **Acceptance:** Deleted shifts are excluded from all queries; can be restored if needed

#### P0-4: Separate Worker Decline from Cancellation
- **Migration:** Add `declined` to `employment_assignments.status` enum
- **Files:** `lib/admin/workforce-assignment-status.ts`, `lib/services/staff-shift-assignment-sync.ts`
- **Acceptance:** Worker decline shows as "Declined" not "Cancelled"; admin can see reason

#### P0-5: Unify API Response Shapes (Safe Only)
- **Files:** `app/api/venue/shifts/route.ts`
- **Change:** Wrap responses in `{ data }` shape (not `{ success, data }`) to match admin API
- **Caution:** Check all consumers of venue shifts API first
- **Acceptance:** Venue API returns same shape as admin API

---

## Phase 1 — Production Scheduling Foundation (Weeks 2–4)

### Objective
Complete the minimum reliable system for creating shifts, assigning workers, publishing, and worker viewing.

### Tasks

#### P1-1: Shift Detail Sheet
- **File:** `components/admin/scheduling/scheduling-shift-details-sheet.tsx`
- **Features:** Full shift info (event, venue, time, role, zone, notes, assigned worker, status history)
- **Mobile:** Bottom sheet on mobile, side panel on desktop
- **Acceptance:** Clicking any shift card opens detail sheet with complete information

#### P1-2: Publish Workflow
- **Files:** `components/admin/scheduling/scheduling-publish-modal.tsx`, `use-scheduling-data.ts`
- **Features:**
  - Review all changes since last publish
  - Conflict check preview
  - List of affected workers
  - Confirm before publish
  - Send notifications on publish
- **Acceptance:** Admin clicks "Publish" → sees review modal → confirms → workers notified

#### P1-3: Worker Schedule View
- **Files:** New `app/work-mode/shifts/page.tsx` or enhance existing
- **Features:**
  - List of upcoming shifts
  - Shift detail on tap
  - Accept/decline buttons
  - Status indicators (confirmed, pending, cancelled)
- **Mobile-first:** Optimized for phone screens
- **Acceptance:** Worker can view all assigned shifts and take action

#### P1-4: Duplicate Single Shift
- **File:** `components/admin/scheduling/live-scheduling-panel.tsx`
- **Change:** Add "Duplicate" action to shift card context menu
- **Acceptance:** Admin duplicates shift → new shift created with same details, different date

#### P1-5: Enhanced Error & Empty States
- **Files:** All scheduling components
- **Features:**
  - Dedicated error boundary for scheduling
  - Retry on network failure
  - Empty state illustrations
  - Permission denied state
- **Acceptance:** All async operations have loading, empty, error, success states

#### P1-6: Integration Tests
- **Files:** `__tests__/hiring/scheduling-core-flow.test.ts`
- **Scenarios:**
  - Admin creates shift → worker sees it → worker accepts
  - Admin edits shift → worker receives update
  - Admin publishes schedule → workers notified
  - Unauthorized user cannot access another org's shifts
- **Acceptance:** All tests pass

---

## Phase 2 — Workforce Coordination (Weeks 5–8)

### Objective
Add availability, time off, conflict detection, open shifts, and communications.

### Tasks

#### P2-1: Worker Availability System
- **Migration:** `staff_availability` table (see `06-data-api-audit.md`)
- **Files:**
  - `app/api/admin/staffing/availability/route.ts`
  - `components/admin/scheduling/availability-view.tsx`
  - New worker availability settings page
- **Features:**
  - Set weekly availability (day + time ranges)
  - Mark exceptions (dates unavailable)
  - Visual availability matrix
- **Acceptance:** Admin sees staff availability when scheduling; conflicts flagged

#### P2-2: Time-Off Request System
- **Migration:** `staff_time_off_requests` table
- **Files:**
  - `app/api/admin/staffing/time-off/route.ts`
  - Worker request UI
  - Admin approval UI
- **Features:**
  - Worker submits request (vacation, sick, personal)
  - Admin approves/denies with reason
  - Approved time-off blocks scheduling
- **Acceptance:** Worker can request time off; admin sees it in scheduling context

#### P2-3: Open Shifts + Self-Signup
- **Files:**
  - `components/admin/scheduling/open-shifts-view.tsx`
  - Worker claim UI
- **Features:**
  - Admin marks shift as "open" (no assigned worker)
  - Workers see open shifts and can claim
  - Admin approves claim
- **Acceptance:** Worker can claim open shift; admin sees claim request

#### P2-4: Shift Swap Requests
- **Files:**
  - `app/api/venue/shifts/swaps/route.ts` (verify existing)
  - Worker swap request UI
  - Admin swap approval UI
- **Features:**
  - Worker requests swap with specific colleague or open pool
  - Admin approves/rejects
  - Notifications to all parties
- **Acceptance:** Full swap workflow works end-to-end

#### P2-5: Enhanced Conflict Detection
- **Files:** `lib/admin/workforce-conflict-detection.ts` (new)
- **Features:**
  - Rest-period warnings (< 8 hours between shifts)
  - Overtime warnings (> 40 hrs/week)
  - Time-off conflict detection
  - Availability conflict detection
- **Acceptance:** Conflicts surfaced in admin UI before publish

#### P2-6: Bulk Operations
- **Files:** `components/admin/scheduling/bulk-actions-bar.tsx`
- **Features:**
  - Multi-select shifts
  - Bulk delete
  - Bulk publish
  - Bulk assign worker
- **Acceptance:** Admin can select 5 shifts and publish all at once

#### P2-7: Department & Zone Views
- **Files:** `components/admin/scheduling/views/department-view.tsx`
- **Features:**
  - Group shifts by department
  - Group shifts by zone
  - Filter by department/zone
- **Acceptance:** Admin can view schedule organized by department

---

## Phase 3 — Attendance & Operations (Weeks 9–12)

### Objective
Add check-in, attendance tracking, and operational reporting.

### Tasks

#### P3-1: Check-In System
- **Migration:** Add check-in fields to `staff_shift_assignments` (or `staff_shifts`)
- **Files:**
  - `app/api/work-mode/check-in/route.ts`
  - Worker check-in UI (QR code or button)
- **Features:**
    - Worker taps "Check In" on shift
    - Records timestamp + optional GPS
    - Admin sees real-time check-ins
- **Acceptance:** Worker checks in; admin dashboard updates

#### P3-2: Clock-Out & Shift Completion
- **Files:** `app/api/work-mode/clock-out/route.ts`
- **Features:**
  - Worker clocks out
  - Calculates total hours
  - Status moves to "completed"
- **Acceptance:** Worker clocks out; hours recorded

#### P3-3: Late Arrival & No-Show Tracking
- **Files:** `lib/admin/attendance-tracking.ts`
- **Features:**
  - Auto-flag if check-in is after start_time + grace period
  - Admin can mark "no show"
  - Trigger replacement workflow
- **Acceptance:** Late/no-show visible in admin attendance panel

#### P3-4: Break Tracking
- **Files:** Worker break UI + admin view
- **Features:**
  - Worker starts/ends break
  - Break duration tracked against `break_duration`
  - Alerts if break exceeds allocated time
- **Acceptance:** Breaks tracked and visible in shift record

#### P3-5: Attendance Review Dashboard
- **Files:** `components/admin/workforce/attendance-dashboard.tsx`
- **Features:**
  - Event-level attendance summary
  - Individual worker attendance history
  - Export attendance data
- **Acceptance:** Admin can review attendance for any event

#### P3-6: Replacement Suggestion Workflow
- **Files:** `components/admin/workforce/replacement-panel.tsx`
- **Features:**
  - When worker calls out, suggest available replacements
  - Rank by availability, skills, credentials
  - One-click assign replacement
- **Acceptance:** Admin replaces worker in under 3 clicks

---

## Phase 4 — Advanced Scheduling (Weeks 13–16+)

### Objective
Add templates, recurring schedules, cost forecasting, exports, and calendar sync.

### Tasks

#### P4-1: Recurring Shifts
- **Migration:** `staff_shift_recurring_groups` table
- **Files:** `components/admin/scheduling/recurring-shift-form.tsx`
- **Features:**
  - Create weekly/biweekly/monthly recurring shifts
  - Edit single instance or entire series
  - End recurrence after N occurrences or date
- **Acceptance:** Admin creates recurring shift → instances generated

#### P4-2: Live Shift Templates
- **Migration:** Add org-owned templates table
- **Files:** `components/admin/scheduling/template-library.tsx`
- **Features:**
  - Save shift as template
  - Reuse template to create new shift
  - Org-scoped templates
- **Acceptance:** Admin saves template → can create shift from template

#### P4-3: Cost Forecasting
- **Files:** `lib/admin/labor-cost-calculator.ts`
- **Features:**
  - Calculate scheduled labor cost (hours × rate)
  - Overtime projection
  - Department-level cost breakdown
- **Acceptance:** Cost visible on schedule before publish

#### P4-4: Schedule Export
- **Files:** `app/api/admin/staffing/export/route.ts`
- **Features:**
  - Export to PDF (printable schedule)
  - Export to CSV (data analysis)
  - Export to iCal (calendar sync)
- **Acceptance:** Admin exports schedule in all 3 formats

#### P4-5: Realtime Updates
- **Files:** Supabase realtime subscription in `use-scheduling-data.ts`
- **Features:**
  - Live update when coworker edits schedule
  - No page refresh needed
- **Acceptance:** Two admins see each other's changes in real time

---

## Phase 5 — Intelligent Assistance (Future)

See `11-ai-opportunities.md` for detailed AI recommendations.

---

## Implementation Order Summary

```
Week 1  │ Phase 0: Critical Repairs
Week 2  │ Phase 1: Foundation (detail sheet, publish, worker view)
Week 3  │ Phase 1: Foundation (duplicate, error states, tests)
Week 4  │ Phase 1: Foundation (polish, bug fixes)
Week 5  │ Phase 2: Coordination (availability, time-off)
Week 6  │ Phase 2: Coordination (open shifts, swap requests)
Week 7  │ Phase 2: Coordination (conflict detection, bulk ops)
Week 8  │ Phase 2: Coordination (department views, polish)
Week 9  │ Phase 3: Attendance (check-in, clock-out)
Week 10 │ Phase 3: Attendance (late/no-show, breaks)
Week 11 │ Phase 3: Attendance (dashboard, replacements)
Week 12 │ Phase 3: Attendance (polish, tests)
Week 13+│ Phase 4: Advanced (recurring, templates, exports)
```

---

## Dependencies & Blockers

| Phase | Depends On | Blocker Risk |
|-------|-----------|-------------|
| Phase 0 | None | Low |
| Phase 1 | Phase 0 | Low |
| Phase 2 | Phase 1, `staff_availability` migration | Medium |
| Phase 3 | Phase 2, check-in DB fields | Medium |
| Phase 4 | Phase 3, recurring DB migration | Low |

---

*Roadmap designed to be additive, backward-compatible, and deliver incremental value at each phase.*
