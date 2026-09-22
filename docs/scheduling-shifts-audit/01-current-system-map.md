# Tourify Scheduling & Shifts — Current System Map

**Date:** 2026-08-03
**Status:** Read-Only Audit

---

## 1. Entity Relationship Diagram (Conceptual)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Organization  │────▶│   staff_shifts   │◀────│   staff_members │
│   (org_id)      │     ├──────────────────┤     │   (assignee)    │
└─────────────────┘     │ id               │     └─────────────────┘
                        │ venue_id         │              │
┌─────────────────┐     │ org_id           │              │
│     Venue       │────▶│ event_id         │              ▼
│  (venue_id)     │     │ staff_member_id  │     ┌─────────────────┐
└─────────────────┘     │ shift_date       │     │  employment_    │
                        │ start_time       │────▶│  assignments    │
┌─────────────────┐     │ end_time         │     │  (Work Mode)    │
│     Event       │────▶│ role_assignment  │     └─────────────────┘
│  (event_id)     │     │ zone_assignment  │              │
└─────────────────┘     │ status           │              ▼
                        │ notes            │     ┌─────────────────┐
                        │ created_by       │     │     User        │
                        └──────────────────┘     │  (worker)       │
                                                 └─────────────────┘
```

---

## 2. System Connection Classification

| Connected System | Connection Point | Status | Notes |
|-----------------|-----------------|--------|-------|
| **Organizations** | `staff_shifts.org_id`, `staff_members.org_id` | Partially implemented | Org-scoped shifts work but UI defaults to venue context |
| **Admin Accounts** | `/admin/dashboard/staff?tab=scheduling` | Partially implemented | Basic week grid works; missing edit, publish, templates |
| **Venue Accounts** | `/venue/staff/scheduling` | Partially implemented | Page shell exists; child components unverified |
| **Artists** | `staff_shifts.event_id` → events → artists | Disconnected | No artist-specific scheduling surfaced |
| **Venues** | `staff_shifts.venue_id` | Fully implemented | Venue context resolved in middleware + API |
| **Tours** | `staff_shifts.event_id` → events → tours | Backend-only | Tour-level scheduling views missing |
| **Events** | `staff_shifts.event_id` | Partially implemented | Optional linking; event context not always enforced |
| **Jobs** | `staff_members` ← hiring roster | Partially implemented | Roster resolved via `/api/hiring/roster` with fallbacks |
| **Job Applications** | `employment_assignments` | Disconnected | No link from applicant → scheduled worker |
| **Hiring** | `/api/hiring/roster` | Partially implemented | Hiring entity resolution works but has fallback paths |
| **Onboarding** | `staff_members.compliance_status` | Backend-only | Onboarding status not visible in scheduling UI |
| **Staff Rosters** | `staff_members` + `/api/hiring/roster` | Partially implemented | Multiple data shapes handled with normalization |
| **Departments** | `staff_members.department`, `zone_assignment` | UI-only | Department type exists, no department-level views |
| **Roles** | `staff_members.position`, `role_assignment` | Partially implemented | Role strings used, no formal role taxonomy |
| **Zones** | `staff_zones` table + `/api/admin/staffing/zones` | Partially implemented | Backend exists, minimal UI usage |
| **Credentials** | `staff_members` → compliance_status | Missing | No credential validation before assignment |
| **Documents** | — | Missing | No document attachment to shifts |
| **Contracts** | `employment_assignments` | Partially implemented | Assignment record acts as contract bridge |
| **Calendar** | `staff_shifts` dates | Partially implemented | Week grid only; no month/day views |
| **Notifications** | `shift-assignment-notify.ts` | Fully implemented | Assignment, update, cancel, response notifications |
| **Messaging** | — | Missing | No shift-threaded messaging |
| **Tasks** | — | Missing | No shift-related task system |
| **Logistics** | — | Missing | No transport/hotel/parking info on shifts |
| **Transportation** | — | Missing | — |
| **Hotels** | — | Missing | — |
| **Flights** | — | Missing | — |
| **Payroll** | `payroll-export-panel.tsx` | UI-only | Panel exists but function unverified |
| **Check-in** | — | Missing | No check-in system |
| **Attendance** | `staff_shifts.status = completed` | Backend-only | Status field exists, no check-in workflow |
| **Analytics** | `ShiftAnalytics` component | UI-only | Component imported but unverified |

---

## 3. Source of Truth by Entity

| Entity | Source of Truth | Table(s) |
|--------|----------------|----------|
| Shift | `staff_shifts` | `staff_shifts` |
| Shift Assignment (Worker View) | `employment_assignments` | `employment_assignments` (mirrors `staff_shifts`) |
| Worker Identity | `staff_members` | `staff_members` |
| Worker User Account | `profiles` / auth.users | `profiles`, `auth.users` |
| Employer Context | Hiring entity resolver | `resolveAdminWorkforceEmployer()` |
| Venue | `venue_profiles` / `venues` v2 | `venue_profiles`, `venues` |
| Event | `events` | `events` |
| Zone | `staff_zones` | `staff_zones` |
| Availability | **None (live)** | Demo fixtures only |
| Time Off | **None** | Not implemented |
| Attendance | **None** | `staff_shifts.status` only |

---

## 4. Data Flow: Admin Creates Shift

```
Admin UI (live-scheduling-panel.tsx)
    │
    ▼
