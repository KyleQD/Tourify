# Tourify Scheduling & Shifts — Data & API Audit

**Date:** 2026-08-03
**Status:** Read-Only Audit

---

## 1. Database Schema: `staff_shifts`

### Current Columns (from `lib/database.types.ts`)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `string` (uuid) | No | PK |
| `venue_id` | `string` (uuid) | Yes | Venue context |
| `org_id` | `string` (uuid) | Yes | Organization context |
| `adhoc_venue_id` | `string` (uuid) | Yes | Legacy venue v2 bridge |
| `event_id` | `string` (uuid) | Yes | Event context |
| `staff_member_id` | `string` (uuid) | Yes | Assigned worker |
| `shift_date` | `string` | Yes | ISO date (YYYY-MM-DD) |
| `start_time` | `string` | Yes | HH:MM or HH:MM:SS |
| `end_time` | `string` | Yes | HH:MM or HH:MM:SS |
| `break_duration` | `number` | Yes | Minutes |
| `zone_assignment` | `string` | Yes | Free-text or zone name |
| `role_assignment` | `string` | Yes | Free-text role |
| `notes` | `string` | Yes | Admin notes |
| `status` | `string` | Yes | scheduled/confirmed/completed/cancelled |
| `created_by` | `string` (uuid) | Yes | Admin user ID |
| `created_at` | `string` | Yes | ISO timestamp |
| `updated_at` | `string` | Yes | ISO timestamp |

### Missing Columns (Recommended Additive Migrations)

| Column | Type | Purpose |
|--------|------|---------|
| `published_at` | `timestamp` | When schedule was published |
| `published_by` | `uuid` | Who published |
| `department_id` | `uuid` | Formal department link |
| `needed_staff_count` | `int` | How many workers needed (not just 1:1) |
| `required_skills` | `text[]` | Skills required for shift |
| `required_credentials` | `text[]` | Credentials required |
| `shift_type` | `enum` | event/venue/tour/operations |
| `is_recurring` | `boolean` | Part of a recurring series |
| `recurring_group_id` | `uuid` | Links recurring shifts |
| `check_in_time` | `timestamp` | When worker checked in |
| `check_out_time` | `timestamp` | When worker checked out |
| `check_in_method` | `enum` | manual/gps/qr/auto |
| `location_lat` | `float` | Check-in latitude |
| `location_lng` | `float` | Check-in longitude |
| `supervisor_notes` | `text` | Notes from supervisor post-shift |
| `worker_notes` | `text` | Notes from worker post-shift |
| `cancellation_reason` | `enum` | manager_cancelled/worker_declined/no_show/etc |
| `cancellation_note` | `text` | Free-text cancellation reason |

---

## 2. Database Schema: `employment_assignments`

### Current Columns (used by shift sync)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | PK |
| `user_id` | uuid | Worker user account |
| `staff_member_id` | uuid | Link to staff_members |
| `staff_shift_id` | uuid | Link to staff_shifts |
| `venue_id` | uuid | Venue context |
| `event_id` | uuid | Event context |
| `employer_entity_type` | string | venue/organization/artist |
| `employer_entity_id` | uuid | Employer ID |
| `role_title` | string | Display role |
| `department` | string | Department |
| `permissions` | jsonb | Work Mode permissions |
| `starts_at` | timestamp | Shift start datetime |
| `ends_at` | timestamp | Shift end datetime |
| `status` | string | invited/confirmed/active/completed/cancelled |
| `source` | string | staff_shift |
| `created_at` | timestamp | — |
| `updated_at` | timestamp | — |

### Assessment
This table is well-designed as a bridge. The `staff_shift_id` foreign link ensures consistency. However, there is no `declined` status — worker declines map to `cancelled`, which conflates reasons.

**Recommended:** Add `declined` status to `employment_assignments.status` enum and map it correctly.

---

## 3. API Audit: `/api/admin/staffing/shifts`

### GET
- **Auth:** `resolveHiringActorFromRequest` OR `hasEntityPermission`
- **Query params:** venueId, org_id, entity_type, entity_id, eventId, staff_member_id, status, date_from, date_to
- **Response shape:** `{ data: [...] }` (via `projectWorkforceRecords`)
- **RLS:** Not using RLS — permissions checked manually in route handler
- **Issues:**
  - No pagination
  - No limit on date range (could return thousands of rows)
  - `projectWorkforceRecords` projection may filter fields unexpectedly

