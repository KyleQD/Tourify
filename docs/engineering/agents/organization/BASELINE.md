# Organization baseline

- Task: ORG-001 (read-only audit)
- Reviewed at: 2026-09-09
- Generated-map SHA: `a7193116c5a677b1c2939aa4a66e9415dac6eed1`
- Working tree: dirty at audit time (386+ entries); all claims below are path-referenced reads, not behavioral proofs.

## What the area contains today

### 1. Public organization identity surface

- **Route:** `app/organization/[slug]/page.tsx` (public org profile) + `app/organization/[slug]/layout.tsx` (SEO metadata via `buildOrganizationPreviewMetadata`).
- **Service:** `lib/public-organization/get-public-organization-profile.ts` — builds `PublicOrganizationPageDTO` from `organizer_accounts` (url_slug / `is_public` / `is_active`), resolves viewer "can manage" via `org_members` role (`owner|admin|tour_manager`) and `account_relationships`, and loads roster / events / tours / posts / open jobs gated by subtype.
- **Subtypes:** `lib/organizations/org-subtypes.ts` — canonical list (`band, label, promoter, performance_agency, staffing_agency, production_company, rental_company, generic`), legacy-type normalization, and module gates (`hasArtistRoster`, `hasPublicEventsModule`, `hasServicesJobsModule`).
- **Components:** `components/public-organization/public-organization-page.tsx`; `components/organization-profile-setup.tsx`.
- **API:** `app/api/organizers/[slug]/route.ts` (public organizer profile).

### 2. Organization creation and membership (tenant context)

- **Server actions:** `app/orgs/_actions/org-actions.ts`
  - `createOrganizationAction` → RPC `create_organizer_account` (migration `20260712005429_organization_public_personas.sql`).
  - `createInviteAction` — WS-0.2/C2 hardenings: verifies caller is `owner|admin` of the target org, only owners may mint `owner` invites, per-user rate limit, 7-day token expiry.
- **Accept flow:** `app/api/orgs/invite/accept/route.ts` — POST: rejects when either email is empty (`email_mismatch`), requires exact email match, idempotent `org_members` upsert on `org_id,user_id`, conditional `accepted_at is null` update, then `account_relationships` upsert linking the accepted user as owner of the org's `organizer_account`.
- **Pages:** `app/orgs/create/page.tsx` (redirects to `/create?type=organization`), `app/orgs/invite/accept/page.tsx`.
- **Adjacent membership APIs (outside declared working set):** `app/api/organization/artist-members/route.ts`, `app/api/organization/tour-managers/route.ts`.
- **Core org tables (generated `database-objects.md`):** `organizations`, `org_members`, `org_invites`, `org_role_permissions` (all from `20250816132000_org_rbac.sql`), plus `organizer_accounts` (`20260604100000_content_moderation.sql`) and `organization_artist_members` (`20260712005429_organization_public_personas.sql`).
- **DB functions:** `is_org_member`, `has_perm`, `create_organizer_account`, `slugify_org_name`, `can_access_org_scope`.

### 3. Admin organization governance hub

- **Hub:** `app/admin/dashboard/organization/page.tsx` — 16 capability-gated tabs grouped into 6 workspace groups (`lib/admin/organization-workspace-tabs.ts`); all tabs are wired to panels (no placeholder stubs).
- **Panels:** `components/admin/organization/` — 16 panels: `org-overview-panel`, `org-settings-panel`, `org-security-summary-panel`, `org-audit-log-panel`, `org-capabilities-panel`, `org-retention-summary-panel`, `org-tours-health-panel`, `org-saved-views-panel`, `org-publication-slo-panel`, `org-communications-panel`, `org-workforce-settings-panel`, `org-finance-settings-panel`, `org-vendor-governance-panel`, `org-ticketing-settings-panel`, `org-observability-panel`, `org-reporting-config-panel`.
- **API routes:** `app/api/admin/organization/**` — 11 routes (overview, settings, security-summary, ticketing-settings, finance-settings, vendor-governance, workforce-settings, communications-settings, publication-health, tours-health; permissions map marks them `admin` + `entity/RBAC`). Only `settings` and `communications-settings` expose PATCH; the rest are GET-only.
- **Canonical command layer (SEC-103):** `lib/auth/org-command.ts` — `withOrgCommand` / `executeOrgCommand`, `AdminErrorCode` taxonomy, `requireEntityAccess` (org-entity 404 semantics), correlation headers, immutable security-audit intent/outcome events, in-memory idempotency. Re-exported via `lib/auth/api-auth.ts`. Currently adopted by only 5 endpoints: `app/api/admin/tours/route.ts` (DELETE), `app/api/admin/tours/bulk/route.ts`, `app/api/admin/finances/commands/route.ts`, `app/api/admin/logistics/commands/route.ts`, `app/api/admin/ticketing/commands/route.ts`.
- **RBAC surface:** `components/admin/rbac/membership-workspace.tsx`, `app/api/admin/rbac/members/route.ts` (admin + organization + entity/RBAC) — membership administration currently lives in the RBAC page, not the org hub.

