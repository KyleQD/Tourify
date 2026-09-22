# Tourify Scheduling & Shifts — Feature Gap Analysis

**Date:** 2026-08-03
**Status:** Read-Only Audit

---

## Classification Key

- **P0 — Required for initial production readiness**
- **P1 — Required for a later phase**
- **P2 — Optional enhancement**
- **P3 — Not appropriate for Tourify**

---

## P0 — Production Foundation (Phase 1)

| # | Capability | Current Status | Gap | Evidence |
|---|-----------|---------------|-----|----------|
| 1 | **Shift Edit UI** | Missing | Admin can add/delete but cannot edit existing shifts | `live-scheduling-panel.tsx` has no edit trigger; `scheduling-edit-shift-sheet.tsx` exists but unwired |
| 2 | **Shift Detail View** | Partial | Shift cards show time only; no detail sheet on click | No click handler on shift cards in week grid |
| 3 | **Publish Workflow** | Partial | API exists, no UI review step | `publishShifts` in hook; `PUBLISH_CHANGES` demo data; no live publish modal wired |
| 4 | **Draft vs Published State** | Partial | Status field exists, no UI indicator for draft state | `status` is `scheduled` by default; no "draft" concept in DB |
| 5 | **Worker Schedule View** | Partial | Work Mode shows assignments, may lack shift detail context | `/work-mode` exists but not audited for completeness |
| 6 | **Duplicate Shift** | Missing | No single-shift duplicate | Only "Copy Week" exists (bulk) |
| 7 | **Mobile-Responsive Admin UI** | Unknown | Not verified | `live-scheduling-panel.tsx` uses grid layout; tablet/mobile behavior unknown |
| 8 | **Notification on Schedule Change** | Working | Notifications sent on update | Verified in `staff-shift-assignment-sync.ts` |
| 9 | **Basic Conflict Detection** | Working | Overlap detection client-side | `checkConflict()` in `live-scheduling-panel.tsx` |
| 10 | **Empty States** | Partial | "No shifts" message exists | `WorkforceEmptyState` used for missing venue |
| 11 | **Loading States** | Working | Spinner during fetch | `RefreshCw` spinner in week grid |
| 12 | **Error States** | Partial | Toast errors on API failure | `toast.error()` used; no dedicated error UI |

---

## P1 — Workforce Coordination (Phase 2)

| # | Capability | Current Status | Gap | Classification |
|---|-----------|---------------|-----|----------------|
| 13 | **Worker Availability** | Missing | No persisted availability; `deriveLiveAvailability` is stub | P1 |
| 14 | **Availability Exceptions** | Missing | No table, no UI | P1 |
| 15 | **Time-Off Requests** | Missing | No table, no UI | P1 |
| 16 | **Shift Templates (Live)** | Missing | `LIVE_SHIFT_TEMPLATES` is empty array | P1 |
| 17 | **Recurring Shifts** | Missing | No `recurring_group_id`, no UI | P1 |
| 18 | **Shift Duplication (Single)** | Missing | Only "Copy Week" bulk exists | P0 (edit UI could include duplicate) |
| 19 | **Bulk Shift Creation** | Missing | One-by-one only | P1 |
| 20 | **Bulk Assignment** | Missing | `assignStaff` exists in hook but UI unverified | P1 |
| 21 | **Department Scheduling** | Partial | Department type exists, no grouping UI | P1 |
| 22 | **Zone Scheduling** | Partial | Zones backend exists, minimal UI usage | P1 |
| 23 | **Crew Lead Assignment** | Missing | No formal "lead" flag on shift | P1 |
| 24 | **Required Skills** | Partial | Type field exists, no validation | P1 |
| 25 | **Required Certifications** | Missing | No credential validation before assignment | P1 |
| 26 | **Drag-and-Drop Scheduling** | Missing | No dnd implementation | P2 |
| 27 | **Schedule Drafts** | Partial | No formal draft state in DB | P1 |
| 28 | **Publish Validation** | Missing | No pre-publish checklist against live data | P1 |
| 29 | **Enhanced Conflict Detection** | Partial | Only time overlap; no rest-period, overtime, travel checks | P1 |
| 30 | **Double-Booking Warnings** | Working | Basic overlap detection | P0 |
| 31 | **Overlapping Shift Warnings** | Working | Same as above | P0 |
| 32 | **Rest-Period Warnings** | Missing | No rest-period logic | P1 |
| 33 | **Overtime Warnings** | Missing | No hourly accumulation tracking | P1 |
| 34 | **Travel-Time Warnings** | Missing | No venue distance or travel logic | P2 |
| 35 | **Venue-Distance Warnings** | Missing | No geolocation logic | P2 |
| 36 | **Budget Warnings** | Missing | No labor cost calculation | P2 |
| 37 | **Open Shifts** | Partial | Derived in data layer, no self-signup UI | P1 |
| 38 | **Worker Self-Signup** | Missing | No claim flow | P1 |
| 39 | **Shift Swaps** | Partial | API routes exist (`/api/venue/shifts/swaps`), UI unverified | P1 |
| 40 | **Call-Outs** | Missing | No call-out workflow | P1 |
| 41 | **Replacement Suggestions** | Partial | `suggestedReplacements` in conflict type but not actionable | P1 |
| 42 | **Waitlists** | Missing | No waitlist table or logic | P2 |

