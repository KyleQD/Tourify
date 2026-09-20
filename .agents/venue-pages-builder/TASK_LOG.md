# Venue Pages Builder — Task Log

Append-only. Newest entries at the bottom.

---

## Log

### 2026-07-20 — foundation batch (`ven-entry` → `ven-mobile-nav`)

- **Surface:** `/venue`, layout, shell, `useCurrentVenue`, mobile nav
- **Purpose:** Reliable venue ops entry and active-venue context
- **Change:** Query-preserving root redirect; Venue Ops metadata; public page link in shell; no placeholder PNGs; venue-change event refresh; door-nav active states
- **Integration:** Account switcher / deep links land on dashboard with params; public profile preview from shell
- **Files:** `app/venue/page.tsx`, `layout.tsx`, `hooks/useCurrentVenue.ts`, `lib/services/venue.service.ts`, `components/operations/venue-operations-shell.tsx`, `components/venue/mobile-venue-nav.tsx`

### 2026-07-20 — command + commerce (`ven-dashboard` → `ven-analytics`)

- **Surface:** Dashboard, bookings, calendar, events, check-in, messages, tickets, finances, analytics
- **Purpose:** Day-to-day venue operator command and money surfaces
- **Change:** Real hiring/site-map action signals; approve→event CTA; bookings on calendar; ticketing summary on event ops; venue-gated check-in; venue message chrome; ticket CTA; kill synthetic finance/analytics proxies
- **Integration:** Bookings ↔ events ↔ tickets ↔ check-in ↔ hiring
- **Files:** `app/venue/dashboard/page.tsx`, `bookings/page.tsx`, `dashboard/calendar/page.tsx`, `events/**`, `messages/page.tsx`, `dashboard/tickets/page.tsx`, `finances/page.tsx`, `analytics/page.tsx`

### 2026-07-20 — physical + multi-venue + workforce

- **Surface:** Overview, documents, site-maps, venues CRUD, hiring kanban, teams, scheduling, onboarding
- **Purpose:** Physical venue ops and multi-venue management
- **Change:** Ops quick links; remove document mocks; venue-scoped site maps; live venues list/create/detail/edit; booking-request redirect; hiring empty state; teams→staff redirects; scheduling header; onboarding site-map signal
- **Integration:** Public booking form; staff hub consolidation
- **Files:** `app/venue/overview/page.tsx`, `documents/page.tsx`, `dashboard/site-maps/page.tsx`, `dashboard/venues/**`, `dashboard/hiring-kanban/page.tsx`, `dashboard/teams/**`, `staff/**`, `dashboard/onboarding/page.tsx`

### 2026-07-20 — public + admin + twin/debt cleanup

- **Surface:** `/venues`, public slug, booking-request, admin venues, social/debt twins
- **Purpose:** Guest discovery and IA consolidation
- **Change:** url_slug navigation; remove unused supabase client; contact prefill; admin Venue ops link; redirect map/events twins and remaining social debt routes
- **Integration:** Admin list → venue ops; public booking path canonical
- **Files:** `app/venues/**`, `app/admin/dashboard/venues/page.tsx`, `app/venue/dashboard/events/**`, `app/venue/dashboard/{integrations,posts,profile}/**`

### 2026-07-20 — COMPLETE

- Inventory: **87/87** `done`
- Constraints honored: no database reset, no commits, additive-only
- Resume pointer set to `COMPLETE`

### 2026-07-28 — Phase 4 audit remediation (`audit-ven-01` → `audit-ven-04`)

- **VEN-01:** Gave `VenueOperationsShell` exclusive ownership of operational
  chrome while preserving global chrome on public `/venues` pages.
- **VEN-02:** Re-verified the action-first dashboard against real booking,
  event, staffing, hiring, and map sources.
- **VEN-03:** Added a strict shared profile contract, private-field sanitizer,
  owner compatibility, and real multi-venue edit mutation.
- **VEN-04:** Added the compatibility booking lifecycle, transition conflicts,
  idempotency, event convergence, explicit feature gate, manual SQL, manifest,
  runbook, and focused tests.

### 2026-07-28 — Phase 4 audit remediation (`audit-ven-05` → `audit-ven-08`)

- **VEN-05:** Re-verified the canonical events/calendar hub and alias redirects.
- **VEN-06:** Closed unauthorized door totals and attendee contact; removed raw
  offline credential persistence and false offline success.
- **VEN-07:** Re-verified shared event-scoped ticket credential, scan, reversal,
  refund, reconciliation, and settlement contracts.
- **VEN-08:** Added separate view/manage finance capabilities and enforced
  tenant authorization before every service-role query or mutation.

### 2026-07-28 — Phase 4 audit remediation (`audit-ven-09` → `audit-ven-12`)

- **VEN-09:** Re-verified canonical verified-source analytics and redirected
  legacy analytics twins.
- **VEN-10:** Re-verified the staff hub's job → hiring → onboarding → roster →
  scheduling → Work Mode links.
- **VEN-11:** Re-verified the authenticated API-backed scheduler and persisted
  shift/request path.
- **VEN-12:** Extended central permission resolution and the role catalog for
  finance management while preserving door capability inheritance.

