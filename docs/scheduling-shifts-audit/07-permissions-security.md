# Tourify Scheduling & Shifts — Permissions & Security Audit

**Date:** 2026-08-03
**Status:** Read-Only Audit

---

## 1. Current Permission Model

### RBAC Implementation
Permissions are checked via `hasEntityPermission()` from `@/lib/services/rbac` with entity-specific grants:

| Permission | Used For | Entity Type |
|-----------|----------|-------------|
| `ASSIGN_EVENT_ROLES` | Create/edit/delete shifts | Venue, Event |
| `EDIT_EVENT_LOGISTICS` | Read shifts | Venue, Event |
| `manage_team` | Venue shift access | Venue |

### Auth Patterns by API

| API | Auth Pattern | Authorization Check |
|-----|-------------|---------------------|
| `/api/admin/staffing/shifts` | Hiring actor + RBAC fallback | `resolveHiringActorFromRequest` OR `hasEntityPermission` |
| `/api/admin/staffing/shifts/[id]` | Session + RBAC | `hasEntityPermission` on shift's venue/event |
| `/api/venue/shifts` | API auth + venue manage | `authenticateApiRequest` + `canManageVenue` |
| `/api/work-mode/assignments/[id]/respond` | Session + ownership | `eq(user_id, auth.uid())` |

---

## 2. Permission Matrix: Scheduling Actions

| Action | Org Owner | Org Admin | Staffing Manager | Dept Lead | Venue Admin | Worker | General User | Unauth |
|--------|:---------:|:---------:|:----------------:|:---------:|:-----------:|:------:|:------------:|:------:|
| View own shifts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View org schedule | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View venue schedule | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create shift | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Edit shift | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Delete shift | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Publish schedule | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Assign worker | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Reassign worker | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View worker contact | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View worker availability | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Accept/decline shift | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Request swap | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Call out | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Check in | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Record attendance | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View costs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View audit history | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend:** ✅ = Allowed, ❌ = Denied

---

## 3. Security Findings

### Finding: Venue API Lacks Hiring Actor Context
**Severity:** Medium
**Area:** API / Permissions
**Current Behavior:** `/api/venue/shifts` uses `authenticateApiRequest` + `canManageVenue` but does not integrate with the hiring actor / workforce employer resolution system.
**Expected Behavior:** Venue admins with workforce permissions should be able to create shifts that sync to Work Mode.
**Evidence:** `app/api/venue/shifts/route.ts` lines 64-88 — no call to `upsertShiftLinkedAssignment()`.
**Root Cause:** Venue API was built separately from admin staffing API; integration bridge was never added.
**Recommended Resolution:** Add `syncEmploymentAssignmentForShift()` call in venue shift POST handler, or unify the two APIs.
**Risk:** Shifts created in venue context may not appear to workers.
**Rollback:** Remove the sync call if issues arise.

---

### Finding: No Server-Side Conflict Validation on Create/Update
**Severity:** Medium
**Area:** API / Data Integrity
**Current Behavior:** `POST /api/admin/staffing/shifts` and `PATCH /api/admin/staffing/shifts/[id]` do not validate that the assigned worker is not already scheduled for an overlapping shift.
**Expected Behavior:** Server should reject shifts that create double-bookings.
**Evidence:** `app/api/admin/staffing/shifts/route.ts` POST handler — no overlap query before INSERT.
**Root Cause:** Conflict detection is only implemented client-side in `use-scheduling-data.ts`.
**Recommended Resolution:** Add server-side overlap check before INSERT/UPDATE on `staff_shifts`.
**Risk:** Race conditions or API misuse could create invalid schedules.
**Rollback:** Remove the validation query.

---

### Finding: Worker Can Accept/Decline Any Assignment
**Severity:** Low
**Area:** API / Permissions
**Current Behavior:** `respondToShiftAssignment` checks `eq(user_id, args.userId)` but does not verify the assignment is still valid (e.g., shift hasn't started, been cancelled by admin).
**Expected Behavior:** Worker should not be able to accept a shift that has already started or been cancelled.
**Evidence:** `lib/services/staff-shift-assignment-sync.ts` lines 302-403 — checks status is `invited` or `confirmed` but not whether the shift datetime has passed.
**Root Cause:** Time-based validation missing.
**Recommended Resolution:** Add check that `starts_at > now()` before allowing accept/decline.
**Risk:** Workers could retroactively accept or decline past shifts.

---

### Finding: `hasEntityPermission` Fallback Chain May Over-Grant
**Severity:** Low
**Area:** API / Permissions
**Current Behavior:** `canAccessVenueOrEvent` in `/api/admin/staffing/shifts` allows access if EITHER venue permission OR event permission is granted.
**Expected Behavior:** Should the user need BOTH permissions when both venue and event are specified?
**Evidence:** `app/api/admin/staffing/shifts/route.ts` lines 47-80.
**Root Cause:** OR logic provides multiple paths to authorization.
**Recommended Resolution:** Review whether this is intentional. Document the permission inheritance model clearly.

---

## 4. RLS Status

| Table | RLS Enabled | Policies | Notes |
|-------|------------|----------|-------|
| `staff_shifts` | Unknown | None documented | API does manual auth; direct table access unprotected |
| `staff_members` | Unknown | None documented | — |
| `employment_assignments` | Unknown | None documented | — |
| `staff_zones` | Unknown | None documented | — |

**Recommendation:** All scheduling tables should have RLS policies as defense in depth, even if API routes do manual checks. See `06-data-api-audit.md` for proposed policies.

---

## 5. Data Ownership Model

```
staff_shifts
├── venue_id → Venue owns the shift (if venue-scoped)
├── org_id → Organization owns the shift (if org-scoped)
├── event_id → Event context (optional)
├── created_by → User who created it
└── staff_member_id → Assigned worker

employment_assignments
├── user_id → Worker who receives it
├── staff_shift_id → Link to shift
├── employer_entity_type → Who assigned it
└── employer_entity_id → Employer ID
```

**Assessment:** Ownership is clear but fragmented across multiple columns. Queries must handle `venue_id` OR `org_id` OR `adhoc_venue_id`.

---

*Permissions audit based on read-only code inspection. No penetration testing performed.*
