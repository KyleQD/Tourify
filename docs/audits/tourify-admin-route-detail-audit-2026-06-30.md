# Tourify Admin Route Detail Audit

Date: 2026-06-30
Scope: Expanded read-only audit of each Admin-facing page route, including purpose, current build status, and missing work.

## Read-only boundary

- This document was added as a new file.
- No existing files were edited or deleted.
- No database commands, migrations, resets, or seed scripts were run.
- Status is based on static source inspection of page files, imports, route wiring, API calls, Supabase calls, placeholder/mock/fallback markers, and surrounding Admin layout/navigation code.

## Admin model reminder

Admin should remain the account context. Organization is the managed entity inside Admin. The organization creator should always have master permissions and can grant master permissions or custom permissions to other Admin users.

Current code still has a product-model mismatch in several places: `admin` is sometimes normalized or labeled as `organization` or `organizer`. This is especially visible in account type logic, Admin layout copy, public organization profile routes, and organization invite/create routes.

## Status key

- Complete: route does its limited job correctly, usually redirect or simple resolved view.
- Mostly Built: main workflow exists and is data/API connected, but needs hardening, polish, or edge-case work.
- Partial: meaningful UI exists, but important workflow, data, permission, or state handling is incomplete.
- Shell/Mock: visible surface is mostly placeholder, empty state, mock, or future-phase content.
- Duplicate/Legacy: route overlaps with newer implementation or older product model.
- Dev-only/Risky: utility route can mutate setup/onboarding/database state or is meant for debugging, not normal users.
- Broken/Mislinked: route points to missing or mismatched product flow.

## Admin route summary

| Area | Routes | Overall status |
|---|---:|---|
| Root/setup/settings/legacy shell | 10 | Mixed: redirects, partial organization flow, several dev-only risky utilities |
| Dashboard/system | 8 | Mostly Built, with calendar still shell and account naming mismatch |
| Tours/events | 12 | Mostly Built to Partial, strongest event/tour operational surface |
| Workforce/hiring/onboarding/RBAC | 12 | Partial to Mostly Built, but split between new universal hiring and older venue-centric routes |
| Logistics/communications/commerce | 11 | Mostly Built to Partial, logistics and ticketing are broad but need validation |
| Network/content | 14 | Partial to Mostly Built, several catalog/moderation/public-profile surfaces exist |

## Admin root, setup, settings, legacy shell

| Route | Function and user problem solved | Build status | Current behavior and evidence | Missing or concern |
|---|---|---|---|---|
| `/admin` | Entry point for an Admin user who lands on the short Admin URL. | Complete | Tiny server route redirects to `/admin/dashboard`. | None for redirect, but product copy should say Admin rather than organizer where possible. |
| `/admin/debug` | Developer/admin diagnostic page for session, onboarding, and profile state. | Dev-only/Risky | Client page reads Supabase `onboarding` and `profiles` tables. Useful for debugging. | Should not be part of normal Admin navigation. Needs production guard or removal from user-facing Admin. |
| `/admin/request` | Lets a user request elevated Admin access. | Partial / Legacy | Writes to `admin_requests`; form asks for organization, role, reason, experience, references. | Copy describes broad platform admin responsibilities, not the clarified Admin-to-Organization model. Needs workflow for review, approval, invite, and master/custom permissions. |
| `/admin/setup` | Legacy database setup utility. | Dev-only/Risky | Client page contains SQL strings and attempts `supabase.rpc('exec_sql')` to create/update profiles and onboarding. | This is not production Admin functionality. It can mutate database schema/data if callable. Should be removed from production or locked behind strict dev-only controls. |
| `/admin/settings` | Legacy settings URL. | Complete | Server redirect to `/admin/dashboard/settings`. | None for redirect. |
| `/admin/create-tables` | Legacy setup helper for checking/creating tables. | Dev-only/Risky | Calls `/api/migrations/create-tables`; can show SQL for manual Supabase dashboard execution. | Should not be normal Admin functionality. It is setup/migration tooling exposed as UI. |
| `/admin/reset-onboarding` | Resets current user's onboarding state. | Dev-only/Risky | Deletes from `onboarding` where `user_id` equals current user, then routes back to debug. | User-facing delete utility. Should be removed or strictly development-only. |
| `/organization/[username]` | Public profile page for an organization entity. | Partial | Fetches `/api/profile/[username]` and renders `EnhancedPublicProfileView` if account type is `organization`. | Product model says Organization is managed inside Admin. Public route can remain, but should align with Admin account ownership and permissions. Follow/message/share callbacks are empty. |
| `/orgs/create` | Minimal organization creation form. | Partial | Calls `createOrganizationAction({ name })`, then redirects to `/dashboard`. | Too thin for Admin account creation. Needs master-permission creation path, ownership model, profile setup, and redirect to Admin context. Uses Organization naming externally. |
| `/orgs/invite/accept` | Accepts an organization invite token. | Partial | Reads `token` query param, POSTs to `/api/orgs/invite/accept`, then redirects to `/dashboard`. | Needs role display, permission summary, master/custom permission handling, expired token states, and Admin context redirect. |

