# Tourify Venue Account Audit

Date: 2026-06-30
Scope: Read-only audit of the Venue account, venue routes, visible features, workforce model, components, APIs, and completion status.

## Account purpose

The Venue account helps a venue owner or manager operate a physical venue. It should manage venue profile, bookings, hosted events, venue-created events, event collaboration with Admin organizations and Artists, venue-side staff/crew/volunteers, shifts, tasks, documents, equipment, site maps, finances, analytics, and communications.

Venue has its own hiring/workforce tools. A Venue should manage the people needed to run the venue and venue-hosted events, even when the event is hosted by an Admin organization or booked by an Artist. Venue can collaborate with those accounts, but Venue workforce control should remain venue-owned unless permission is explicitly granted.

## Inventory

| Metric | Count |
|---|---:|
| Page routes | 61 |
| Venue-labeled API routes | 5 |
| Distinct routed component imports | 134 |
| Core visible Venue owner/sidebar items | 59 |
| Venue feature grid items | 36 |
| Route-local Venue component files under `app/venue/components` | 209 |
| Shared Venue component files under `components/venue` | 230 |
| Page-level marker hits | mock: 95, placeholder: 222, comingSoon: 7, fallback: 89 |

## Visible components and purpose

| Visible component group | Count | Purpose | Status |
|---|---:|---|---|
| Venue owner sidebar main menu | 4 | Dashboard, bookings, events, analytics | Partial |
| Venue operations menu | 4 | Staff management, finances, inventory, maintenance | Partial |
| Customer management | 3 | CRM, marketing, reviews and feedback | Shell/Partial |
| Venue management | 4 | Venue profile, amenities, equipment, gallery | Partial |
| Resources | 4 | Documents, messages, reports, settings | Partial |
| Quick actions | 3 | Create event, view analytics, notifications | Partial |
| Tourify platform links | 4 | Discover artists, ticket marketplace, network, help | Shell |
| Venue feature grid | 36 | Broad feature discovery surface | Shell/Mislinked |
| Venue workforce/hiring routes | 5+ | Jobs, hiring kanban, teams, crew profiles, onboarding | Partial and underconnected |

## Venue feature route health

The Venue feature grid contains 36 items. 10 resolve to existing page routes and 26 are missing or generic/mislinked:

- `/music/upload`
- `/music/library`
- `/music/analytics`
- `/music/promotion`
- `/music/playlists`
- `/music/distribution`
- `/content/posts`
- `/content/videos`
- `/content/photos`
- `/epk`
- `/content/blog`
- `/content/podcasts`
- `/tickets`
- `/merch`
- `/promotions`
- `/payments`
- `/subscriptions`
- `/licensing`
- `/network`
- `/groups`
- `/collaborations`
- `/fans`
- `/analytics/audience`
- `/analytics/content`
- `/analytics/revenue`
- `/help`

The Venue owner sidebar has 13 route-style links. 10 resolve and 3 analytics subroutes are missing:

- `/venue/analytics/events`
- `/venue/analytics/finances`
- `/venue/analytics/audience`

## Page route inventory

Venue root, public, profile, settings:

- `/venue`
- `/venue/[username]`
- `/venue/overview`
- `/venue/settings`
- `/venue/edit`
- `/venues`
- `/venues/[slug]`
- `/venue/profile/content`
- `/venue/profile/professions`

Venue dashboard shell and core pages:

- `/venue/dashboard`
- `/venue/dashboard/dashboard`
- `/venue/dashboard/dashboard/settings`
- `/venue/dashboard/analytics`
- `/venue/dashboard/calendar`
- `/venue/dashboard/settings`
- `/venue/dashboard/explore`
- `/venue/dashboard/features`

Venue bookings, events, tickets:

- `/venue/bookings`
- `/venue/events/[id]`
- `/venue/manage-event/[id]`
- `/venue/dashboard/events`
- `/venue/dashboard/events/map`
- `/venue/dashboard/tickets`

