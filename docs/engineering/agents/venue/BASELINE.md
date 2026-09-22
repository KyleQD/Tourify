# Venue domain baseline

Generated: 2026-09-09 from VENUE-001 read-only audit.

## What the venue area contains today

### Web pages — 70+ routes

**Account / dashboard shell**
- `app/venue/page.tsx` — root redirect to dashboard
- `app/venue/layout.tsx` — venue ops layout, login redirect gate
- `app/venue/dashboard/page.tsx` — canonical action-first dashboard
- `app/venue/dashboard/layout.tsx` — main layout (MainLayout)
- `app/venue/dashboard/onboarding/page.tsx` — onboarding checklist

**Bookings & calendar**
- `app/venue/bookings/page.tsx` — booking request management (BookingsPage)
- `app/venue/dashboard/calendar/page.tsx` — merged calendar view

**Events & check-in**
- `app/venue/events/page.tsx` — events list/calendar hub
- `app/venue/events/[id]/page.tsx` — event operations detail (VenueEventOpsPage)
- `app/venue/events/[id]/check-in/page.tsx` — door check-in (VenueEventCheckInPage)
- `app/venue/manage-event/[id]/page.tsx` — redirect to events/[id]

**Ticketing & finances**
- `app/venue/dashboard/tickets/page.tsx` — event-scoped ticket workspace (TicketsPage)
- `app/venue/tickets/page.tsx` — canonical ticket surface (VenueTicketsCanonicalPage)
- `app/venue/finances/page.tsx` — tenant-scoped finance view (FinancesPage)
- `app/venue/analytics/page.tsx` — analytics dashboard (AnalyticsPage)

**Profile & public surfaces**
- `app/venues/page.tsx` — public directory listing
- `app/venues/[slug]/page.tsx` — public venue profile (VenueProfileClient)
- `app/venues/[slug]/booking-request/page.tsx` — public booking form
- `app/venue/edit/page.tsx` — venue profile editor
- `app/venue/overview/page.tsx` — ops overview with quick links
- `app/venue/[username]/page.tsx` — redirect to public profile

**Workforce**
- `app/venue/staff/page.tsx` — staff hub (VenueStaffPage)
- `app/venue/staff/scheduling/page.tsx` — shift scheduler
- `app/venue/staff/roles-permissions/page.tsx` — role management
- `app/venue/dashboard/jobs/page.tsx` — job postings
- `app/venue/dashboard/hiring-kanban/page.tsx` — hiring pipeline (VenueHiringKanbanPage)

**Operations**
- `app/venue/documents/page.tsx` — document management
- `app/venue/equipment/page.tsx` — equipment inventory
- `app/venue/dashboard/site-maps/page.tsx` — site maps workspace
- `app/venue/site-maps/page.tsx` — canonical site maps
- `app/venue/settings/page.tsx` — settings with public link preview
- `app/venue/kit/page.tsx` — venue kit page (VenueKitPage)
- `app/venue/messages/page.tsx` — contextual inbox

**Deprecated / redirect routes (29)** — All marked `done` in legacy progress:
- `app/venue/dashboard/events/`, `app/venue/dashboard/explore/`, `app/venue/dashboard/features/`, `app/venue/dashboard/feed/`, `app/venue/dashboard/gallery/`, `app/venue/dashboard/groups/`, `app/venue/dashboard/integrations/`, `app/venue/dashboard/moderation/`, `app/venue/dashboard/music/`, `app/venue/dashboard/network/`, `app/venue/dashboard/network-feed/`, `app/venue/dashboard/epk/`, `app/venue/dashboard/promotions/`, `app/venue/dashboard/store/`, `app/venue/dashboard/social/`, `app/venue/dashboard/posts/[id]/`, `app/venue/dashboard/profile/[username]/`, `app/venue/assets/`, `app/venue/dashboard/settings/`, `app/venue/dashboard/analytics/`, `app/venue/dashboard/equipment/`, `app/venue/dashboard/dashboard/`, `app/venue/profile/content/`, `app/venue/profile/professions/`

