# Venue Pages Builder — Inventory

Seeded from `VenueOperationsShell`, [`docs/audits/venue-canonical-ia.md`](../../docs/audits/venue-canonical-ia.md), and `app/venue/**` + `app/venues/**` + admin venues crawl (2026-07-19).

Status of work lives in [PROGRESS.md](PROGRESS.md).

---

## 1. Foundation / shell

| ID | Route / surface | Path |
|----|-----------------|------|
| `ven-entry` | `/venue` redirect | `app/venue/page.tsx` |
| `ven-shell` | `VenueOperationsShell` | `app/venue/components/operations/venue-operations-shell.tsx` |
| `ven-layout` | Venue layout / gate | `app/venue/layout.tsx` |
| `ven-current-venue` | `useCurrentVenue` + service | `app/venue/hooks/useCurrentVenue.ts`, `lib/services/venue.service.ts` |
| `ven-mobile-nav` | Mobile venue nav | `components/venue/mobile-venue-nav.tsx` |

## 2. Command core

| ID | Route / surface | Path |
|----|-----------------|------|
| `ven-dashboard` | `/venue/dashboard` | `app/venue/dashboard/page.tsx` |
| `ven-bookings` | `/venue/bookings` | `app/venue/bookings/page.tsx` |
| `ven-calendar` | `/venue/dashboard/calendar` | `app/venue/dashboard/calendar/page.tsx` |
| `ven-events` | `/venue/events` | `app/venue/events/page.tsx` |
| `ven-events-id` | `/venue/events/[id]` | `app/venue/events/[id]/page.tsx` |
| `ven-events-checkin` | `/venue/events/[id]/check-in` | `app/venue/events/[id]/check-in/page.tsx` |
| `ven-messages` | `/venue/messages` | `app/venue/messages/page.tsx` |

## 3. Commerce

| ID | Route / surface | Path |
|----|-----------------|------|
| `ven-tickets` | `/venue/dashboard/tickets` | `app/venue/dashboard/tickets/page.tsx` |
| `ven-tickets-checkin-view` | Tickets `?view=check-in` | same page / query view |
| `ven-finances` | `/venue/finances` | `app/venue/finances/page.tsx` |
| `ven-analytics` | `/venue/analytics` | `app/venue/analytics/page.tsx` |

## 4. Physical venue

| ID | Route / surface | Path |
|----|-----------------|------|
| `ven-overview` | `/venue/overview` | `app/venue/overview/page.tsx` |
| `ven-edit` | `/venue/edit` | `app/venue/edit/page.tsx` |
| `ven-settings` | `/venue/settings` | `app/venue/settings/page.tsx` |
| `ven-profile-content` | `/venue/profile/content` | `app/venue/profile/content/page.tsx` |
| `ven-profile-professions` | `/venue/profile/professions` | `app/venue/profile/professions/page.tsx` |
| `ven-username` | `/venue/[username]` | `app/venue/[username]/page.tsx` |
| `ven-documents` | `/venue/documents` | `app/venue/documents/page.tsx` |
| `ven-equipment` | `/venue/equipment` | `app/venue/equipment/page.tsx` |
| `ven-site-maps` | `/venue/dashboard/site-maps` | `app/venue/dashboard/site-maps/page.tsx` |

## 5. Multi-venue CRUD

| ID | Route / surface | Path |
|----|-----------------|------|
| `ven-venues-list` | `/venue/dashboard/venues` | `app/venue/dashboard/venues/page.tsx` |
| `ven-venues-create` | `/venue/dashboard/venues/create` | `app/venue/dashboard/venues/create/page.tsx` |
| `ven-venues-id` | `/venue/dashboard/venues/[id]` | `app/venue/dashboard/venues/[id]/page.tsx` |
| `ven-venues-edit` | `/venue/dashboard/venues/[id]/edit` | `app/venue/dashboard/venues/[id]/edit/page.tsx` |
| `ven-venues-booking` | `/venue/dashboard/venues/[id]/booking-request` | `app/venue/dashboard/venues/[id]/booking-request/page.tsx` |

## 6. Workforce

| ID | Route / surface | Path |
|----|-----------------|------|
| `ven-staff` | `/venue/staff` | `app/venue/staff/page.tsx` |
| `ven-staff-scheduling` | `/venue/staff/scheduling` | `app/venue/staff/scheduling/page.tsx` |
| `ven-staff-roles` | `/venue/staff/roles-permissions` | `app/venue/staff/roles-permissions/page.tsx` |
| `ven-staff-enhanced` | `/venue/staff/enhanced-staff-management` | `app/venue/staff/enhanced-staff-management/page.tsx` |
| `ven-jobs` | `/venue/dashboard/jobs` | `app/venue/dashboard/jobs/page.tsx` |
| `ven-hiring-kanban` | `/venue/dashboard/hiring-kanban` | `app/venue/dashboard/hiring-kanban/page.tsx` |
| `ven-onboarding` | `/venue/dashboard/onboarding` | `app/venue/dashboard/onboarding/page.tsx` |
| `ven-teams` | `/venue/dashboard/teams` | `app/venue/dashboard/teams/page.tsx` |
| `ven-crew-profiles` | `/venue/dashboard/teams/crew-profiles` | `app/venue/dashboard/teams/crew-profiles/page.tsx` |

## 7. Public surfaces

| ID | Route / surface | Path |
|----|-----------------|------|
| `pub-venues` | `/venues` | `app/venues/page.tsx` |
| `pub-venues-slug` | `/venues/[slug]` | `app/venues/[slug]/page.tsx` |
| `pub-venues-booking` | `/venues/[slug]/booking-request` | `app/venues/[slug]/booking-request/page.tsx` |

