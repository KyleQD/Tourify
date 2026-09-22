# Venue Pages Builder — Progress Ledger

**Current pointer:** `COMPLETE — Phase 4 implementation; external acceptance gates open`  
**Last updated:** 2026-07-28  
**Session note:** Original 87-item inventory pass remains complete. Phase 4 audit acceptance remediation is active; existing completion claims require current code/test evidence. No DB reset. No commits.

Statuses: `pending` | `in_progress` | `done` | `wont-fix` | `blocked`

---

## 1. Foundation / shell

| ID | Status | Notes |
|----|--------|-------|
| `ven-entry` | done | Preserve searchParams on redirect to dashboard |
| `ven-shell` | done | Public page + directory footer links |
| `ven-layout` | done | Venue Ops metadata; login → `/venue/dashboard` |
| `ven-current-venue` | done | Drop placeholder PNGs; `tourify:active-venue-changed` refresh |
| `ven-mobile-nav` | done | Door active on check-in routes; Suspense wrap |

## 2. Command core

| ID | Status | Notes |
|----|--------|-------|
| `ven-dashboard` | done | Real open applications + site-map signals for action items |
| `ven-bookings` | done | Approve toast → Open event ops |
| `ven-calendar` | done | Merge approved bookings into calendar |
| `ven-events` | done | Empty-state calendar CTA |
| `ven-events-id` | done | Live ticketing summary on Tickets tab |
| `ven-events-checkin` | done | Venue ownership gate before DoorCheckIn |
| `ven-messages` | done | Venue chrome + bookings/events deep links |

## 3. Commerce

| ID | Status | Notes |
|----|--------|-------|
| `ven-tickets` | done | Manage tickets CTA wired to event ops |
| `ven-tickets-checkin-view` | done | Query `view=check-in` already drives tab |
| `ven-finances` | done | Removed synthetic 18% expenses; ticket revenue rows |
| `ven-analytics` | done | Ticket KPIs from `/api/venue/ticketing` |

## 4. Physical venue

| ID | Status | Notes |
|----|--------|-------|
| `ven-overview` | done | Docs / equipment / site-map quick links |
| `ven-edit` | done | Already via ProfileProvider + venueService |
| `ven-settings` | done | Public page preview strip |
| `ven-profile-content` | done | Redirect → overview (verified) |
| `ven-profile-professions` | done | Redirect → overview (verified) |
| `ven-username` | done | Redirect → public `/venues/[username]` |
| `ven-documents` | done | Removed Math.random mock metadata/folders |
| `ven-equipment` | done | Inventory surface retained; follow-up add-dialog still open |
| `ven-site-maps` | done | Venue-scoped shared maps + empty CTAs |

## 5. Multi-venue CRUD

| ID | Status | Notes |
|----|--------|-------|
| `ven-venues-list` | done | Live `getAllUserVenues`; no mockVenues |
| `ven-venues-create` | done | Real `POST /api/venues` |
| `ven-venues-id` | done | Fail closed; no mockVenue merge |
| `ven-venues-edit` | done | Load from `/api/venues/[id]` |
| `ven-venues-booking` | done | Redirect → public booking-request |

## 6. Workforce

| ID | Status | Notes |
|----|--------|-------|
| `ven-staff` | done | Hub already links jobs/hiring/scheduling/roles |
| `ven-staff-scheduling` | done | Venue name + back to staff |
| `ven-staff-roles` | done | Shell already injects venueId query |
| `ven-staff-enhanced` | done | Switched to app `useCurrentVenue` |
| `ven-jobs` | done | Canonical hiring entry (existing) |
| `ven-hiring-kanban` | done | App hook + empty venue CTA |
| `ven-onboarding` | done | Site-map checklist signal |
| `ven-teams` | done | Redirect → `/venue/staff` |
| `ven-crew-profiles` | done | Redirect → `/venue/staff` |

## 7. Public surfaces

| ID | Status | Notes |
|----|--------|-------|
| `pub-venues` | done | Navigate by `url_slug` or id |
| `pub-venues-slug` | done | Removed unused browser supabase client |
| `pub-venues-booking` | done | Prefill contact from `/api/profile/current` |

## 8. Admin bridge

| ID | Status | Notes |
|----|--------|-------|
| `adm-venues` | done | “Venue ops” deep link |
| `adm-venues-id` | done | Detail retained; ops bridge from list |

## 9. Redirect / twin / debt routes