### API routes — 45+ venue-specific handlers

**Under `app/api/venue/` (38 routes):**
- `analytics` + `export` — GET, tenant-scoped
- `booking-requests` — GET, PATCH
- `current` — GET current venue
- `documents/[id]` + `bulk-delete` — GET, DELETE
- `equipment` — CRUD
- `events` + `[id]` + `[id]/ticketing-setup` — CRUD + setup
- `finances` + `export` + `payout` — CRUD
- `hiring` + `applications` + `applications/[id]` + `audit` + `job-postings` + `job-postings/[id]` — hiring lifecycle
- `integrations` — GET, POST
- `notification-routing` — GET, PATCH
- `onboarding/summary` — GET
- `permissions` — GET
- `roles` + `[id]` — CRUD
- `shifts` + `[id]` + `assignments` + `requests` + `swaps` — full scheduling
- `site-maps/[id]` + `save` — GET, PUT
- `staff-onboarding` — GET, POST
- `staff-profiles` — GET
- `team` — CRUD
- `ticketing` — GET
- `user-roles` + `[userId]/[roleId]` — CRUD

**Under `app/api/venues/` (5 routes):**
- `venues` — GET, POST, PUT (full CRUD)
- `venues/[id]` — DELETE, GET, PUT
- `venues/[id]/reviews` — GET, PATCH, POST
- `venues/[id]/venue-kit` — GET
- `venues/delete` — DELETE

**Admin-facing venue routes (4):**
- `app/api/admin/venues` — GET, POST
- `app/api/admin/venues/[id]` — GET, PATCH
- `app/api/admin/tours/venues` — GET
- `app/api/admin/staff/` — venue-indicated

**Other cross-domain venue references:**
- `app/api/booking-requests/` — GET, PATCH, POST (shared)
- `app/api/planning/venues/search` — GET
- `app/api/tours/planner/venues` — GET
- `app/api/test-venues` — GET (debug)

### Database objects

**32 venue-prefixed tables:**
- Core: `venues`, `venues_v2`, `venue_profiles`, `venue_contacts`, `venue_slug_history`, `venue_identity_bridges`
- Bookings: `venue_booking_requests`, `venue_booking_lifecycle_history`, `venue_booking_slots`, `venue_reservations`, `venue_availability`
- Workforce: `venue_team_members`, `venue_crew_members`, `venue_team_contractors`, `venue_shifts`, `venue_shift_assignments`, `venue_recurring_shifts`, `venue_recurring_templates`
- RBAC: `venue_roles`, `venue_role_permissions`, `venue_permissions`
- Operations: `venue_documents`, `venue_equipment`, `venue_kit_settings`, `venue_manual_transactions`
- Analytics: `venue_analytics`, `venue_reviews`, `venue_pricing`
- Lifecycle: `venue_ownership_transfers`
- Social/Integration: `venue_social_integrations`, `venue_social_integration_secrets`
- Workflow: `venue_workflow_subscriptions`

**Views (3):**
- `entities_venues` — entity view
- `public_venue_availability` — public availability
- `venue_identity_bridge_audit` — audit trail

**Key functions (30+):**
- Lifecycle: `create_venue_account`, `archive_venue_profile`, `unarchive_venue_profile`, `delete_venue_profile`, `preflight_venue_archive`, `write_venue_lifecycle_audit`
- Ownership: `request_venue_ownership_transfer`, `accept_venue_ownership_transfer`, `cancel_venue_ownership_transfer`, `expire_stale_venue_transfers`, `venue_is_owner`
- RBAC: `has_entity_permission` (SECURITY DEFINER), `venue_has_operator_access`, `venue_is_owner`
- Booking: `create_venue_reservation`, `release_venue_reservation`, `transition_venue_booking_lifecycle`, `sync_booking_legacy_status`, `close_slot_on_request_approval`
- Search: `search_public_venues`
- Sync: `sync_venue_public_profile_setting`, `record_venue_slug_rename`, `normalize_venue_amenity_key`
- Analytics: `refresh_venue_analytics_daily`, `get_venue_image_url`, `update_venue_kit_settings_updated_at`
- Hiring: `hire_venue_candidate`, `generate_slots_for_template`