### 2026-07-28 — Phase 4 audit remediation (`audit-ven-13` → `audit-ven-16`)

- **VEN-13:** Re-verified canonical scoped document/equipment routes and twin
  redirects.
- **VEN-14:** Re-verified the shared versioned site-map workspace and field/list
  consumption path.
- **VEN-15:** Re-verified the canonical contextual inbox and kept legacy mock
  communication surfaces out of production navigation.
- **VEN-16:** Re-verified the canonical settings save/public-link path and
  redirected the legacy mock integration entry.
- **Result:** Phase 4 implementation pass complete. Manual SQL, hosted-schema,
  persona, accessibility, performance, offline-field, and moderated acceptance
  remain external release gates.

### 2026-07-28 — Venue lifecycle SQL operator update

- Operator reported successful manual application of the booking-lifecycle
  migration and separate concurrent index.
- Codex did not execute or inspect the hosted database.
- Added a read-only postflight companion and retained the feature gate until
  backfill, constraints, RLS, grants, indexes, persona isolation, and hosted
  environment evidence are recorded.

### 2026-09-10 — `VENUE-002`

- **Surface:** Canonical venue component tree and `VenueOperationsShell` mobile navigation
- **Purpose:** Consolidate venue-domain implementations under `app/venue/components/` without breaking legacy imports
- **Change:** Moved the live `MobileVenueNav` implementation to the canonical tree, updated the operations shell import, and retained `components/venue/mobile-venue-nav.tsx` as a compatibility re-export.
- **Integration:** The canonical venue shell now consumes the canonical component tree directly while existing shared-tree consumers continue to resolve the same export.
- **Files:** `app/venue/components/mobile-venue-nav.tsx`, `app/venue/components/operations/venue-operations-shell.tsx`, `components/venue/mobile-venue-nav.tsx`, `docs/work-packets/VENUE-002.md`
- **Verification:** Focused ESLint passed. The repository fast wrapper remains blocked by the pre-existing missing `components/ui/use-mobile.tsx`; the repository-wide type check was stopped after no diagnostics within the bounded resource window.

### 2026-09-10 — `VENUE-002` follow-up seam

- **Surface:** Venue site-map workspace
- **Purpose:** Keep the canonical venue route on the canonical component tree
- **Change:** Moved `VenueSiteMapViewer` to `app/venue/components/site-map-viewer.tsx`, updated the venue site-maps page import, and retained the legacy shared path as a compatibility re-export.
- **Integration:** The venue site-map route now resolves its venue-domain viewer from the canonical tree while preserving existing consumers of the old path.
- **Files:** `app/venue/components/site-map-viewer.tsx`, `app/venue/dashboard/site-maps/page.tsx`, `components/venue/site-map-viewer.tsx`
- **Verification:** Focused ESLint passed for the new canonical file, route import, and compatibility export.

### 2026-09-10 — `VENUE-002` event-details seam

- **Surface:** Venue event-details delete dialog
- **Purpose:** Remove a canonical-to-legacy implementation dependency from the venue event surface
- **Change:** Moved `DeleteEventDialog` implementation into `app/venue/components/event-details/delete-event-dialog.tsx`; retained the legacy nested path as a compatibility re-export.
- **Integration:** Existing canonical event headers continue importing the same local component path, while legacy consumers retain their export path.
- **Files:** `app/venue/components/event-details/delete-event-dialog.tsx`, `components/venue/venue/delete-event-dialog.tsx`
- **Verification:** Focused ESLint passed for the canonical implementation, compatibility export, and direct canonical caller.

### 2026-09-10 — `VENUE-002` staff-scheduling seam

- **Surface:** Venue staff scheduling shell
- **Purpose:** Keep the canonical venue scheduling route on the canonical component tree
- **Change:** Moved `VenueStaffSchedulerShell` to `app/venue/components/staff/venue-staff-scheduler-shell.tsx`, updated the scheduling page import, and retained the legacy shared path as a compatibility re-export.
- **Integration:** The scheduling page now resolves its shell from the canonical tree while the shell continues to consume the existing staff shifts panel contract.
- **Files:** `app/venue/components/staff/venue-staff-scheduler-shell.tsx`, `app/venue/staff/scheduling/page.tsx`, `components/venue/staff/venue-staff-scheduler-shell.tsx`
- **Verification:** Focused ESLint passed for the canonical implementation, direct caller, and compatibility export.

### 2026-09-10 — `VENUE-002` import-boundary checkpoint

- **Surface:** Remaining venue component-tree imports
- **Purpose:** Confirm the safe consolidation boundary after the direct venue callers were migrated
- **Change:** Audited remaining `@/components/venue/*` imports; none remain under `app/venue/**`. Remaining consumers are non-venue shared surfaces and were left unchanged because their interface/caller migration is outside this bounded task.
- **Integration:** All canonical `app/venue/**` callers now resolve the migrated venue components from `app/venue/components/**` or their existing canonical paths.
- **Files:** `docs/engineering/agents/venue/STATE.md`, `docs/engineering/tasks/active/VENUE-002.json`
- **Verification:** Focused ESLint and `agents:validate` passed; validator retained the unrelated RELEASE-001 warning.