### 4. Tours domain

- **Public tours:** `app/tours/[slug]/page.tsx` + `lib/discover/tours.ts` (`fetchDiscoverTours`, `fetchPublicTourBySlug` via service role) + `lib/discover/tour-selection.ts`; public page for stops/events.
- **Tour collaboration invite accept:** `app/tours/invite/[token]/page.tsx` + `app/api/tours/invitations/[token]/route.ts` — hashed-token lookup (`hashInvitationToken`), expiry handling, accept through RPC `accept_tour_collaboration_invitation` (staged in `20260731193454_streamlined_tour_builder_quick_start.sql`) with typed error mapping (404/409/403/410).
- **Legacy tours API (WS-2.3 retirement candidate):** `app/api/tours/route.ts` (GET is `user_id`-scoped; POST creates a tour **and** an inline default `events_v2` event + `tour_events` link + `total_shows` update in non-transactional steps). `app/api/tours/[id]/route.ts` — SEC-201 delegate to canonical access; DELETE uses `delete_tour_cascade` RPC with legacy fallback. Plus `[id]/team`, `team/[memberId]`, `invites`, `jobs`, `vendors`, `events[/eventId]`, `planner`, `plan/artists`, `plan/crew`, `plan/venues`, `assign-user`, `assign-user-to-team`.
- **Admin tours API:** `app/api/admin/tours/**` — ~40 endpoints: list/CRUD, `[id]` events/plan/publish/transitions/duplicate(+preview/resume)/archive-preview/delete-preview/export/holds/tags/readiness/summary(+projection)/stops impact/calendar-token/collaboration-invites/grant-admins/quick-start-events/logistics-summary, plus teams, team-members, vendors, artists, venues, bulk(+preview), saved-views, tags, observability, plan backfill/quarantine, reconcile-preview.
- **Admin tours domain libs:** `lib/admin/tour-*.ts` — 55+ files including `tour-access.service.ts` (TOUR-102 canonical access), `tour-event-operations.service.ts`, `tour-collaboration-invitations.ts`, `tour-collaboration.ts`, `tour-builder.ts`, `tour-plan.service.ts`, `tour-transition.service.ts`, `tour-lifecycle.ts`, `tour-readiness-engine.ts`, `tour-bulk-command.ts`, `tour-command-center-summary.ts`, `tour-duplicate-job.service.ts`, `tour-health-aggregation.ts`, `tour-tags.service.ts`, `tour-stop-holds.service.ts`, `tour-route-*`, `tour-saved-views*`.
- **Admin tours UI:** `app/admin/dashboard/tours/**` (list, `[id]`, builder, create, planner with 8 step components), `components/admin/tours/**` (panels, dialogs), `components/admin/tour-*` legacy managers.
- **Tour tables (generated):** `tours` (`archive/critical_missing_tables.sql`), `tour_events` (`20250818121000_tours_core.sql`), `tour_teams`, `tour_artists` (tours_core), `tour_team_members` / `tour_vendors` (`archive/fix_tour_tables.sql`), `tour_stops` / `tour_versions` / `tour_plan_quarantine` (`20260720194500_tour_versions_stops_plan201.sql`), `tour_collaboration_invitations` (`20260731193454_streamlined_tour_builder_quick_start.sql`), view `tour_plan_normalize_stats_v`.
- **Tour DB functions:** `can_access_tour`, `is_tour_owner`, `is_tour_team_member`, `is_confirmed_tour_team_member`, `accept_tour_collaboration_invitation`, `create_tour_quick_start_events`, `delete_tour_cascade`, `publish_admin_tour`, `reconcile_admin_tour_events`, `touch_tour_events_updated_at` (>20 policies per hardening migrations `20260710024052_fix_tours_rls_recursion.sql`, `20260710032640_harden_tour_events_org_rls.sql`, `20260710032714_harden_tour_satellite_rls.sql`, `20260720020302_admin_tour_stop_publish.sql`, `20260720020544_admin_tour_collaboration_security.sql`, `20260825140000_phase4_tour_events_org_match_and_ghost_sweep.sql`).

### 5. Collabboration and tenant-context model

