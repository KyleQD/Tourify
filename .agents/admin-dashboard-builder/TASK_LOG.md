# Admin Dashboard Builder — Task Log

Append-only. Newest entries at the bottom.

---

## Log

### 2026-07-19 — `dash-home`

- **Surface:** `/admin/dashboard` → `optimized-dashboard-client.tsx`
- **Purpose:** Organizer command center for live ops health and next actions
- **Change:** Empty state now offers Create tour / Create event / Hiring hub CTAs; Quick Integration Row expanded with account-scoped Hiring Hub and Communications (canonical inbox) alongside logistics, finances, and staff
- **Integration:** Home deep-links into workforce + messaging with the same entity-scoped hiring query params as the sidebar
- **Files:** `app/admin/dashboard/components/optimized-dashboard-client.tsx`

### 2026-07-19 — `dash-entry`

- **Surface:** `/admin` → `app/admin/page.tsx`
- **Purpose:** Entry redirect into the admin command center
- **Change:** Forward search params through the redirect so scoped `/admin?...` links land on dashboard with context intact
- **Integration:** Preserves hiring/account query context at the admin root
- **Files:** `app/admin/page.tsx`

### 2026-07-19 — `ops-tours`

- **Surface:** `/admin/dashboard/tours` → `tours-page-client.tsx`
- **Purpose:** Tour management list for planning, advancing, and publishing runs
- **Change:** Pass `org_id`/`artist_id` through `normalizeTour` so ops-card roster/hiring links keep employer context; split empty state for filter misses vs no tours
- **Integration:** Tour cards can deep-link into workforce with correct entity scope
- **Files:** `app/admin/dashboard/tours/tours-page-client.tsx`

### 2026-07-19 — `ops-tours-id`

- **Surface:** `/admin/dashboard/tours/[id]`
- **Purpose:** Tour detail ops workspace (readiness, events, logistics, hiring)
- **Change:** Preserve `advance_status` when normalizing tour events so Tour readiness “Advance not started” reflects real advance progress
- **Integration:** Readiness metric now aligns with per-event advancing workflows
- **Files:** `app/admin/dashboard/tours/[id]/page.tsx`

### 2026-07-19 — `ops-tours-create`

- **Surface:** `/admin/dashboard/tours/create`
- **Purpose:** Entry point for creating a tour
- **Change:** Replace re-export with redirect to canonical Tour Builder, forwarding search params
- **Integration:** One create URL, one builder surface
- **Files:** `app/admin/dashboard/tours/create/page.tsx`

### 2026-07-19 — `ops-tours-builder`

- **Surface:** `/admin/dashboard/tours/builder`
- **Purpose:** Full tour operations builder (route, advance, logistics, finance, comms)
- **Change:** Site-map and handoff logistics links now carry `tourId` via admin ops helpers; handoff panel also links Communications and Events list
- **Integration:** Builder opens logistics/site maps in tour context and points to canonical platform surfaces after save
- **Files:** `app/admin/dashboard/tours/builder/page.tsx`

### 2026-07-19 — `ops-tours-planner`

- **Surface:** `/admin/dashboard/tours/planner`
- **Purpose:** Legacy planner entry → Tour Builder
- **Change:** Forward all search params; normalize `id`/`tour` aliases to `draft` for the builder
- **Integration:** Old planner bookmarks resume the canonical builder with context
- **Files:** `app/admin/dashboard/tours/planner/page.tsx`

### 2026-07-19 — `ops-events`

- **Surface:** `/admin/dashboard/events`
- **Purpose:** Event management list
- **Change:** Filter-aware empty state (clear filters vs create event)
- **Integration:** Matches tours list UX so operators do not think data is missing when filters hide rows
- **Files:** `app/admin/dashboard/events/events-page-client.tsx`

### 2026-07-19 — `ops-events-create` … `ops-logistics-sitemap-redirect`

- **ops-events-create:** Prefill selected/primary tour from `tourId` query on new event create
- **ops-events-planner:** Forward all params; normalize draft aliases to create console
- **ops-events-id:** Show Open tour when `tour_id` exists (else Add to tour)
- **ops-events-hq:** Sync active HQ tab into URL via `router.replace`
- **ops-events-advancing:** Add Day sheet action
- **ops-events-day-sheet:** Use `buildAdminSiteMapHref` with eventId
- **ops-events-check-in:** Empty tickets banner → event tickets tab (`door-check-in.tsx`)
- **ops-events-command:** Admin hiring hub link; replace APIs card with advancing/day-sheet/check-in
- **ops-calendar:** Accept `tourId`/`eventId` as scope aliases
- **ops-logistics:** Clearable “Tour scoped” chip when `tourId` present
- **ops-logistics-sitemap-redirect:** Forward entity/venue/display params into canonical site-map href