### 2026-09-10 — `VENUE-002` user-role-assignment seam

- **Surface:** Venue staff user-role assignment
- **Purpose:** Keep the canonical venue RBAC assignment page on the canonical component tree
- **Change:** Moved `UserRoleAssignment` to `app/venue/components/staff/user-role-assignment.tsx`, updated the roles-permissions page import, and retained the legacy shared path as a compatibility re-export.
- **Integration:** The component continues using the existing venue role/permission APIs while the canonical page now resolves it from the canonical venue tree.
- **Files:** `app/venue/components/staff/user-role-assignment.tsx`, `app/venue/staff/roles-permissions/page.tsx`, `components/venue/staff/user-role-assignment.tsx`
- **Verification:** Focused ESLint passed for the canonical implementation, direct caller, and compatibility export.

### 2026-09-10 — `VENUE-002` staff-shifts seam

- **Surface:** Venue staff scheduling shifts panel
- **Purpose:** Remove the remaining canonical scheduler-shell dependency on the legacy component tree
- **Change:** Moved `VenueStaffShiftsPanel` to `app/venue/components/staff/venue-staff-shifts-panel.tsx`, updated the canonical scheduler shell import, and retained the legacy shared path as a compatibility re-export.
- **Integration:** The scheduler shell and its shifts panel now resolve from the canonical venue tree while preserving existing legacy consumers.
- **Files:** `app/venue/components/staff/venue-staff-shifts-panel.tsx`, `app/venue/components/staff/venue-staff-scheduler-shell.tsx`, `components/venue/staff/venue-staff-shifts-panel.tsx`
- **Verification:** Focused ESLint passed for the canonical panel, scheduler-shell import, and compatibility export.

### 2026-09-10 — `VENUE-002` role-management seam

- **Surface:** Venue staff roles and permissions
- **Purpose:** Keep the canonical venue RBAC page on the canonical component tree
- **Change:** Moved `RoleManagement` to `app/venue/components/staff/role-management.tsx`, updated the roles-permissions page import, and retained the legacy shared path as a compatibility re-export.
- **Integration:** The component continues using the existing venue RBAC APIs while the canonical page now resolves it from the canonical venue tree.
- **Files:** `app/venue/components/staff/role-management.tsx`, `app/venue/staff/roles-permissions/page.tsx`, `components/venue/staff/role-management.tsx`
- **Verification:** Focused ESLint passed for the canonical implementation, direct caller, and compatibility export.

### 2026-09-10 — `VENUE-002` shift-requests seam

- **Surface:** Venue staff scheduling shift requests
- **Purpose:** Keep the scheduling page's persisted swap/drop/pickup request UI on the canonical component tree
- **Change:** Moved `ShiftRequests` to `app/venue/components/staff/shift-requests.tsx`, updated the scheduling page import, and retained the legacy shared path as a compatibility re-export.
- **Integration:** The component continues reading the venue-scoped shift request APIs while the scheduling route now resolves it from the canonical tree.
- **Files:** `app/venue/components/staff/shift-requests.tsx`, `app/venue/staff/scheduling/page.tsx`, `components/venue/staff/shift-requests.tsx`
- **Verification:** Focused ESLint passed for the canonical implementation, direct caller, and compatibility export.

### 2026-09-10 — `VENUE-002` shift-templates seam

- **Surface:** Venue staff scheduling shift templates
- **Purpose:** Keep the scheduling page's persisted shift-template UI on the canonical component tree
- **Change:** Moved `ShiftTemplates` to `app/venue/components/staff/shift-templates.tsx`, updated the scheduling page import, and retained the legacy shared path as a compatibility re-export.
- **Integration:** The component continues reading the scoped `venue_shift_templates` source while the scheduling route now resolves it from the canonical tree.
- **Files:** `app/venue/components/staff/shift-templates.tsx`, `app/venue/staff/scheduling/page.tsx`, `components/venue/staff/shift-templates.tsx`
- **Verification:** Focused ESLint passed for the canonical implementation, direct caller, and compatibility export.

### 2026-09-10 — `VENUE-003`

- **Surface:** Venue booking-request lifecycle contract
- **Purpose:** Give venue operators and dependent surfaces one explicit, regression-tested booking state machine.
- **Change:** Made the six-state transition matrix and terminal-state contract explicit, hardened canonical-status detection, and documented legacy status compatibility, revision checks, idempotency, and the database RPC boundary.
- **Integration:** The TypeScript contract mirrors the existing `transition_venue_booking_lifecycle` RPC used by the venue booking API and event confirmation path; hosted SQL/RLS acceptance remains a release gate.
- **Files:** `lib/venue/booking-lifecycle.ts`, `__tests__/venue/booking-lifecycle.test.ts`, `docs/engineering/agents/venue/BOOKING_LIFECYCLE.md`, `docs/work-packets/VENUE-003.md`
- **Verification:** Lifecycle tests 6/6 passed; lifecycle plus reservation tests 15/15 passed; focused ESLint passed. Repository fast wrapper remains blocked by the pre-existing missing `components/ui/use-mobile.tsx`.