**Staged (unapplied) migration — WS-1.1:**
- `20260823210100_venues_rbac_rls_baseline.sql` — enables RLS on venues + RBAC family, scoped policies, `has_entity_permission` SECURITY DEFINER replacement

### Components — 100+ venue TSX files

Located in two trees:
- `app/venue/components/` — 95+ files (canonical operational components)
- `components/venue/` — additional shared components

Key component families:
- Event operations: `event-details/`, `events-view.tsx`, `event-details-modal.tsx`, `create-event-modal.tsx`
- Ticketing: `tickets/box-office-panel.tsx`, `tickets/guestlist-panel.tsx`, `tickets/orders-panel.tsx`, `tickets/ticket-setup-wizard.tsx`
- Teams: `teams/team-roles-permissions.tsx`, `teams/team-shift-scheduler.tsx`, `teams/team-task-list.tsx`, `teams/crew-profile-manager.tsx`
- Staff: `staff-communications.tsx`, `staff-scheduler.tsx`, `staff/` directory (14 files)
- Financial: `financial-dashboard.tsx`, `financial-management.tsx`
- Analytics: `venue-analytics-dashboard.tsx`, `venue-analytics-summary.tsx`, `venue-analytics.tsx`
- Booking: `booking-calendar.tsx`, `booking-details-modal.tsx`, `venue-booking-form.tsx`, `venue-booking-requests.tsx`
- Equipment: `equipment-management.tsx`, `equipment-qr-generator.tsx`, `equipment-qr-scanner.tsx`
- Music: `music/music-analytics.tsx`, `music/music-library.tsx`, `music/music-player.tsx`
- Attendance: `attendance/attendance-analytics.tsx`, `attendance/attendance-tracker.tsx`, `attendance/qr-code-scanner.tsx`
- Onboarding: `venue/dashboard/onboarding/page.tsx` (VenueOnboardingPage)

### Services / lib

- `lib/services/venue.service.ts` — venue CRUD + profile operations
- `app/venue/hooks/useCurrentVenue.ts` — active venue context hook
- `app/venue/context/profile-context.tsx` — ProfileProvider
- `app/venue/providers.tsx` — VenueProviders wrapper

### Tests

No dedicated `__tests__/venue/` directory found. Testing evidence exists only via:
- Legacy venue-pages-builder audit modules (audit-ven-01 through audit-ven-16)
- Indirect coverage through shared API/service tests

### Evidence base

- Legacy specialist: `.agents/venue-pages-builder/` — 87/87 items `done`, 16/16 audit modules `done` (2026-07-28)
- Phase 4 external gates still open: manual SQL, persona, accessibility, performance, offline-field, moderated acceptance

## Intended direction

Per `docs/DEVELOPMENT_BACKLOG.md`:

1. **WS-1.1 Database foundation** — Venues/RBAC RLS baseline staged, needs gated pipeline application
2. **WS-1.2 Transactions everywhere** — Booking lifecycle has staged migration, long-term goal: move credential issuance server-side
3. **WS-1.7 Admin guard sweep** — Venue routes use multiple authorization idioms; standardize to one
4. **WS-2.1 Nav/link/API contract sweep** — One live dead link found and fixed; link-integrity CI still wanted
5. **WS-2.3 Endpoint consolidation** — Profile update and search have duplicate families to collapse
6. **WS-3.1 Data-access modernization** — Adopt React Query on venue dashboards; reduce `'use client'` saturation
7. **WS-3.4 Caching/CDN** — ISR/cache-headers for public `/venues/[slug]` profiles
8. **Phase 4 debt** — Venue component trees (dual locations), navigation, loading/error primitives need deduplication