### 2026-07-19 — Workforce batch (`wf-*`)

- Hiring overview metric cards deep-link into hub tabs; empty create-job CTA
- Template library empty CTA; builder save → detail; Attach to job
- Legacy `/jobs` → hiring hub; jobs new/detail hero links; onboarding redirect preserves display_name/candidateId
- Applications/candidates/roster/scheduling/organization/rbac/staff integration CTAs and empty states

### 2026-07-19 — Commerce / Network / Content / System / Orphans / Components

- Commerce: ticketing empty CTA; enhanced redirect params; finances/marketplace/store/inventory cross-links; orders empty → store
- Network/Content/System: agencies→hiring, communications→network, content↔feed, analytics→finances, settings→audit, artists empty CTA
- Orphans: messages/shell apps/jobs/teams → canonical routes; create-tables/setup/reset-onboarding/debug/test-api disabled safely
- Components: LodgingManagement mounted on logistics accommodations; superseded components documented as wont-fix

### 2026-07-19 — INVENTORY COMPLETE

- Pointer set to `COMPLETE`
- 68 done / 22 wont-fix / 0 pending
- Constraints honored: no database reset, no commits

### 2026-07-31 — `wf-staff-operations-consolidation`

- **Surface:** `/admin/dashboard/staff`, `/admin/dashboard/payroll`, organizer sidebar
- **Purpose:** Make Staff Operations the primary post-hire crew command center while keeping Hiring Hub canonical for pre-hire work
- **Change:** Consolidated sidebar links; added legacy-tab redirects; rebuilt Staff Operations into overview/scheduling/team/analytics with a deterministic mixed action queue, account-scoped live updates, coverage/team summaries, and responsive custom staff channels; added a disconnected Payroll design workspace with no data calls or mock totals
- **Integration:** Added the account-scoped summary API, workforce notification category and deduplicated completion/request producers, existing-thread staff channels with active-roster validation and realtime messages, and an additive `staff` thread migration/index set
- **Verification:** Focused ESLint clean; Vitest `__tests__/admin/staff-operations.test.ts` 5/5; touched-file TypeScript filter clean (repository-wide TypeScript remains blocked by pre-existing generated-schema/service mismatches); local dev server started and auth redirect rendered, but protected pages could not be visually inspected without an authenticated browser session
- **Constraints:** No database reset, no mock live data, no commit, no unrelated cleanup

### 2026-07-31 — `ops-tours-quick-start`

- **Surface:** Canonical Tour Builder, tour Events dashboard, global Events list, Event Producer, tour Team tab, and public tour invitation claim page
- **Purpose:** Save a tour immediately, create a resumable atomic batch of real unscheduled event drafts, invite tour-only administrators, and hand off into event planning without duplicate records
- **Change:** Added the three-step quick-start wizard; idempotent event-batch API/RPC; nullable inquiry-draft schedule contract; placeholder-aware event cards; same-record Event Producer promotion; hashed seven-day invitations across user/email/SMS/copy channels; delivery-failure copy fallback; revocation; and transactional, identity-bound acceptance
- **Authorization:** Added scoped Admin context and list filtering, collaborator RLS for tour/event/team resources, target-aware command guards, no organization membership creation, and collaborator-only sidebar filtering that hides organization-wide resources
- **Verification:** Focused ESLint clean; quick-start/Event Producer tests 10/10; admin context and tour/event hardening tests 40/40; capability/navigation tests 10/10; RLS matrix 14 passed with 2 live tests skipped; migration scanner accepts this migration with its planned manifest (repository-wide scanner still fails on unrelated baseline migrations)
- **Limitations:** Full repository TypeScript remained impractical and the focused TypeScript graph reports only pre-existing account/venue schema mismatches; local Supabase SQL/E2E verification was unavailable because Docker was not running. The migration was not applied.
- **Constraints:** No database reset, no destructive migration, no mock live data, no commit, no unrelated cleanup

### 2026-07-31 — `ops-tours-quick-start-save-repair`

- **Surface:** Tour Builder event-save step and organizer dashboard sidebar statistics
- **Cause:** The quick-start schema/RPC migration was absent from the connected project; after applying it, the existing `events_v2` insert policy also blocked the atomic RPC. Independently, any optional dashboard reporting dependency could force `/api/admin/dashboard/stats` to return 503 and trigger the Next.js console overlay.
- **Change:** Applied the additive quick-start migration; added and applied an additive RLS repair that keeps the Data API wrapper security-invoker while moving the explicitly authorized event/assignment transaction into the private schema; changed dashboard stats to return available values plus unavailable-domain metadata; removed client console escalation and added request cancellation.
- **Verification:** Connected schema confirms both RPCs, invitation table, nullable draft timestamps, and public-invoker/private-definer boundaries; authenticated one-event creation succeeded inside a rolled-back transaction with zero persisted test rows; focused Vitest 19/19; focused ESLint clean; repository TypeScript clean; both quick-start migration manifests pass targeted validation.
- **Constraints:** No database reset, no destructive migration, no persisted smoke-test data, no commit, no unrelated cleanup