---

## P1 — Attendance & Operations (Phase 3)

| # | Capability | Current Status | Gap |
|---|-----------|---------------|-----|
| 43 | **Check-In** | Missing | No check-in UI, API, or DB fields |
| 44 | **Clock-In / Clock-Out** | Missing | No time-tracking fields |
| 45 | **Late Arrival Tracking** | Missing | No timestamp comparison logic |
| 46 | **No-Show Tracking** | Missing | No `no_show` status |
| 47 | **Break Tracking** | Partial | `break_duration` field exists, no break check-in/out |
| 48 | **Supervisor Notes** | Missing | No post-shift notes field |
| 49 | **Worker Notes** | Missing | No worker feedback field |
| 50 | **Schedule Version History** | Missing | No history table |
| 51 | **Audit Logs** | Partial | `hiring_audit_events` tracks changes, not comprehensive |
| 52 | **Exports** | Missing | No export API |
| 53 | **Printable Schedules** | Missing | No print view |
| 54 | **Calendar Sync (iCal)** | Missing | No calendar feed generation |
| 55 | **Mobile Quick Actions** | Missing | No mobile-optimized action sheet |

---

## P2 — Advanced Scheduling (Phase 4)

| # | Capability | Current Status | Notes |
|---|-----------|---------------|-------|
| 56 | **Cost Forecasting** | Missing | Would need hourly rates on staff_members |
| 57 | **Schedule History / Undo** | Missing | Would need versioned shifts table |
| 58 | **Shift Ratings** | Missing | Post-shift worker/manager ratings |
| 59 | **Auto-Assign by Availability** | Missing | AI-assisted (see Phase 5) |
| 60 | **Shift Bidding** | Missing | Workers bid on open shifts |
| 61 | **Cross-Venue Scheduling** | Missing | Multi-venue org scheduling |
| 62 | **Real-Time Subscriptions** | Missing | Supabase realtime for live schedule updates |
| 63 | **Offline Support** | Missing | PWA / local caching for mobile |
| 64 | **SMS Notifications** | Unknown | Email in-app notifications exist; SMS unverified |

---

## P3 — Not Appropriate for Tourify

| # | Capability | Reason |
|---|-----------|--------|
| 65 | **Biometric Check-In** | Overkill for live events; QR/GPS sufficient |
| 66 | **Union Scheduling Rules** | Too domain-specific; generic rules sufficient |
| 67 | **Government Compliance Reporting** | Out of scope; payroll integration handles this |
| 68 | **AI-Generated Schedules (Phase 5)** | See separate AI opportunities doc |

---

## Gap Severity Summary

| Category | P0 (Critical) | P1 (Required) | P2 (Enhancement) | P3 (Out of Scope) |
|----------|:-------------:|:-------------:|:----------------:|:-----------------:|
| UI/UX | 4 | 12 | 4 | 0 |
| Data Model | 1 | 8 | 3 | 0 |
| API | 1 | 6 | 2 | 0 |
| Worker Experience | 2 | 8 | 3 | 0 |
| Operations | 0 | 11 | 4 | 0 |
| Integrations | 0 | 3 | 4 | 0 |
| **TOTAL** | **8** | **48** | **20** | **4** |

---

*Feature gaps classified by professional live-event workforce scheduling standards and Tourify's existing architecture.*