Venue profile and venue management:

- `/venue/dashboard/venues`
- `/venue/dashboard/venues/[id]`
- `/venue/dashboard/venues/[id]/booking-request`
- `/venue/dashboard/venues/[id]/edit`
- `/venue/dashboard/venues/create`
- `/venue/dashboard/profile/[username]`
- `/venue/dashboard/profile/[username]/posts`

Venue workforce and hiring:

- `/venue/dashboard/jobs`
- `/venue/dashboard/hiring-kanban`
- `/venue/dashboard/onboarding`
- `/venue/dashboard/teams`
- `/venue/dashboard/teams/crew-profiles`
- `/venue/staff`
- `/venue/staff/enhanced-staff-management`
- `/venue/staff/roles-permissions`
- `/venue/staff/scheduling`

Venue operations, resources, social, content:

- `/venue/analytics`
- `/venue/assets`
- `/venue/documents`
- `/venue/equipment`
- `/venue/finances`
- `/venue/dashboard/documents`
- `/venue/dashboard/equipment`
- `/venue/dashboard/epk`
- `/venue/dashboard/feed`
- `/venue/dashboard/gallery`
- `/venue/dashboard/groups`
- `/venue/dashboard/integrations`
- `/venue/dashboard/moderation`
- `/venue/dashboard/music`
- `/venue/dashboard/network`
- `/venue/dashboard/network-feed`
- `/venue/dashboard/posts/[id]`
- `/venue/dashboard/promotions`
- `/venue/dashboard/site-maps`
- `/venue/dashboard/social`
- `/venue/dashboard/social/hashtag/[tag]`
- `/venue/dashboard/store`

## API/data dependency inventory

Venue has only 5 venue-labeled API routes:

- `/api/venue/onboarding/summary`
- `/api/venue/shifts`
- `/api/venues`
- `/api/venues/[id]`
- `/api/venues/delete`

Venue also appears to rely on shared/general APIs for jobs, hiring, events, bookings, messages, site maps, ticketing, marketplace, and analytics. This makes the Venue surface look broad in the UI but comparatively thin in dedicated backend ownership.

## Component implementation inventory

Venue has the largest component footprint and the most duplication:

- `components/venue`: 230 files
- `app/venue/components`: 209 route-local files
- Venue pages import 134 distinct routed components/helpers.

This is a consolidation risk. Multiple sidebars/navigation grids exist with overlapping labels and inconsistent routes.

## Completion estimate

Venue completion: 40-45%.

Venue has many visible screens and component files, but too many are duplicated, mock-backed, or mislinked. The product direction is large and valuable; the implementation needs consolidation around a canonical Venue dashboard, canonical Venue navigation, dedicated Venue workforce APIs, and clear collaboration boundaries with Artist/Admin.

## Missing or not fully built

- Venue-owned hiring/workforce flow from job post to approval to onboarding to Work Mode.
- Dedicated Venue workforce data model/API ownership or a clearly shared hiring service scoped by venue.
- Venue staff/crew/volunteer permissions and role templates.
- Venue-to-Admin and Venue-to-Artist collaboration model for hosted/booked events.
- Repair or remove generic creator links in Venue feature grid.
- Replace mock venue/dashboard data with real venue profile, bookings, events, finances, and workforce data.
- Consolidate duplicated Venue component trees.
- Complete venue analytics subroutes or retarget sidebar links.

## Recommended next steps

1. Define Venue workforce scope: venue staff, event crew, volunteers, shifts, tasks, onboarding, documents, and permissions.
2. Build or connect Venue hiring APIs using the same worker-facing Work Mode foundation as Admin hiring.
3. Normalize all Venue navigation to `/venue/...` or `/venue/dashboard/...` routes.
4. Replace the generic Venue feature grid with Venue-specific operational tools.
5. Consolidate `components/venue` and `app/venue/components` into a canonical structure.
6. Build collaboration rules for Admin-hosted events and Artist-booked events at the Venue.