## Admin dashboard and system

| Route | Function and user problem solved | Build status | Current behavior and evidence | Missing or concern |
|---|---|---|---|---|
| `/admin/dashboard` | Main Admin operating dashboard for tours, events, revenue, staff, notifications, and quick access. | Mostly Built | Uses `OptimizedDashboardClient`; fetches `/api/admin/dashboard/stats`, `/api/admin/tours`, `/api/admin/events`, `/api/admin/notifications`; has realtime subscriptions and dashboard tabs. | `DashboardQuickHub` exists but is not mounted. Client checks `currentAccount?.account_type === 'admin'`, while other code can normalize Admin to Organization. Fallback handling can hide API failures. |
| `/admin/dashboard/analytics` | Gives Admins performance insights across tours, events, finances, and performers. | Mostly Built | Large client page; calls dashboard stats, finances, events, top performers, and export APIs. | Needs verified data definitions, permission-specific views, and empty/error state polish. |
| `/admin/dashboard/calendar` | Calendar view for tours and events. | Shell/Mock | Displays `AdminEmptyState` saying calendar sync is coming in Phase 3, with links to Events and Tours. | Needs actual calendar UI, event/tour date data, filters, iCal/Google/Outlook feeds, and sharing permissions. |
| `/admin/dashboard/connect` | Telemetry page for in-person connect/session funnel monitoring. | Mostly Built | Fetches `/api/connect/telemetry/summary`; has refreshable telemetry cards. | Needs production data validation and clear relationship to Admin organization vs platform-wide telemetry. |
| `/admin/dashboard/features` | Feature flag and rollout management. | Mostly Built | Fetches `/api/admin/features` and per-feature APIs; UI supports switches/sliders/dialog editing. | Needs permission guard for master/system Admins and audit trail for changes. |
| `/admin/dashboard/settings` | Account-scoped Admin settings. | Mostly Built | Renders `AccountScopedSettings` with Admin page header. | Copy says organizer options. Needs Admin/Organization terminology update and permissions settings for master/custom roles. |
| `/admin/dashboard/settings/audit` | Audit log viewer for Admin actions/compliance. | Mostly Built | Calls `/api/admin/audit`; includes filters, skeletons, errors, and empty state. | Needs verified coverage of all sensitive Admin actions, especially permission, payroll, onboarding, and document events. |
| `/admin/dashboard/test-api` | Manual API smoke-test page for Admin endpoints. | Dev-only/Risky | Calls dashboard stats, tours, and events test requests from UI. | Useful during development, but should not be a production Admin page. |

## Tours and events