### POST
- **Auth:** `resolveHiringActorFromRequest` OR `hasEntityPermission` + `validateWorkforceAssignmentParents`
- **Body:** venue_id, org_id, event_id, staff_member_id, shift_date, start_time, end_time, break_duration, zone_assignment, role_assignment, notes, status, notify
- **Response shape:** `{ data: {...}, sync: {...} }`
- **Issues:**
  - Only supports single staff_member_id per call (1:1 shift-to-worker)
  - No support for `needed_staff_count > 1`
  - `zone_assignment` is free-text, not validated against `staff_zones`
  - No recurrence support
  - `notify` defaults to false (workers may not be notified)

### Assessment
Solid foundation but limited to simple 1-worker shifts. No bulk creation. No validation against staff availability.

---

## 4. API Audit: `/api/admin/staffing/shifts/[id]`

### PATCH
- **Auth:** `hasEntityPermission` (Venue or Event)
- **Body:** Any shift field + `notify` flag
- **Behavior:** Updates shift, syncs to `employment_assignments`, sends notification if `notify !== false`
- **Issues:**
  - No validation that new time doesn't conflict with worker's other shifts
  - No validation that staff_member_id is in active roster
  - `changeSummary` logic is basic (only detects time/role/zone/staff changes)

### DELETE
- **Auth:** `hasEntityPermission`
- **Behavior:** Cancels linked assignment (sends notification), then deletes shift
- **Issues:**
  - Hard delete — no soft delete. History lost.
  - No check if shift is already in progress or completed

---

## 5. API Audit: `/api/venue/shifts`

### GET
- **Auth:** `authenticateApiRequest` + `canManageVenue`
- **Query:** venue_id, event_id, staff_member_id, status, date_from, date_to
- **Response:** `{ success: true, data: [...] }`
- **Issues:**
  - Different response shape than admin API (`success` wrapper vs `{data}`)
  - Uses `adhoc_venue_id` workaround
  - No `projectWorkforceRecords` filtering — returns raw rows

### POST
- **Auth:** `authenticateApiRequest` + `canManageVenue`
- **Body:** venue_id, event_id, staff_member_id, shift_date, start_time, end_time, break_duration, zone_assignment, role_assignment, notes
- **Issues:**
  - Sets `venue_id: null` and uses `adhoc_venue_id` instead
  - No `notify` flag — no Work Mode sync, no notifications
  - No `created_by` audit (does set it, but no hiring audit event)

### Assessment
This API is **disconnected from the Work Mode bridge**. Shifts created here may not appear to workers. This is a critical integration gap.

---

## 6. API Audit: `/api/work-mode/assignments`

### GET
- **Purpose:** Worker views their assignments
- **Data source:** `employment_assignments`
- **Status:** Working (separate system, verified by existing tests)

### POST `/[id]/respond`
- **Purpose:** Worker accepts or declines assignment
- **Status:** Working
- **Mirror:** Updates `staff_shifts.status` via `respondToShiftAssignment()`

---

## 7. Data Integrity Risks

### Risk 1: Hard Deletes
`staff_shifts` rows are hard-deleted on DELETE. No audit trail of what was deleted.

**Recommendation:** Add `deleted_at` soft-delete column. Filter all queries with `.is("deleted_at", null)`.

### Risk 2: Status Conflation
Worker `decline` → `cancelled` status. Cannot distinguish manager cancellation from worker decline.

**Recommendation:** Add `cancellation_reason` enum column or change `employment_assignments` to support `declined` status.

### Risk 3: Time Zone Ambiguity
`shift_date` + `start_time` are stored as strings without timezone. For multi-city tours, this is problematic.

**Recommendation:** Store `starts_at` and `ends_at` as full timestamps with timezone in `staff_shifts` (in addition to date/time for UI convenience).

### Risk 4: 1:1 Shift-to-Worker
Current schema assumes one `staff_member_id` per shift. For roles needing multiple workers (e.g., "4 Door Staff"), managers must create 4 separate shift rows.

**Recommendation:** Add `needed_staff_count` and create a `staff_shift_assignments` junction table for many-to-many worker assignment.

---

## 8. Recommended Additive Migrations

