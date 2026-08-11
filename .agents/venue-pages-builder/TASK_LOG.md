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
