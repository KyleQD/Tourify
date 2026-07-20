# Venue Canonical Information Architecture

Date: 2026-07-17  
Source: Venue Dashboard Full Audit & Phased Finish Plan

## Canonical product surface

Primary shell: `VenueOperationsShell` (`app/venue/components/operations/venue-operations-shell.tsx`).

### Command
| Label | Route |
|-------|-------|
| Dashboard | `/venue/dashboard` |
| Bookings | `/venue/bookings` |
| Calendar | `/venue/dashboard/calendar` |
| Events | `/venue/events` |
| Messages | `/venue/messages` |

### Commerce
| Label | Route |
|-------|-------|
| Tickets | `/venue/dashboard/tickets` |
| Check-In | `/venue/dashboard/tickets?view=check-in` |
| Finances | `/venue/finances` |
| Analytics | `/venue/analytics` |

### Workforce
| Label | Route |
|-------|-------|
| Staff | `/venue/staff` |
| Hiring | `/venue/dashboard/jobs` |
| Scheduling | `/venue/staff/scheduling` |
| Roles | `/venue/staff/roles-permissions` (auto-resolves current venue) |

### Physical Venue
| Label | Route |
|-------|-------|
| Profile | `/venue/overview` |
| Documents | `/venue/documents` |
| Equipment | `/venue/equipment` |
| Site Maps | `/venue/dashboard/site-maps` |
| Settings | `/venue/settings` |

### Event detail (canonical)
| Label | Route |
|-------|-------|
| Event Ops Hub | `/venue/events/[id]` |
| Door Check-In | `/venue/events/[id]/check-in` |

### Public (outside shell)
| Label | Route |
|-------|-------|
| Directory | `/venues` |
| Public profile | `/venues/[slug]` |
| Booking request | `/venues/[slug]/booking-request` |

## Redirects (duplicate / legacy twins)

| From | To |
|------|----|
| `/venue` | `/venue/dashboard` |
| `/venue/tickets` | `/venue/dashboard/tickets` |
| `/venue/site-maps` | `/venue/dashboard/site-maps` |
| `/venue/dashboard/settings` | `/venue/settings` |
| `/venue/dashboard/analytics` | `/venue/analytics` |
| `/venue/dashboard/equipment` | `/venue/equipment` |
| `/venue/dashboard/documents` | `/venue/documents` |
| `/venue/manage-event/[id]` | `/venue/events/[id]` |
| `/venue/assets` | `/venue/equipment` |
| `/venue/dashboard/social` (and feed/network/music/epk/…) | `/venue/dashboard` (Phase 9) |

## Active venue source of truth

- Hook: `useCurrentVenue` (`app/venue/hooks/useCurrentVenue.ts`)
- Persistence: `sessionStorage` active venue id via `venueService`
- Roles / Hiring / Scheduling must resolve venue from this context when `?venueId` is omitted

## Mock / coming-soon kill-list (by phase)

| Phase | Area | Files / notes |
|-------|------|---------------|
| 4 | manage-event mockEvent | `app/venue/manage-event/[id]/page.tsx` |
| 4 | event equipment/financials mocks | `app/venue/components/event-details/*` |
| 5 | analytics chart mocks | `app/venue/dashboard/analytics/page.tsx` |
| 5 | finances invoices/budgets | `app/venue/finances/page.tsx` — hide tabs |
| 5 | equipment rentals | `app/venue/equipment/page.tsx` — hide tab |
| 6 | team/role mocks | `app/venue/staff/components/team-management.tsx`, `role-management.tsx` |
| 6 | training/performance | staff components — FeatureUnavailable |
| 9 | social/music/EPK/groups mocks | `app/venue/dashboard/{feed,music,epk,groups,promotions,...}` |
| 9 | mock-data.ts | `lib/venue/mock-data.ts` — quarantine from production pages |
| 9 | feature grid mislinks | `app/venue/dashboard/features` |