| Route | Function and user problem solved | Build status | Current behavior and evidence | Missing or concern |
|---|---|---|---|---|
| `/admin/dashboard/tours` | Lists and manages tours. | Mostly Built | Fetches `/api/tours`; has filters, stats, loading, error, and empty state components. | Uses shared `/api/tours` instead of Admin-specific route in this page. Needs permission scoping and consistent Admin entity context. |
| `/admin/dashboard/tours/[id]` | Detailed tour management workspace. | Mostly Built | Large page with APIs for tour details, finances, workflow threads, events, vendors, and team operations. | Needs production validation for every subflow, permission scoping, and consistency with Admin organization ownership. |
| `/admin/dashboard/tours/planner` | Multi-step tour planning and publishing workflow. | Mostly Built | Wizard imports tour initiation, routing/dates, events, artists/crew, logistics, ticketing/financials, review/publish; calls `/api/tours/planner` and `/api/tours`. | Needs end-to-end validation with real data, draft recovery, permission model, and publishing states. |
| `/admin/dashboard/events` | Lists and manages Admin events. | Mostly Built | Fetches `/api/admin/events` and logistics metrics; has filters, stats, empty/loading/error states, and create event form integration. | Needs complete route consistency with planner/create flows and stronger permission handling. |
| `/admin/dashboard/events/[id]` | Detailed event management workspace. | Mostly Built / Partial | Very large client page; fetches event APIs, notifications, participants/tasks-like subflows; includes tabs and operational controls. | Contains TODO/placeholder/fallback markers. Needs decomposition, test coverage, and verification that every tab is connected to real event data. |
| `/admin/dashboard/events/[id]/advancing` | Event advancing workflow for production readiness, contacts, documents, and logistics. | Partial | Fetches Admin event APIs; substantial UI with 10 placeholder markers. | Needs complete advancing data model, document handoff, external sharing, and worker-facing publication into Work Mode. |
| `/admin/dashboard/events/[id]/check-in` | Event check-in page for ticket or attendee validation. | Partial | Uses `/api/ticketing/check-in`; simple focused page. | Needs role permissions, scanner flow, offline handling, guestlist/staff distinction, and error states. |
| `/admin/dashboard/events/[id]/command-center` | Live operational command center for event-day overview. | Partial | Fetches event data and jobs; has cards/actions for operational state. | Needs realtime task/incident/comms integration and clear Work Mode broadcast path. |
| `/admin/dashboard/events/[id]/day-sheet` | Creates and distributes day sheet/run sheet information. | Partial | Uses Admin and event APIs; UI for day sheet content. | Needs publish/acknowledge workflow to Work Mode, versioning, distribution logs, and permissions. |
| `/admin/dashboard/events/[id]/hq` | Event HQ workspace for resources, permissions, posts, communications, tasks, and event context. | Partial | Large page with event APIs, tabs, switches, dialogs, and multiple placeholder/fallback markers. | Needs workflow clarity, data validation, and explicit worker/participant access boundaries. |
| `/admin/dashboard/events/create` | Admin event creation. | Partial | Uses form UI and `/api/events`; includes artist dialog and toast feedback. | Contains mock/placeholder markers. Should use Admin-scoped API and connect cleanly to tours, venue booking, staff needs, and publishing. |
| `/admin/dashboard/events/planner` | Comprehensive event planning wizard. | Partial / Overbuilt | Very large page, calls planner APIs plus venues/search/invitations/notifications/messages. | 30 placeholder markers and 8 fallback markers. Needs simplification, test coverage, and confirmed end-to-end save/publish flow. |

## Workforce, hiring, onboarding, RBAC

| Route | Function and user problem solved | Build status | Current behavior and evidence | Missing or concern |
|---|---|---|---|---|
| `/admin/applications` | Older application review page. | Duplicate/Legacy / Partial | 1,361-line client page; fetches `/api/admin/applications`; uses venue context and hiring review components. | Overlaps with `/admin/dashboard/applications`. Venue-scoped behavior conflicts with Admin organization model. Should be consolidated into universal hiring. |
| `/admin/dashboard/applications` | Newer scoped application review panel. | Mostly Built / Partial | Server page builds employer from search params and renders `ApplicationReviewPanel`; shows `HiringMissingScope` without employer. | Needs default Admin organization scope so users are not stranded without query params. |
| `/admin/dashboard/candidates` | Candidate onboarding/review workspace. | Mostly Built / Partial | Builds employer from search params and renders `HiringDashboard` with `initialTab="onboarding"`. | Needs default Admin scope, complete onboarding state model, and Work Mode handoff. |
| `/admin/dashboard/hiring` | Universal hiring dashboard. | Mostly Built / Partial | Renders `HiringDashboard` if employer scope exists; otherwise `HiringMissingScope`. | Needs Admin organization auto-resolution, venue/Admin distinction, and production validation. |
| `/admin/dashboard/jobs` | Admin job postings and application management. | Mostly Built | Fetches Admin job postings, team members, applications; uses hiring status badges and onboarding types. | Needs consolidation with universal job builder and clear Admin vs Venue hiring ownership. |
| `/admin/dashboard/jobs/new` | New universal job posting builder. | Mostly Built / Partial | Server page builds employer scope and renders `JobPostingBuilder`. | Needs default Admin employer scope, permission gating, and end-to-end approval/onboarding link. |
| `/admin/job-postings/new` | Older job posting creation page. | Duplicate/Legacy / Partial | Uses `JobPostingForm`, `AdminOnboardingStaffService`, and `use-venue`. | Legacy/venue-centric path overlaps with `/admin/dashboard/jobs/new`. Should be retired or redirected after migration. |
| `/admin/dashboard/onboarding` | Onboarding template/workflow management. | Partial | Calls onboarding template APIs; supports forms, switches, dialogs, and template-like configuration. | Needs final Admin/Venue shared onboarding architecture, RLS validation, document review flow, and Work Mode completion trigger. |
| `/admin/dashboard/rbac` | Role-based access control management. | Partial | Calls `/api/admin/rbac/roles`; UI includes roles, permissions, entity RBAC concepts. | Needs master permissions model, custom permission editor, creator invariants, audit trail, and enforcement verification. |
| `/admin/dashboard/roster` | Team roster view for hired/onboarded people. | Mostly Built / Partial | Renders `TeamRosterPanel` when employer scope exists. | Needs default Admin scope, Work Mode assignment status, payroll/travel/contact fields, and export validation. |
| `/admin/dashboard/staff` | Staff and crew management dashboard. | Mostly Built / Partial | Large page with staff roster, scheduling, analytics, communications, staffing permissions, vetting, documents, applications, and job postings APIs. | Needs consolidation with universal hiring/roster, Work Mode publishing, venue/Admin distinction, and RLS/storage validation. |
| `/admin/teams/[jobId]` | Job-specific team management. | Duplicate/Legacy / Partial | Uses older admin onboarding staff service and `/api/admin/staff`; has fallback and coming-soon markers. | Overlaps with newer roster/hiring pages. Needs consolidation or redirect. |

