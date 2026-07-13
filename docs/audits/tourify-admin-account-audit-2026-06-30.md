# Tourify Admin Account Audit

Date: 2026-06-30
Scope: Read-only audit of the Admin account, organization-management model, routes, visible features, components, APIs, and completion status.

## Account purpose

The Admin account helps an administrator plan, manage, and execute tours and events through an Organization. Admin is the user-facing account type. Organization is the managed entity. The organization creator always has master permissions and can grant master permissions or custom permissions to other Admin users.

Admin manages tours, events, teams, jobs, hiring, onboarding, staff/crew/volunteers, tasks, logistics, site maps, day sheets, communications, ticketing, finances, marketplace, inventory, artists, venues, analytics, feature flags, audit logs, and settings.

## Inventory

| Metric | Count |
|---|---:|
| Page routes | 67 |
| Admin API routes | 133 |
| Distinct routed component imports | 122 |
| Admin optimized sidebar leaf items | 30 |
| Current dashboard/sidebar visible items | 52 |
| `components/admin` files | 78 |
| Route-local `app/admin/dashboard/components` files | 59 |
| Page-level marker hits | TODO: 1, mock: 1, placeholder: 149, comingSoon: 2, fallback: 50 |

## Visible components and purpose

| Visible component group | Count | Purpose | Status |
|---|---:|---|---|
| Dashboard | 1 | Main Admin operating view | Mostly Built |
| Operations nav | 4 | Tours, events, calendar, logistics | Mostly Built |
| Workforce nav | 6 | Staff, shifts, jobs, applications, roles, onboarding | Mostly Built / Partial |
| Commerce nav | 5 | Ticketing, finances, marketplace, store, inventory | Partial |
| Network nav | 4 | Artists, venues, agencies, connections | Partial |
| Content nav | 5 | Content library, music, EPK, website, feed | Partial |
| Insights/system nav | 5 | Analytics, telemetry, feature flags, audit log, settings | Mostly Built |
| Dashboard stat cards | 4 | Tours, events, revenue, tickets sold | Partial |
| Dashboard integration cards | 3 | Logistics, finances, staff/crew | Partial |
| Dashboard tabs/cards/actions | 15 | Overview, tours, events, calendar, analytics, activity, tasks, public profile, help, guided tour | Partial |

## Account model issue

Code still contains places where `admin` is normalized to `organization` and where `Organization` is emitted as the account label. Product model says:

- User-facing account type: Admin.
- Managed entity: Organization.
- Highest permission level: master permissions.
- Organization creator always keeps master permissions.
- Invited Admin users may receive master permissions or custom permissions.

This should be fixed in the account model, switcher labels, account dashboard route logic, and ownership verification paths.

## Page route inventory

Admin root, setup, settings, legacy shell:

- `/admin`
- `/admin/debug`
- `/admin/request`
- `/admin/setup`
- `/admin/settings`
- `/admin/create-tables`
- `/admin/reset-onboarding`
- `/organization/[username]`
- `/orgs/create`
- `/orgs/invite/accept`

Admin dashboard and system:

- `/admin/dashboard`
- `/admin/dashboard/analytics`
- `/admin/dashboard/calendar`
- `/admin/dashboard/connect`
- `/admin/dashboard/features`
- `/admin/dashboard/settings`
- `/admin/dashboard/settings/audit`
- `/admin/dashboard/test-api`

Tours and events:

- `/admin/dashboard/tours`
- `/admin/dashboard/tours/[id]`
- `/admin/dashboard/tours/planner`
- `/admin/dashboard/events`
- `/admin/dashboard/events/[id]`
- `/admin/dashboard/events/[id]/advancing`
- `/admin/dashboard/events/[id]/check-in`
- `/admin/dashboard/events/[id]/command-center`
- `/admin/dashboard/events/[id]/day-sheet`
- `/admin/dashboard/events/[id]/hq`
- `/admin/dashboard/events/create`
- `/admin/dashboard/events/planner`