POST /api/admin/staffing/shifts
    │
    ├──► Zod validation (createSchema)
    ├──► Auth check (resolveHiringActorFromRequest OR hasEntityPermission)
    ├──► Parent validation (validateWorkforceAssignmentParents)
    ├──► INSERT staff_shifts
    │
    ▼
upsertShiftLinkedAssignment()
    │
    ├──► INSERT/UPDATE employment_assignments
    ├──► Send notification (if notify=true)
    ├──► Log audit event (hiring_audit_events)
    │
    ▼
Worker sees shift in Work Mode (/work-mode or /dashboard)
    │
    ▼
Worker accepts/declines → employment_assignments.status updated
    │
    ▼
Status mirrors back to staff_shifts via respondToShiftAssignment()
```

---

## 5. Data Flow: Venue Admin Creates Shift

```
Venue UI (/venue/staff/scheduling)
    │
    ▼
POST /api/venue/shifts
    │
    ├──► authenticateApiRequest()
    ├──► canManageVenue(manage_team)
    ├──► ensureVenueOperationalContext()
    ├──► INSERT staff_shifts (venue_id: null, adhoc_venue_id: venuesV2Id)
    │
    ▼
No automatic Work Mode sync in this API
    │
    ▼
Shift appears in venue queries filtering by adhoc_venue_id
```

**⚠️ Gap:** The venue API does NOT call `syncEmploymentAssignmentForShift()`. Shifts created via venue API may not appear in worker Work Mode dashboards.

---

## 6. Routing & Entry Points

| Route | Purpose | Status |
|-------|---------|--------|
| `/admin/dashboard/staff?tab=scheduling` | Organization-level scheduling | Working (basic) |
| `/venue/staff/scheduling` | Venue-level scheduling | Shell only (components unverified) |
| `/api/admin/staffing/shifts` | Admin shift CRUD | Working |
| `/api/admin/staffing/shifts/[id]` | Admin shift patch/delete | Working |
| `/api/admin/staffing/shifts/publish` | Publish shifts | API exists, UI minimal |
| `/api/admin/staffing/zones` | Zone CRUD | Working |
| `/api/venue/shifts` | Venue shift CRUD | Working (different auth) |
| `/api/venue/shifts/[id]` | Venue shift detail | Working |
| `/api/venue/shifts/assignments` | Venue assignments | Unverified |
| `/api/venue/shifts/swaps` | Shift swaps | Unverified |
| `/api/venue/shifts/requests` | Shift requests | Unverified |
| `/api/work-mode/assignments` | Worker sees assignments | Working (separate system) |
| `/api/work-mode/assignments/[id]/respond` | Worker accept/decline | Working |

---

## 7. Component Inventory

### Admin Scheduling Components (`components/admin/scheduling/`)

| Component | Purpose | Status |
|-----------|---------|--------|
| `live-scheduling-panel.tsx` | Main week grid + add shift | Working |
| `use-scheduling-data.ts` | Data hook (live + demo) | Working |
| `scheduling-data.ts` | Demo fixtures + types | Working (demo) |
| `scheduling-context.tsx` | React context | Unverified |
| `scheduling-shift-card.tsx` | Shift card display | Unverified |
| `scheduling-shift-details-sheet.tsx` | Shift detail panel | Unverified |
| `scheduling-edit-shift-sheet.tsx` | Edit shift form | **Exists but unwired** |
| `scheduling-assign-staff-sheet.tsx` | Assign staff to shift | Unverified |
| `scheduling-staff-picker.tsx` | Staff selection | Unverified |
| `scheduling-staff-panel.tsx` | Staff list panel | Unverified |
| `scheduling-week-grid.tsx` | Week grid view | Unverified (live-scheduling-panel has inline grid) |
| `scheduling-filter-bar.tsx` | Filters | Unverified |
| `scheduling-conflicts.tsx` | Conflict display | Unverified |
| `scheduling-open-shifts.tsx` | Open shifts list | Unverified |
| `scheduling-publish-modal.tsx` | Publish confirmation | Unverified |
| `scheduling-resolve-conflict-sheet.tsx` | Conflict resolution | Unverified |
| `scheduling-create-template-sheet.tsx` | Template creation | Unverified |
| `scheduling-overview-cards.tsx` | Stats cards | Unverified |
| `views/create-view.tsx` | Create view | Unverified |
| `views/open-shifts-view.tsx` | Open shifts view | Unverified |
| `views/templates-view.tsx` | Templates view | Unverified |

### Venue Scheduling Components (`components/venue/staff/`)

| Component | Purpose | Status |
|-----------|---------|--------|
| `venue-staff-shifts-panel.tsx` | Staff shifts panel | Unverified |
| `shift-calendar` | Calendar view | **Imported but not found** |
| `shift-management` | Shift management | **Imported but not found** |
| `shift-templates` | Templates | **Imported but not found** |
| `shift-analytics` | Analytics | **Imported but not found** |
| `shift-requests` | Requests | **Imported but not found** |
| `staff-scheduler.tsx` | Staff scheduler | Unverified |

### Workforce Components (`components/admin/workforce/`)

| Component | Purpose | Status |
|-----------|---------|--------|
| `scheduling-conflicts-panel.tsx` | Conflict panel | Unverified |
| `attendance-correction-panel.tsx` | Attendance corrections | Unverified |
| `hiring-roster-handoff-panel.tsx` | Roster handoff | Unverified |
| `payroll-export-panel.tsx` | Payroll export | Unverified |
| `workforce-slo-banner.tsx` | SLO banner | Unverified |

---

## 8. Database Tables Relevant to Scheduling

| Table | Purpose | Scheduling Relevance |
|-------|---------|---------------------|
| `staff_shifts` | Core shift storage | **Primary** |
| `staff_members` | Staff roster | Worker identity, role, department |
| `staff_zones` | Zone definitions | Shift zone assignment |
| `employment_assignments` | Work Mode bridge | Worker-visible assignments |
| `hiring_audit_events` | Audit log | Shift change tracking |
| `events` | Event data | Shift event context |
| `tours` | Tour data | Multi-event scheduling context |
| `venue_profiles` | Venue data | Shift venue context |
| `profiles` | User profiles | Worker display names |
| `accounts` | Polymorphic accounts | Employer resolution |
| `account_relationships` | Ownership links | Employer scope |
| `organizations` | Organizations | Org-level scheduling scope |
| `organization_members` | Memberships | Admin access |
| `job_postings` | Job postings | Hiring → scheduling pipeline |
| `job_applications` | Applications | Candidate → worker pipeline |

---

*System map compiled from read-only audit of codebase. Connections classified by evidence, not assumption.*