## Logistics, communications, commerce

| Route | Function and user problem solved | Build status | Current behavior and evidence | Missing or concern |
|---|---|---|---|---|
| `/admin/dashboard/communications` | Unified Admin inbox for group and direct messages. | Partial / Mostly Built | Renders `AdminUnifiedInbox`. | Needs verified integration with event/tour/team communications and worker-facing updates. |
| `/admin/dashboard/logistics` | Logistics hub for travel, lodging, rentals, equipment, staff/team context, and metrics. | Mostly Built / Partial | Very large page with logistics hooks, rentals, lodging, event select, team members, logistics metrics. | Needs end-to-end data validation, permissions, and simpler ownership model across tours/events/venues. |
| `/admin/dashboard/logistics/site-maps-enhanced` | Site map manager for event/tour layouts. | Mostly Built / Partial | Thin wrapper around `SiteMapManager`; manager creates, duplicates, deletes, templates, imports images, and uses site map APIs. | Needs integration into event/day-sheet/Work Mode, public sharing controls, and storage/RLS verification. |
| `/admin/dashboard/finances` | Financial tracking, revenue, settlements, and reporting. | Mostly Built / Partial | Fetches `/api/admin/finances` and settlements; includes tabs, dialogs, filters, skeletons, empty/error states. | Needs real settlement/payroll/payment authority model and sensitive financial permission gates. |
| `/admin/dashboard/inventory` | Equipment/merch/logistics inventory management. | Mostly Built / Partial | Uses `/api/admin/logistics/items` APIs with create/edit/delete style UI. | Needs link to tours/events/site maps, audit trail, and vendor/venue ownership boundaries. |
| `/admin/dashboard/marketplace` | Marketplace moderation and financial overview. | Mostly Built / Partial | Calls moderation, orders, and finances APIs; supports filters/actions. | Needs clear Admin permissions, dispute/refund workflows, and seller payout audit trail. |
| `/admin/dashboard/marketplace/orders` | Marketplace order list. | Mostly Built | Fetches `/api/admin/marketplace/orders`; has skeleton, empty/error, filter bar, stats. | Needs operational workflows for fulfillment, refunds, and payout follow-up. |
| `/admin/dashboard/marketplace/orders/[id]` | Marketplace order details. | Mostly Built | Fetches order details and payout retry API. | Needs full order timeline, audit events, customer/seller messaging, and permission gating. |
| `/admin/dashboard/store` | Admin store management. | Partial | Fetches `/api/admin/store`; includes item/listing form controls and stats. | Needs full product/listing lifecycle, fulfillment integration, and financial settlement connection. |
| `/admin/dashboard/ticketing` | Ticketing dashboard for events, sales, refunds, capacity, and ticket types. | Mostly Built / Partial | Large page calls Admin events, enhanced ticketing, and refund APIs. | Needs scanner/check-in integration, payment/refund verification, event permissions, and production ticket lifecycle tests. |
| `/admin/dashboard/ticketing/enhanced` | Legacy enhanced ticketing URL. | Complete redirect / Legacy | Server redirect to `/admin/dashboard/ticketing`. | Keep only as compatibility route. |

## Network and content

