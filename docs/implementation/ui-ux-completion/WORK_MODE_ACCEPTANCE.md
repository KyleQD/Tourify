# Work Mode P0 Acceptance Evidence

Date: 2026-07-28  
Audit module: `GEN-12`

## Delivered

- Authenticated, RLS-backed assignment list and assignment-detail APIs.
- No browser Supabase reads for assignments, publications, shifts, participants,
  or user session state.
- Canonical assignment-scoped routes for Today, Schedule, Tasks, Updates, Maps,
  Day Sheet, Documents, Travel, Pay, Contacts, and Check-in.
- Idempotent accept handling and conflict-aware response codes.
- Responsive local navigation, loading, empty, unavailable, error, pending, and
  assignment-selection states.
- Real published advances, day sheets, broadcasts, and site maps are scoped to
  confirmed/active assignment event IDs.

## Explicitly unavailable

Tasks, documents, travel, pay, contacts, and check-in remain visible but unavailable
until an authorized worker-facing contract exists. No sample or inferred records
are shown.

## Database

Core Work Mode reads require no schema change and use the existing
`employment_assignments` and `work_mode_publications` RLS policies.

Optional durable funnel evidence requires the additive, manual-only
`20260728181917_work_mode_ux_telemetry.sql`. It has not been applied by Codex.
Until an operator runs and verifies it, telemetry requests fail open with
`persisted: false` and never block Work Mode.

## Remaining GEN-12 gates

- Connect worker-scoped task, document, itinerary, payroll, contact, and check-in
  read/mutation contracts.
- Add persisted acknowledgement and offline check-in recovery where required.
- Complete browser, assistive-technology, mobile hardware, performance, and
  moderated usability evidence.