Workforce, hiring, onboarding, RBAC:

- `/admin/applications`
- `/admin/dashboard/applications`
- `/admin/dashboard/candidates`
- `/admin/dashboard/hiring`
- `/admin/dashboard/jobs`
- `/admin/dashboard/jobs/new`
- `/admin/job-postings/new`
- `/admin/dashboard/onboarding`
- `/admin/dashboard/rbac`
- `/admin/dashboard/roster`
- `/admin/dashboard/staff`
- `/admin/teams/[jobId]`

Logistics, communications, commerce:

- `/admin/dashboard/communications`
- `/admin/dashboard/logistics`
- `/admin/dashboard/logistics/site-maps-enhanced`
- `/admin/dashboard/finances`
- `/admin/dashboard/inventory`
- `/admin/dashboard/marketplace`
- `/admin/dashboard/marketplace/orders`
- `/admin/dashboard/marketplace/orders/[id]`
- `/admin/dashboard/store`
- `/admin/dashboard/ticketing`
- `/admin/dashboard/ticketing/enhanced`

Network/content:

- `/admin/dashboard/agencies`
- `/admin/dashboard/artists`
- `/admin/dashboard/artists/[id]`
- `/admin/dashboard/artists/new`
- `/admin/dashboard/venues`
- `/admin/dashboard/venues/[id]`
- `/admin/dashboard/network`
- `/admin/dashboard/content`
- `/admin/dashboard/contracts`
- `/admin/dashboard/epk`
- `/admin/dashboard/feed`
- `/admin/dashboard/messages`
- `/admin/dashboard/music`
- `/admin/dashboard/website`

## API/data dependency inventory

Admin has 133 API routes. Main groups:

- Logistics: 35
- Onboarding: 17
- Events: 15
- Tours: 7
- RBAC: 5
- Staffing: 5
- Marketplace: 4
- Applications: 3
- Content: 3
- Messages: 3
- Analytics: 2
- Artists: 2
- Features: 2
- Finances: 2
- Job postings: 2
- Staff: 2
- Ticketing: 2
- Vendor requests: 2
- Venues: 2
- Singletons for assets, audit, calendar, capabilities, communications, dashboard stats, lodging, notifications, rentals, store, tasks, team members, travel coordination, user search, and related admin utilities.

## Component implementation inventory

- `components/admin`: 78 files
- `app/admin/dashboard/components`: 59 route-local files
- Admin pages import 122 distinct routed components/helpers.

Admin has strong backend/API coverage compared with Artist and Venue. The frontend has many real routes, but some current dashboard components and older dashboard hub components are disconnected or partially duplicated.

## Completion estimate

Admin completion: 55-65%.

Admin is the strongest operational account. It has the deepest API surface and the most coherent sidebar. The largest issue is product-model alignment around Admin vs Organization, plus making the hiring/onboarding/workforce system production-complete and connected to the worker-facing Work Mode experience.

## Missing or not fully built

- Admin account naming correction and master permissions model.
- Full custom permission editor for invited Admin users.
- Complete approval to onboarding to employment assignment to Work Mode workflow.
- Production validation for hiring/onboarding migrations and RLS.
- Complete dashboard data states and remove fallback/placeholder dependencies.
- Clear split between Admin organization workforce and Venue-owned workforce.
- Complete collaboration handoff with Artist and Venue accounts for hosted/booked events.

## Recommended next steps

1. Update account semantics so Admin remains the account context and Organization is the managed entity.
2. Implement master permissions and custom role permissions consistently.
3. Finish Admin hiring/onboarding as a connected workflow into General-user Work Mode.
4. Keep Admin workforce tools focused on organization/tour/event workforce.
5. Coordinate, but do not automatically own, Venue workforce unless collaboration permissions allow it.
6. Run production Supabase/RLS/security validation before relying on workforce, payroll, documents, or permissions data.