| Route | Function and user problem solved | Build status | Current behavior and evidence | Missing or concern |
|---|---|---|---|---|
| `/admin/dashboard/agencies` | Manage performance and staffing agencies. | Partial | Renders performance agency and staffing agency managers in tabs. | Needs confirmed APIs, permissions, and relationship to Venue/Admin workforce providers. |
| `/admin/dashboard/artists` | Artist catalog and booking/admin management. | Mostly Built / Partial | Fetches `/api/admin/artists`; includes filters, tabs, cards, dialogs, stats. | Needs strong artist permissions, booking workflow connection, and remove fallback demo assumptions. |
| `/admin/dashboard/artists/[id]` | Artist detail management. | Mostly Built / Partial | Fetches `/api/admin/artists/[id]`; supports detail tabs/forms. | Needs complete edit/save workflows, audit logging, and public/private data separation. |
| `/admin/dashboard/artists/new` | Create a managed artist. | Partial | POSTs to `/api/admin/artists`; form fields include placeholders. | Needs full account ownership/invite flow, duplicate prevention, permissions, and artist-user linking. |
| `/admin/dashboard/venues` | Venue catalog/partner management. | Mostly Built / Partial | Large page with venue APIs/search and service imports; manages venue relationships. | Needs collaboration model for Admin-hosted events at venues without taking over Venue workforce. |
| `/admin/dashboard/venues/[id]` | Venue detail page. | Mostly Built / Partial | Fetches `/api/admin/venues/[id]`; has detail cards/forms/tabs. | Needs collaboration permissions, booking/event relationship history, and venue-owned workforce boundaries. |
| `/admin/dashboard/network` | Admin network/connections page. | Partial | Client Supabase page reads `follow_requests` and `profiles`; includes stats and tabs. | Needs account-scoped networking model, Admin organization context, and messaging/collaboration actions. |
| `/admin/dashboard/content` | Content moderation/management. | Mostly Built / Partial | Calls `/api/admin/content/posts` and `/api/admin/content/music`; supports filtering and tabs. | Needs moderation queue, audit actions, appeals, and role permissions. |
| `/admin/dashboard/contracts` | Contract management. | Shell/Mock | Empty state says contract management coming soon. | Needs digital contract creation, e-signing, tracking, templates, counterparty permissions, and audit trail. |
| `/admin/dashboard/epk` | EPK management/catalog. | Partial | Server page reads `artist_epk_settings` and renders EPK cards. | Needs admin actions, search/filter, permissions, and connection to artist detail/public EPK workflows. |
| `/admin/dashboard/feed` | Admin/organizer feed management and posting. | Partial | Supabase client reads `posts` and `profiles`; has post creation/moderation-like UI. | Needs account-scoped posting, content permissions, moderation workflows, and audit logging. |
| `/admin/dashboard/messages` | Broadcast and direct/thread messaging. | Partial | Calls `/api/admin/messages/threads` and `/api/admin/messages/broadcast`; includes composer UI. | Needs recipient scoping, event/tour/team channels, delivery status, and Work Mode update integration. |
| `/admin/dashboard/music` | Music catalog admin surface. | Partial | Server page reads `artist_music` and renders cards/actions. | Needs moderation, ownership controls, rights/licensing connection, search/filter, and role permissions. |
| `/admin/dashboard/website` | Website/profile content settings for Admin organization. | Partial | Server page reads `profiles`; renders website/profile cards/actions. | Needs real organization website/page builder, routing ownership, content publishing, and permissions. |

## Key Admin build risks

1. Admin vs Organization mismatch: code and copy still use organizer/organization as account labels, while product requires Admin as the account context and Organization as the managed entity.
2. Dev-only database utilities are routed under `/admin`: `/admin/setup`, `/admin/create-tables`, `/admin/reset-onboarding`, `/admin/debug`, and `/admin/dashboard/test-api`.
3. Workforce is split across newer universal hiring routes and older venue-centric Admin routes.
4. Several routes depend on search-param employer scope. Without scope, the user sees `HiringMissingScope` instead of their Admin organization context.
5. Work Mode handoff is not complete. Admin can hire/onboard in pieces, but worker-facing schedules, tasks, communications, site maps, day sheets, documents, travel, payroll info, and contacts are not yet fully delivered.
6. Financial, payroll, onboarding documents, site maps, and RBAC need Supabase RLS/storage/security verification before production.

## Recommended Admin development sequence

1. Lock down or remove dev-only Admin routes from production navigation and production deployments.
2. Fix account terminology and logic: Admin account, Organization entity, master permissions.
3. Make Admin organization scope auto-resolve for hiring, jobs, applications, candidates, roster, and staff routes.
4. Consolidate old `/admin/applications`, `/admin/job-postings/new`, and `/admin/teams/[jobId]` into the universal hiring system.
5. Finish RBAC with master permissions, custom permissions, creator invariants, and audit logging.
6. Complete Admin-to-Work Mode publication for schedules, tasks, communications, site maps, day sheets, documents, travel, payroll, and contacts.
7. Validate all sensitive Admin APIs against Supabase RLS, storage policy, and service-role isolation requirements.