- **Canonical tour access (`lib/admin/tour-access.service.ts`, TOUR-102):** resolves `org_member | tour_collaborator | legacy_owner`; org members gate on acting capability set, collaborators gate on role-defaults (`admin|tour_manager|manager|owner|lead`); cross-org `orgId` mismatch yields not-found (404) semantics; `requireTourCapability` used by `[id]/collaboration-invites`, `[id]/quick-start-events`.
- **Legacy-compatible adapter:** `lib/admin/admin-tour-event-access.ts` — `assertAdminTourAccess` / `assertAdminEventAccess` delegate to the TOUR-102 service (`tour-event-operations.service.ts`); used across `app/api/tours/**` and many `app/api/admin/tours/**` routes.
- **RLS/tenant functions:** `can_access_org_scope`, `can_access_tour`, `can_access_travel_group`, `can_access_lodging_booking`, `can_access_ground_transport`, `can_access_flight`, `has_admin_logistics_scope`, `is_event_v2_org_member`, `resolve_logistics_org_id` (phase1 org-scoped finance/logistics RLS `20260825120000_phase1_org_scoped_finance_logistics_rls.sql`; site-map element security `20260903090000_site_map_element_security_and_atomic_sync.sql`).
- **Discovery spec MAP-101 (org inheritance for site maps)** is shipped (migration `20260720179000_site_map_org_inheritance_map101.sql`, `lib/admin/map-access-contract.ts`).

### 6. Tests / evidence

- `__tests__/organization/` — 5 files:
  - `org-invite-takeover-guard.test.ts` (C2 regression: non-member cannot mint invites; admins cannot mint owner invites)
  - `org-personas-integration.test.ts` (dual-compat account gates, create schema, feed expansion, public path routing)
  - `org-public-personas.test.ts` (subtype normalization/labels/module gates, slugification, public paths)
  - `tour-manager-identity.test.ts` (tour_manager signup normalizes to general)
  - `band-created-account-routing.test.ts` (Band Hub URL scoping, no first-org fallback)
- No test coverage exists for `tour-access.service.ts`, `org-command.ts`, tour collaboration invite accept, or org-member lifecycle.

### 7. Intended direction (stated plans/specs)

- **Admin feature specs (target state):** `docs/admin-feature-specs/00_Master_Roadmap.md` — 14 specs covering Platform Tenancy & RBAC (01), Tour Portfolio Lifecycle & Command Center (02), Builder/Stops/Routing (03), Publication/Work Mode (04), Event Advancing (05), Workforce (06), Travel/Lodging (07), Equipment/Logistics (08), Ticketing (09), Finance (10), Vendors/Contracts (11), Calendar/Comms (12), Reporting (13), QA/Observability (14). Phase order 0→6 (18–24 wk); multiple `docs/admin-feature-specs/discovery/*` specs already shipped (SEC-103, TOUR-102, VEND-101, SEC-201, MAP-101, FIN-101/102/103, TOUR-201…TOUR-210, SEC-110/111/112, PLAN-1xx, REL-xxx).
- **Launch backlog:** `docs/DEVELOPMENT_BACKLOG.md` — WS-0.2 org takeover chain (parts done; invite-revocation + atomic accept RPC + integration test pending), WS-0.8 admin-gate split (org/tour roles scope to org surfaces), WS-1.7 wrap ~8 guard idioms into one standard wrapper, WS-2.3 delete legacy tours route after admin parity, WS-1.1 migration/RLS reconciliation.
- **Legacy ledgers:** `.agents/organization-ticketing/` (INVENTORY/PROGRESS/TASK_LOG — ticketing sub-domain, TKT-0001 in progress), `.agents/plans/` (16 plans incl. `admin-org-profile-full-build.md`, `admin-org-schema-reconnect.md` [Complete], `admin-dashboard-usability-fixes.md`, `admin-ui-wiring-completion-plan.md`, phase 0–9), `docs/work-packets/TA-PH0.md` (test entry path + five-city release checks for hiring/tour verification).
- **Domain backlog/state:** `docs/engineering/agents/organization/BACKLOG.md` (empty candidate list), `STATE.md` (bootstrap).

## Working-set discrepancy (found during audit)

`docs/engineering/agents/organization/WORKING_SET.json` and `ARCHITECTURE.md` declare `lib/organization/**`, but that directory does not exist. The real org-domain library paths are `lib/organizations/` (subtypes), `lib/public-organization/` (DTO), and `lib/admin/tour-*` / `lib/auth/org-command.ts` (tours + command layer). Additional org/tours surfaces outside the declared working set: `app/api/admin/organization/**`, `app/api/admin/tours/**`, `app/api/organization/**`, `app/admin/dashboard/organization/**`, `app/admin/dashboard/tours/**`, `components/admin/organization/**`, `components/admin/tours/**`, `lib/admin/organization-workspace-tabs.ts`, `lib/discover/tours.ts`. This is recorded in GAPS.md and the ORG-001 checkpoint.