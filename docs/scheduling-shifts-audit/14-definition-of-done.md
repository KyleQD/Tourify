# Tourify Scheduling & Shifts — Definition of Done

**Date:** 2026-08-03
**Status:** Audit Complete

---

## Phase 0 — Critical Repairs: Definition of Done

- [ ] Admin can edit an existing shift (time, role, staff, notes)
- [ ] Venue scheduling page loads without errors (all components render)
- [ ] Deleted shifts are soft-deleted (not hard-deleted)
- [ ] Worker decline shows as "Declined" (not "Cancelled")
- [ ] Venue API response shape matches admin API
- [ ] Build passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type checks pass (`npm run typecheck`)
- [ ] Relevant tests pass

---

## Phase 1 — Production Foundation: Definition of Done

### Admin Experience
- [ ] `/admin/dashboard/staff?tab=scheduling` is accessible and correctly scoped
- [ ] Navigation opens the scheduling experience from admin sidebar
- [ ] Week grid displays all shifts for selected week
- [ ] Admin can create a shift (date, time, staff, role, zone, notes)
- [ ] Admin can edit an existing shift
- [ ] Admin can duplicate a shift
- [ ] Admin can delete/cancel a shift
- [ ] Admin can assign a worker to an open shift
- [ ] Admin can reassign a worker
- [ ] Only eligible (active, onboarded) workers appear in picker
- [ ] Employer, organization, event, and venue ownership are enforced
- [ ] Draft and published schedule states are clear in UI
- [ ] Publish workflow shows review step (changes, conflicts, affected workers)
- [ ] Admin can publish schedule and workers are notified
- [ ] Scheduling conflicts are surfaced before publish
- [ ] Loading states exist for all async operations
- [ ] Empty states exist when no shifts/staff
- [ ] Error states exist for API failures
- [ ] Permission errors show helpful messages
- [ ] Desktop, tablet, and mobile layouts are usable

### Worker Experience
- [ ] Worker can view assigned shifts in Work Mode
- [ ] Shift details show: event, venue, time, role, supervisor, notes
- [ ] Worker can accept a shift
- [ ] Worker can decline a shift
- [ ] Worker receives notification on assignment
- [ ] Worker receives notification on schedule change
- [ ] Worker receives notification on cancellation
- [ ] Mobile experience is usable
- [ ] Notification links route to correct shift

### Backend
- [ ] All CRUD APIs have proper auth checks
- [ ] Server-side overlap validation on create/update
- [ ] Shift-to-employment_assignment sync works
- [ ] Notifications fire correctly
- [ ] Audit events logged for sensitive changes
- [ ] Database changes are additive only

---

## Phase 2 — Workforce Coordination: Definition of Done

- [ ] Worker can set weekly availability
- [ ] Admin sees availability when scheduling
- [ ] Worker can request time off
- [ ] Admin can approve/deny time off
- [ ] Approved time-off blocks scheduling
- [ ] Admin can create open shifts (no assigned worker)
- [ ] Worker can claim open shifts
- [ ] Admin approves claim
- [ ] Worker can request shift swap
- [ ] Admin approves/rejects swap
- [ ] Enhanced conflict detection (rest period, overtime, availability)
- [ ] Bulk operations work (multi-select, bulk publish, bulk delete)
- [ ] Department and zone grouping views work
- [ ] All new features have loading, empty, error, success states

---

## Phase 3 — Attendance & Operations: Definition of Done

- [ ] Worker can check in to shift
- [ ] Worker can clock out
- [ ] Admin sees real-time check-in status
- [ ] Late arrivals are auto-flagged
- [ ] No-shows can be marked by admin
- [ ] Break tracking works
- [ ] Attendance review dashboard exists
- [ ] Replacement suggestion workflow works
- [ ] Attendance data exportable

---

## Phase 4 — Advanced Scheduling: Definition of Done

- [ ] Recurring shifts can be created
- [ ] Recurring shift instances can be edited independently
- [ ] Org-owned shift templates can be saved and reused
- [ ] Labor cost forecasting visible on schedule
- [ ] Schedule exportable to PDF, CSV, iCal
- [ ] Realtime updates across admin sessions

---

## Cross-Cutting Requirements (All Phases)

### Security
- [ ] Server-side authorization on every API route
- [ ] RLS policies on scheduling tables
- [ ] No cross-organization data leakage
- [ ] Sensitive actions require confirmation

### Accessibility
- [ ] Keyboard navigation works
- [ ] ARIA labels on interactive elements
- [ ] Focus management in modals
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG AA

### Performance
- [ ] Week grid loads in < 1s (50 staff, 100 shifts)
- [ ] No N+1 queries
- [ ] Pagination on large datasets
- [ ] Images lazy-loaded

### Analytics
- [ ] Analytics events for: shift_created, shift_assigned, schedule_published, worker_accepted, worker_declined, worker_called_out, replacement_assigned, worker_checked_in

### Documentation
- [ ] `progress.json` updated after each task
- [ ] API changes documented
- [ ] UI changes documented
- [ ] Migration scripts documented

---

## Final Sign-Off Checklist

Before marking the Scheduling & Shifts ecosystem complete:

- [ ] All phases above meet their definition of done
- [ ] Build passes
- [ ] Lint passes
- [ ] Type checks pass
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Permission tests pass
- [ ] E2E tests pass
- [ ] No known critical or high-severity scheduling defects remain undocumented
- [ ] `progress.json` accurately reflects completion
- [ ] Rollback instructions documented

---

*Definition of done aligns with Tourify development rules and production-quality standards.*
