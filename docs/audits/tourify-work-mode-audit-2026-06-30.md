# Tourify Work Mode Audit

Date: 2026-06-30
Scope: Read-only audit of Work Mode, the worker-facing experience for hired General users.

## Product definition

Work Mode is not an account type. It is a role-based dashboard/mode shown to General users after they are hired, approved, and onboarded as crew, staff, or volunteers.

Work Mode should show the forward-facing information that Admin or Venue managers publish to the worker:

- Schedule
- Shifts
- Tasks
- Communications
- Updates
- Site maps
- Day sheets/run sheets
- Documents
- Travel
- Payroll info
- Contacts
- Check-in/out if applicable

## Current inventory

| Area | Current status |
|---|---|
| Work Mode widget | Partial |
| Assignment detection | Partial |
| Activate/deactivate Work Mode | Partial |
| Accept/confirm assignment | Partial |
| Role-template permissions | Partial |
| Employment assignment creation during onboarding | Partial |
| Dedicated worker dashboard | Missing |
| Worker-facing schedule/task/comms/site map/day sheet hub | Missing |

## Current visible items

Current widget-level visible items counted: 6.

- Shifts button
- Your Assignments list
- Activate Work Mode
- Deactivate Work Mode
- Accept assignment
- Assignment status badge

These are useful entry points, but they do not deliver the full worker dashboard.

## Current implementation pieces

Observed files and concepts:

- `components/account/work-mode-widget.tsx`
- `hooks/use-work-mode.ts`
- `lib/hiring/work-mode-permissions.ts`
- `components/hiring/work-mode-permissions-card.tsx`
- `types/hiring-roster-work-mode.ts`
- Hiring/onboarding services that create or update employment assignments.

The code already states the correct product direction: Work Mode replaces the old `staff` switcher type and should be a transient overlay on the General account.

## Cross-account ownership

Admin workforce:

- Admin organization manages tour/event staff, crew, volunteers, tasks, schedules, onboarding, communications, day sheets, logistics, travel, payroll info, and site maps for organization-run tours/events.

Venue workforce:

- Venue manages its own venue-side staff, crew, volunteers, shifts, tasks, onboarding, communications, documents, site maps, and event-day operations.
- Venue workforce remains venue-owned even when an Admin organization hosts an event at the venue or an Artist books the venue, unless explicit collaboration permissions are granted.

Artist relationship:

- Artist can collaborate with Admin and Venue accounts.
- Artist direct hiring authority still needs a product decision. If supported, it should reuse the same Work Mode foundation.

## Completion estimate

Work Mode completion: 30-35%.

The assignment foundation exists, but the worker-facing value is not complete until the user has a clear dashboard showing what they need to do, where they need to be, who to contact, what documents to review, and what has changed.

## Missing or not fully built

- Dedicated Work Mode dashboard route.
- Schedule and shift calendar for the worker.
- Task list with status, due dates, assignment source, and manager.
- Communications and updates feed.
- Site map viewer for assigned event/venue/tour.
- Day sheet/run sheet viewer and acknowledgement flow.
- Documents and compliance info.
- Travel information.
- Payroll info summary.
- Contacts directory.
- Worker check-in/out if required by event/venue role.
- Clear separation between Admin-published assignments and Venue-published assignments.
- RLS policies and storage permissions verified for worker-only access.

## Recommended next steps

1. Create a dedicated Work Mode dashboard for General users with active assignments.
2. Build the dashboard around assignment context: source entity, event/tour/venue, role, department, schedule, tasks, docs, communications, site maps, and contacts.
3. Let Admin and Venue publish workforce information into the same worker-facing model.
4. Add permission filters so a worker sees only information tied to their accepted/onboarded assignments.
5. Verify Supabase RLS/storage policies before production.

