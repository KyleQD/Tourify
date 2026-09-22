# Tourify Scheduling & Shifts — Testing Strategy

**Date:** 2026-08-03
**Status:** Audit Complete

---

## 1. Unit Tests

### Date/Time Calculations
```
__tests__/scheduling/date-time-utils.test.ts
- isoDate() formatting
- formatTime() 12-hour conversion
- minutesBetween() across midnight
- overlaps() detection
- startOfWeek() calculation
```

### Shift Validation
```
__tests__/scheduling/shift-validation.test.ts
- Valid shift creation (date, time, staff)
- Invalid shift (end before start)
- Invalid shift (overlapping existing)
- Invalid shift (staff on time-off)
```

### Conflict Detection
```
__tests__/scheduling/conflict-detection.test.ts
- Double-booking detection
- Rest-period violation (< 8 hrs)
- Overtime violation (> 40 hrs/week)
- Availability conflict
- Time-off conflict
```

### Permission Helpers
```
__tests__/scheduling/permissions.test.ts
- canAccessVenueOrEvent() true cases
- canAccessVenueOrEvent() false cases
- Organization admin vs department lead
```

### Assignment Eligibility
```
__tests__/scheduling/eligibility.test.ts
- Staff member is active → eligible
- Staff member onboarding incomplete → ineligible
- Staff member on time-off → ineligible
- Staff member already scheduled → ineligible (for same time)
```

### Status Transitions
```
__tests__/scheduling/status-transitions.test.ts
- invited → confirmed (valid)
- invited → cancelled (valid)
- confirmed → completed (valid)
- completed → cancelled (invalid)
- cancelled → confirmed (invalid)
```

---

## 2. Integration Tests

### Shift Creation
```
__tests__/scheduling/shift-creation.test.ts
- POST /api/admin/staffing/shifts creates shift
- Shift syncs to employment_assignments
- Notification sent when notify=true
- Audit event logged
```

### Worker Assignment
```
__tests__/scheduling/worker-assignment.test.ts
- Assign worker to shift
- Worker sees assignment in Work Mode
- Worker accepts → status updates
- Worker declines → status updates
- Admin sees response
```

### Publishing
```
__tests__/scheduling/publish.test.ts
- Publish single shift → worker notified
- Publish multiple shifts → batch notifications
- Publish with conflicts → warning surfaced
```

### Worker Acceptance
```
__tests__/scheduling/worker-response.test.ts
- Worker accepts shift → confirmed
- Worker declines shift → declined
- Worker tries to accept past shift → rejected
- Worker tries to accept cancelled shift → rejected
```

### Replacement Flow
```
__tests__/scheduling/replacement.test.ts
- Worker calls out → admin notified
- Admin assigns replacement → new worker notified
- Original worker marked as no-show
```

---

## 3. Permission Tests

### Organization Administrator
```
__tests__/scheduling/permissions/org-admin.test.ts
- Can view all org shifts
- Can create/edit/delete any org shift
- Can publish schedule
- Cannot access other org's shifts
```

### Staffing Manager
```
__tests__/scheduling/permissions/staffing-manager.test.ts
- Can view all shifts
- Can create/edit/delete shifts
- Cannot delete org-level settings
```

### Department Lead
```
__tests__/scheduling/permissions/department-lead.test.ts
- Can view department shifts
- Can edit department shifts
- Cannot edit other department shifts
```

### Worker
```
__tests__/scheduling/permissions/worker.test.ts
- Can view own shifts only
- Can accept/decline own assignments
- Cannot view other workers' shifts
- Cannot modify shifts
```

### Unauthorized User
```
__tests__/scheduling/permissions/unauthorized.test.ts
- Cannot access admin scheduling
- Cannot access venue scheduling
- Cannot access shift APIs
- Returns 401/403 appropriately
```

### Cross-Organization Access
```
__tests__/scheduling/permissions/cross-org.test.ts
- User in Org A cannot see Org B shifts
- User in Org A cannot modify Org B shifts
- API returns 403 for cross-org attempts
```

---

## 4. UX Tests

### Desktop
```
- Week grid renders 7 days + staff rows
- Add shift dialog opens and submits
- Edit shift dialog opens and saves
- Shift cards display correct info
- Scroll through many staff members
```

### Tablet
```
- Layout adapts to tablet width
- Touch interactions work
- Side panels usable
```

### Mobile
```
- Worker schedule view usable on phone
- Shift detail readable
- Accept/decline buttons tappable
- Notifications route to correct shift
```