## 8. Admin bridge

| ID | Route / surface | Path |
|----|-----------------|------|
| `adm-venues` | `/admin/dashboard/venues` | `app/admin/dashboard/venues/page.tsx` |
| `adm-venues-id` | `/admin/dashboard/venues/[id]` | `app/admin/dashboard/venues/[id]/page.tsx` |

## 9. Redirect / twin / debt routes

Confirm redirect or improve; mark `wont-fix` only with rationale.

| ID | Route / surface | Path | Notes |
|----|-----------------|------|-------|
| `twin-tickets` | `/venue/tickets` | `app/venue/tickets/page.tsx` | → dashboard/tickets |
| `twin-site-maps` | `/venue/site-maps` | `app/venue/site-maps/page.tsx` | → dashboard/site-maps |
| `twin-assets` | `/venue/assets` | `app/venue/assets/page.tsx` | → equipment |
| `twin-manage-event` | `/venue/manage-event/[id]` | `app/venue/manage-event/[id]/page.tsx` | → events/[id] |
| `twin-dash-settings` | `/venue/dashboard/settings` | `app/venue/dashboard/settings/page.tsx` | → /venue/settings |
| `twin-dash-analytics` | `/venue/dashboard/analytics` | `app/venue/dashboard/analytics/page.tsx` | → /venue/analytics |
| `twin-dash-equipment` | `/venue/dashboard/equipment` | `app/venue/dashboard/equipment/page.tsx` | → /venue/equipment |
| `twin-dash-documents` | `/venue/dashboard/documents` | `app/venue/dashboard/documents/page.tsx` | → /venue/documents |
| `twin-dash-events` | `/venue/dashboard/events` | `app/venue/dashboard/events/page.tsx` | Twin of /venue/events |
| `twin-dash-events-map` | `/venue/dashboard/events/map` | `app/venue/dashboard/events/map/page.tsx` | |
| `twin-dash-dashboard` | `/venue/dashboard/dashboard` | `app/venue/dashboard/dashboard/page.tsx` | Nested oddity |
| `twin-dash-dashboard-settings` | `/venue/dashboard/dashboard/settings` | `app/venue/dashboard/dashboard/settings/page.tsx` | |
| `debt-explore` | `/venue/dashboard/explore` | `app/venue/dashboard/explore/page.tsx` | Social/creator debt |
| `debt-features` | `/venue/dashboard/features` | `app/venue/dashboard/features/page.tsx` | |
| `debt-feed` | `/venue/dashboard/feed` | `app/venue/dashboard/feed/page.tsx` | |
| `debt-gallery` | `/venue/dashboard/gallery` | `app/venue/dashboard/gallery/page.tsx` | |
| `debt-groups` | `/venue/dashboard/groups` | `app/venue/dashboard/groups/page.tsx` | |
| `debt-integrations` | `/venue/dashboard/integrations` | `app/venue/dashboard/integrations/page.tsx` | |
| `debt-moderation` | `/venue/dashboard/moderation` | `app/venue/dashboard/moderation/page.tsx` | |
| `debt-music` | `/venue/dashboard/music` | `app/venue/dashboard/music/page.tsx` | |
| `debt-network` | `/venue/dashboard/network` | `app/venue/dashboard/network/page.tsx` | |
| `debt-network-feed` | `/venue/dashboard/network-feed` | `app/venue/dashboard/network-feed/page.tsx` | |
| `debt-epk` | `/venue/dashboard/epk` | `app/venue/dashboard/epk/page.tsx` | |
| `debt-promotions` | `/venue/dashboard/promotions` | `app/venue/dashboard/promotions/page.tsx` | |
| `debt-store` | `/venue/dashboard/store` | `app/venue/dashboard/store/page.tsx` | |
| `debt-social` | `/venue/dashboard/social` | `app/venue/dashboard/social/page.tsx` | |
| `debt-social-hashtag` | `/venue/dashboard/social/hashtag/[tag]` | `app/venue/dashboard/social/hashtag/[tag]/page.tsx` | |
| `debt-posts-id` | `/venue/dashboard/posts/[id]` | `app/venue/dashboard/posts/[id]/page.tsx` | |
| `debt-profile-username` | `/venue/dashboard/profile/[username]` | `app/venue/dashboard/profile/[username]/page.tsx` | |
| `debt-profile-posts` | `/venue/dashboard/profile/[username]/posts` | `app/venue/dashboard/profile/[username]/posts/page.tsx` | |

## 10. Component consolidation / adjacent

| ID | Surface | Path / notes |
|----|---------|--------------|
| `cmp-legacy-sidebars` | Legacy sidebars | `venue-sidebar.tsx`, `venue-owner-sidebar.tsx`, `components/venue/navigation/*` |
| `cmp-venue-tree-dupe` | `components/venue/**` vs `app/venue/components/**` | Deduplicate / pick canonical |
| `cmp-venue-chrome` | Dashboard venue chrome tokens | `components/dashboard/venue-*.tsx` |
| `cmp-equipment` | Equipment management | `components/venue/equipment-management.tsx` |
| `cmp-hiring-kanban` | Shared hiring kanban | `components/hiring/venue-hiring-kanban.tsx` |
| `cmp-discover-card` | Discover venue card | `components/discover/discover-venue-card.tsx` |
| `cmp-onboarding` | Venue onboarding | `components/onboarding/venue-onboarding.tsx`, profile-setup |
| `cmp-public-profile` | Public profile pieces | `components/venue/venue-profile/**` |

## Walk order

Process sections 1 → 10, top-to-bottom within each section, unless resuming mid-list via Current pointer.