### Migration 1: `staff_shifts` Enhancements
```sql
-- Add soft delete
ALTER TABLE staff_shifts ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_staff_shifts_deleted_at ON staff_shifts(deleted_at) WHERE deleted_at IS NULL;

-- Add publish tracking
ALTER TABLE staff_shifts ADD COLUMN published_at TIMESTAMPTZ;
ALTER TABLE staff_shifts ADD COLUMN published_by UUID REFERENCES auth.users(id);

-- Add cancellation reason
ALTER TABLE staff_shifts ADD COLUMN cancellation_reason TEXT;
ALTER TABLE staff_shifts ADD COLUMN cancellation_note TEXT;

-- Add shift metadata
ALTER TABLE staff_shifts ADD COLUMN needed_staff_count INT DEFAULT 1;
ALTER TABLE staff_shifts ADD COLUMN required_skills TEXT[];
ALTER TABLE staff_shifts ADD COLUMN required_credentials TEXT[];
ALTER TABLE staff_shifts ADD COLUMN shift_type TEXT DEFAULT 'event';

-- Add timestamps with timezone
ALTER TABLE staff_shifts ADD COLUMN starts_at TIMESTAMPTZ;
ALTER TABLE staff_shifts ADD COLUMN ends_at TIMESTAMPTZ;
```

### Migration 2: `staff_shift_assignments` Junction Table
```sql
CREATE TABLE staff_shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES staff_shifts(id),
  staff_member_id UUID REFERENCES staff_members(id),
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited','confirmed','checked_in','completed','declined','no_show')),
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  check_in_method TEXT,
  check_in_lat FLOAT,
  check_in_lng FLOAT,
  supervisor_notes TEXT,
  worker_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shift_assignments_shift ON staff_shift_assignments(shift_id);
CREATE INDEX idx_shift_assignments_staff ON staff_shift_assignments(staff_member_id);
CREATE INDEX idx_shift_assignments_user ON staff_shift_assignments(user_id);
CREATE INDEX idx_shift_assignments_status ON staff_shift_assignments(status);
```

### Migration 3: `staff_shift_recurring_groups`
```sql
CREATE TABLE staff_shift_recurring_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  venue_id UUID,
  event_id UUID,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','biweekly','monthly')),
  interval_count INT DEFAULT 1,
  starts_on DATE NOT NULL,
  ends_on DATE,
  end_after_occurrences INT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE staff_shifts ADD COLUMN recurring_group_id UUID REFERENCES staff_shift_recurring_groups(id);
```

### Migration 4: `staff_availability`
```sql
CREATE TABLE staff_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id UUID NOT NULL REFERENCES staff_members(id),
  org_id UUID,
  venue_id UUID,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT true,
  is_preferred BOOLEAN DEFAULT false,
  effective_from DATE,
  effective_until DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_availability_staff ON staff_availability(staff_member_id);
CREATE INDEX idx_availability_org ON staff_availability(org_id);
```

### Migration 5: `staff_time_off_requests`
```sql
CREATE TABLE staff_time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id UUID NOT NULL REFERENCES staff_members(id),
  user_id UUID REFERENCES auth.users(id),
  org_id UUID,
  request_type TEXT NOT NULL CHECK (request_type IN ('vacation','sick_leave','personal','bereavement','other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT true,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_time_off_staff ON staff_time_off_requests(staff_member_id);
CREATE INDEX idx_time_off_status ON staff_time_off_requests(status);
CREATE INDEX idx_time_off_dates ON staff_time_off_requests(start_date, end_date);
```

---

## 9. RLS Policy Recommendations

Current API routes check permissions manually. For direct Supabase client access (e.g., realtime subscriptions), RLS policies are needed:

```sql
-- Staff shifts: admins can manage, workers can view their own
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shifts"
  ON staff_shifts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = staff_shifts.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner','admin','manager')
    )
  );

CREATE POLICY "Workers can view their shifts"
  ON staff_shifts FOR SELECT
  USING (
    staff_shifts.staff_member_id IN (
      SELECT id FROM staff_members WHERE user_id = auth.uid()
    )
  );

-- Staff shift assignments
ALTER TABLE staff_shift_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view/update their assignments"
  ON staff_shift_assignments FOR ALL
  USING (user_id = auth.uid());
```

---

*All proposed migrations are additive. No destructive changes recommended.*