### 2026-07-31 — `ops-tours-invite-message-delivery`

- **Surface:** Tour Builder collaborator step and recipient notification inbox
- **Cause:** Existing-user delivery used `tour_collaboration_invite`, which is not allowed by the live notifications type constraint, so the invitation was saved but the recipient message insert failed.
- **Change:** Send the invitation as the supported `collaboration_invite` notification type with the secure claim link, inviter identity, tour context, action label, high priority, and seven-day expiration; preserve structured delivery errors; show “Invitation message sent” and “Message sent” only after successful delivery.
- **Integration:** The recipient receives the invitation in their personal notification inbox and can open the message directly into the tour invitation acceptance flow.
- **Verification:** Focused Vitest 8/8; focused ESLint clean; repository TypeScript clean; connected Supabase insert succeeded with the exact recipient message shape and the generated verification row was removed (zero persisted rows).
- **Constraints:** No database reset, no schema change, no retained test notification, no commit, no unrelated cleanup

### 2026-07-31 — `ops-events-producer-console-reorg`

- **Surface:** `/admin/dashboard/events/create` and the shared operations builder shell
- **Purpose:** Make event editing and downstream event workspaces reachable from one persistent, accessible navigation rail
- **Change:** Replaced the Event Producer's mode-filtered three-column layout with an opt-in two-column shell; moved summary, readiness, and conflicts into Overview/Review; split every producer domain into a visible edit topic; added real account-scoped tour assignment; and moved saved-event workspace destinations into the left rail with save-first locking and save-before-navigation behavior
- **Integration:** Workspace links resolve into the canonical event Overview, Logistics, Site map, Staff, Vendors, Tickets, Communications, and Day sheet tabs while shared-shell defaults preserve Tour Builder and artist Event Producer behavior
- **Verification:** Focused ESLint clean; Vitest `__tests__/admin/event-producer-builder.test.ts` 8/8; repository TypeScript clean; live route returned the expected authentication redirect with no route-level failure. Authenticated visual inspection was unavailable because the browser CLI/runtime and saved session were not present
- **Constraints:** No database reset, no schema/API contract change, no mock data, no commit, no unrelated cleanup; readiness calculation and publish blockers were preserved

### 2026-08-01 — `cmp-notification-center`

- **Surface:** Shared notification dropdown used by the global, admin, and venue navigation shells
- **Purpose:** Present one newest-first feed across Personal and active owned/co-owned accounts without changing the user's active identity
- **Change:** Replaced search, type filters, read-state tabs, and manual bulk-read controls with a local account picker; added compact account-aware rows, sticky date headings, skeletons, responsive viewport-safe chrome, constrained scrolling, contextual empty/error states, and accessible keyboard behavior
- **Integration:** Added reusable owned-account eligibility and presentation helpers plus combined multi-account notification scopes; successful opening now acknowledges unread rows across all eligible accounts, clears the bell immediately, preserves viewed accents until close, and coalesces realtime refreshes while ignoring self-generated read acknowledgements
- **Verification:** Focused ESLint clean; notification Vitest 20/20; focused TypeScript graph reports only pre-existing account-management and venue-service schema mismatches; the protected route rendered its authentication boundary without a framework error overlay or browser console errors, while authenticated dropdown inspection remained unavailable in the browser session
- **Constraints:** No database reset, no migration/RLS change, no mock live data, no commit, no unrelated cleanup

### 2026-08-17 — `com-ticketing-experience-unification`

- **Surface:** Organizer Ticketing overview, event-scoped ticket manager, admissions devices, and event door check-in
- **Purpose:** Make ticketing a coherent operations workspace while preserving the secure buyer and admissions lifecycle
- **Change:** Added a display-safe attendee ticket read model, event-workspace deep links, explicit scanner-device registration/selection, and consistent lifecycle-driven ticket UI primitives used by buyer routes
- **Integration:** Buyer wallet, receipt, pass, transfer, artist, venue, event operations, and door check-in now use the same canonical ticketing routes and event context rather than parallel or placeholder ticketing views
- **Files:** `app/api/ticketing/experience/route.ts`, `components/ticketing/ticketing-experience-ui.tsx`, `components/admin/ticketing/admissions-devices-panel.tsx`