### Keyboard Navigation
```
- Tab through shift cards
- Enter to open detail
- Escape to close modals
- Arrow keys to navigate week
```

### Screen Readers
```
- Shift cards have aria-labels
- Status announced correctly
- Dialog titles announced
- Live regions for notifications
```

### Loading States
```
- Skeleton shown while loading
- Spinner on save operations
- Disabled buttons during submit
```

### Empty States
```
- Empty week shows illustration + CTA
- No staff shows "add staff" message
- No venue context shows error state
```

### Error Recovery
```
- Network failure shows retry button
- Form validation shows inline errors
- Permission error shows helpful message
```

---

## 5. End-to-End Scenarios

### E2E-1: Admin Creates Shift and Assigns Onboarded Worker
```gherkin
Given an organization admin is logged in
And the admin is on the scheduling page
And a worker "Maya Chen" is in the active roster
When the admin clicks "Add Shift"
And selects "Maya Chen" as staff
And sets date to tomorrow, 14:00–23:00
And clicks "Add Shift"
Then the shift appears in the week grid
And Maya Chen receives a notification
And Maya sees the shift in her Work Mode dashboard
```

### E2E-2: Worker Receives and Accepts Shift
```gherkin
Given Maya Chen is logged in as a worker
And she has a pending shift assignment
When she opens her Work Mode dashboard
And taps the shift card
And taps "Accept Shift"
Then the shift status changes to "Confirmed"
And the admin receives a notification that Maya accepted
```

### E2E-3: Admin Modifies Shift and Worker Receives Update
```gherkin
Given an admin has published a shift assigned to Maya
When the admin edits the shift time from 14:00 to 15:00
And saves the change
Then Maya receives a notification about the time change
And the updated time appears in Maya's schedule
```

### E2E-4: Worker Calls Out and Admin Assigns Replacement
```gherkin
Given Maya has a confirmed shift tomorrow
When Maya taps "Call Out" and confirms
Then the admin receives a notification
And the admin sees the shift as "Needs Replacement"
When the admin assigns "Diego Ramirez" as replacement
Then Diego receives a notification
And Maya's assignment is marked as "Called Out"
```

### E2E-5: Admin Detects and Resolves Double-Booking
```gherkin
Given Maya is assigned to Shift A on Monday 14:00–18:00
When the admin tries to assign Maya to Shift B on Monday 16:00–20:00
Then the system warns about the overlap
And prevents the assignment (or warns strongly)
When the admin assigns Shift B to Diego instead
Then the conflict is resolved
```

### E2E-6: Worker Checks In and Completes Shift
```gherkin
Given Maya has a confirmed shift starting now
When Maya arrives at the venue
And taps "Check In" on her phone
Then the admin sees Maya as "Checked In"
When Maya finishes work and taps "Clock Out"
Then the shift status changes to "Completed"
And hours worked are recorded
```

### E2E-7: Unauthorized User Cannot Access Another Organization's Schedule
```gherkin
Given a user is logged in and belongs to Org A
When the user tries to access Org B's scheduling API
Then the API returns 403 Forbidden
And no shift data is exposed
```

### E2E-8: Multi-Timezone Schedule Display
```gherkin
Given a tour has events in New York and Los Angeles
When the admin views the tour schedule
Then New York shifts display in Eastern Time
And Los Angeles shifts display in Pacific Time
And workers see shifts in their local timezone
```

---

## 6. Performance Tests

| Scenario | Target | Measurement |
|----------|--------|-------------|
| Load week grid (50 staff, 100 shifts) | < 1s | Time to interactive |
| Publish 50 shifts | < 3s | Notification batch send |
| Conflict check (1000 shifts) | < 500ms | Overlap detection |
| Calendar render (month view) | < 2s | Initial render |
| Mobile shift list (100 shifts) | < 1s | List render |

---

## 7. Test Environment

```bash
# Unit + Integration
npm run test:unit

# Scheduling-specific
vitest run __tests__/scheduling/

# E2E
playwright test tests/e2e/scheduling/

# Permission matrix
vitest run __tests__/scheduling/permissions/
```

---

## 8. QA Seed Data

```bash
# Seed test organization with staff and shifts
npx tsx scripts/qa/seed-scheduling-qa.ts
```

---

*Testing strategy covers unit, integration, permission, UX, and end-to-end scenarios for the complete scheduling ecosystem.*