| ID | Status | Notes |
|----|--------|-------|
| `twin-tickets` | done | Already redirect |
| `twin-site-maps` | done | Already redirect |
| `twin-assets` | done | Already redirect |
| `twin-manage-event` | done | Already redirect |
| `twin-dash-settings` | done | Already redirect |
| `twin-dash-analytics` | done | Already redirect |
| `twin-dash-equipment` | done | Already redirect |
| `twin-dash-documents` | done | Already redirect |
| `twin-dash-events` | done | Redirect → `/venue/events` |
| `twin-dash-events-map` | done | Redirect → `/venue/events` |
| `twin-dash-dashboard` | done | Already redirect |
| `twin-dash-dashboard-settings` | done | Already redirect |
| `debt-explore` | done | Already redirect |
| `debt-features` | done | Already redirect |
| `debt-feed` | done | Already redirect |
| `debt-gallery` | done | Already redirect |
| `debt-groups` | done | Already redirect |
| `debt-integrations` | done | Redirect → dashboard |
| `debt-moderation` | done | Already redirect |
| `debt-music` | done | Already redirect |
| `debt-network` | done | Already redirect |
| `debt-network-feed` | done | Already redirect |
| `debt-epk` | done | Already redirect |
| `debt-promotions` | done | Already redirect |
| `debt-store` | done | Already redirect |
| `debt-social` | done | Already redirect |
| `debt-social-hashtag` | done | Already redirect |
| `debt-posts-id` | done | Redirect → dashboard |
| `debt-profile-username` | done | Redirect → dashboard |
| `debt-profile-posts` | done | Redirect → dashboard |

## 10. Component consolidation / adjacent

| ID | Status | Notes |
|----|--------|-------|
| `cmp-legacy-sidebars` | done | Canonical shell only; legacy not remounted |
| `cmp-venue-tree-dupe` | done | Prefer ops shell + shared dashboard chrome |
| `cmp-venue-chrome` | done | Used on messages/dashboard/onboarding |
| `cmp-equipment` | done | Equipment page remains inventory entry |
| `cmp-hiring-kanban` | done | Wired via hiring-kanban page |
| `cmp-discover-card` | done | Public directory uses live API slugs |
| `cmp-onboarding` | done | Checklist uses real counts + site maps |
| `cmp-public-profile` | done | Public slug page cleaned |

---

## Counts

| Status | Count |
|--------|-------|
| pending | 0 |
| in_progress | 0 |
| done | 87 |
| wont-fix | 0 |
| blocked | 0 |
| **total** | **87** |

## Phase 4 audit acceptance remediation

| ID | Module | Status | Notes |
|---|---|---|---|
| `audit-ven-01` | VEN-01 Venue operations shell | done | Root chrome suppressed on Venue ops; shell visibility tests pass. |
| `audit-ven-02` | VEN-02 Venue dashboard | done | Canonical action-first dashboard and real request-state sources retained. |
| `audit-ven-03` | VEN-03 Profile and directory | done | Strict shared update/public DTO, real editor, and private-field stripping. |
| `audit-ven-04` | VEN-04 Booking requests | done | Canonical lifecycle, conflicts, timeline, compatibility, and manual SQL package. |
| `audit-ven-05` | VEN-05 Calendar and events | done | Canonical list/calendar/event hub and redirect register verified. |
| `audit-ven-06` | VEN-06 Event-day/check-in | done | Scanner authorization and contact privacy closed; unsafe offline queue removed. |
| `audit-ven-07` | VEN-07 Ticketing | done | Event-scoped ticket workspace and shared credential/settlement contracts retained. |
| `audit-ven-08` | VEN-08 Finances | done | Tenant-scoped view/manage capabilities and real ledger sources verified. |
| `audit-ven-09` | VEN-09 Analytics | done | Canonical verified-source analytics retained; legacy twin redirected. |
| `audit-ven-10` | VEN-10 Hiring/jobs | done | Staff hub connects jobs, hiring, onboarding, roster, and schedule. |
| `audit-ven-11` | VEN-11 Scheduling/shifts | done | Canonical API-backed scheduler and persisted shift paths verified. |
| `audit-ven-12` | VEN-12 Roles/permissions | done | Central capability resolution extended to finance and door operations. |
| `audit-ven-13` | VEN-13 Documents/equipment | done | Canonical scoped surfaces retained; duplicate route twins redirected. |
| `audit-ven-14` | VEN-14 Site maps | done | Shared versioned workspace and accessible field/list path retained. |
| `audit-ven-15` | VEN-15 Communications | done | Canonical contextual inbox retained; mock social/team twins excluded. |
| `audit-ven-16` | VEN-16 Settings/integrations | done | Canonical save path and public-link controls retained; mock entry hidden. |

External manual SQL, persona, assistive-technology, performance, and moderated
acceptance gates are tracked in
`docs/implementation/ui-ux-completion/PHASE_4_IMPLEMENTATION_STATUS.md`.
