# Tourify Admin — Organization Profile Full Build Plan

**Prepared:** 2025-07-25  
**Revised:** 2025-07-25 (post-codebase audit)  
**Author:** Plan mode (Bob)  
**Purpose:** Comprehensive handoff document for building out the Organization Profile section of the Tourify admin dashboard. Covers every domain in docs 00–14, staged in phases, with per-task acceptance criteria, file references, and continuous status tracking. This file is the source of truth for the implementing agent.

---

## 1. Program Context and Audit Summary

### What is already done

All 362 domain-model tasks (phases 0–6) in `.agents/admin-feature-spec-builder/PROGRESS.md` are `done`. All 18 UI-wiring groups (W0–W18) in `.agents/admin-ui-wiring/PROGRESS.md` are `done`. The admin platform has:

- 48 deployed admin dashboard pages
- 100+ real React components wired to real APIs
- 50+ API endpoint groups with RLS + capability gates
- 255 passing Phase 6 domain-model tests
- TypeScript build at 0 errors (`tsc --noEmit`)
- Immutable audit trail, outbox publication, capability-aware sidebar, multi-account switcher

### Current state of `app/admin/dashboard/organization/page.tsx`

The file is already a **260-line, fully-structured tabbed hub** (not the 71-line stub described in the original brief). It already has:

- All 16 tabs with capability gates
- URL-preserved tab state via `?tab=` param
- `AdminPageHeader` with `Building2` / `Music` icons and correct titles
- Team tab with `BandHub` / `OrgTeamGrantsPanel` preserved
- All 14 non-Team tabs rendering `<TabPlaceholder>` stubs

**A1 (tabbed hub conversion) is therefore already complete.** Work begins at A2.

### The gap this plan closes

Every non-Team tab is a `<TabPlaceholder>` stub. This plan fills each tab with real components wired to real APIs. The two directories that do not yet exist and must be created:

- `app/api/admin/organization/` — all new API routes
- `components/admin/organization/` — all new panel components

### Hard constraints (non-negotiable)

| Constraint | Rule |
|---|---|
| No DB reset | `supabase db reset` is forbidden |
| Additive only | Extend pages/components; never rewrite or gut working surfaces |
| No mock data in live UI | Wire real APIs or use explicit `unavailable` states |
| Design consistency | `AdminPageHeader`, `AdminEmptyState`, card token `bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm` |
| Capability-gated UI | Controls disabled/hidden until capability resolution completes |
| TS build stays clean | `tsc --noEmit` must pass 0 errors after every sub-task |
| Continuous ledger | Update this plan's `Status` field + append to `.agents/admin-feature-spec-builder/TASK_LOG.md` after each task |
| No commits | Unless the user explicitly asks |

---

## 2. Phase Staging

```
Phase A — Sidebar fix + hub verification
Phase B — Platform & Security Governance   (docs 01 + 14)
Phase C — Tour Portfolio Governance        (docs 02 + 03)
Phase D — Publishing & Communications      (docs 04 + 12)
Phase E — Workforce & Hiring Governance    (doc 06)
Phase F — Commercial Governance            (docs 09 + 10 + 11)
Phase G — Reporting & Observability        (docs 13 + 14)
Phase H — Ledger Finalization
```

Phases run sequentially. Within each phase, sub-tasks are ordered by dependency.

---

## 3. Sub-Tasks

---

### PHASE A — Hub Verification & Sidebar Fix

---

#### A1 — [ALREADY COMPLETE] Tabbed Hub Architecture

- **Status:** `[x] done`
- **Note:** The 260-line `app/admin/dashboard/organization/page.tsx` already implements the full 16-tab hub with URL-preserved tab state, capability gates, and `AdminPageHeader`. No work required.

---

#### A2 — Sidebar: Upgrade Organization Nav Label

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/01_Platform_Tenancy_RBAC_and_Audit.md` (SEC-205)
- **Intent:** The sidebar still shows label `"Organization team"` — upgrade to `"Organization"` to match the page hub title. One-line change.
- **Acceptance Criteria:**
  - `[x]` `optimized-sidebar.tsx` label changed from `"Organization team"` to `"Organization"`
  - `[x]` Band subtype label `"Band Hub"` remains unchanged
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `app/admin/dashboard/components/optimized-sidebar.tsx` lines 285–295 to confirm exact text
  2. Change `"Organization team"` to `"Organization"` (one replacement)
  3. Run `tsc --noEmit`
  4. Update status to `[x] done`, append log entry to `.agents/admin-feature-spec-builder/TASK_LOG.md`
- **Key files:**
  - `app/admin/dashboard/components/optimized-sidebar.tsx` line ~287

---

### PHASE B — Platform & Security Governance

---

#### B1 — Settings Tab: Org Display Config

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/01_Platform_Tenancy_RBAC_and_Audit.md` (ADR-001, SEC-002), `docs/admin-feature-specs/10_Finance_Budgets_Expenses_and_Settlements.md` (ADR-010 — time/currency), `docs/admin-feature-specs/14_QA_Observability_Migrations_and_Deployment.md` (REL-008 — feature flags)
- **Intent:** Build the Settings tab showing org display configuration: org name/type (read-only), default time zone selector, base currency selector, and org feature flags list. Mutations include `expectedVersion` for conflict safety.
- **Acceptance Criteria:**
  - `[x]` `components/admin/organization/org-settings-panel.tsx` created
  - `[x]` Panel shows: org display name (read-only), org type/subtype (read-only), default time zone (IANA zone selector, editable with `org.settings.manage`), base currency (ISO 4217 selector, editable), feature flags list (flag name, status, environment, owner — from `GET /api/admin/features`)
  - `[x]` Save uses `PATCH /api/admin/organization/settings` with `expectedVersion`; 409 conflicts show `"Settings changed elsewhere — please reload"` message
  - `[x]` Without `org.settings.manage`: all inputs render as read-only display
  - `[x]` `GET /PATCH /api/admin/organization/settings` route created, scoped to `admin.orgId`, `PATCH` gated on `org.settings.manage`
  - `[x]` Feature flag data sourced by calling `GET /api/admin/features` (already exists)
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `app/api/admin/features/route.ts` lines 1–40 to confirm feature flag response shape (already researched: `{ definitions[], assignments[], orgId }`)
  2. Read existing `org` settings data shape from DB (check `supabase` types for `org_settings` or `organizations` table — check `types/supabase.ts` for the relevant table shape)
  3. Create `app/api/admin/organization/settings/route.ts` — GET returns org display_name, time_zone, base_currency; PATCH updates time_zone + base_currency with version check
  4. Create `components/admin/organization/org-settings-panel.tsx`
  5. In `app/admin/dashboard/organization/page.tsx`, replace the `settings` `<TabPlaceholder>` with `<OrgSettingsPanel organizerAccountId={organization.profile_id} />`
  6. Run `tsc --noEmit`
  7. Update status, append log
- **Key files:**
  - `app/api/admin/organization/settings/route.ts` — new
  - `components/admin/organization/org-settings-panel.tsx` — new
  - `app/api/admin/features/route.ts` — reuse existing for feature flag data
  - `app/api/admin/workforce/attendance/route.ts` — `withAdminCapability` pattern reference

---

#### B2 — Security Tab: RBAC & Access Health Summary

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/01_Platform_Tenancy_RBAC_and_Audit.md` (SEC-602, SEC-604)
- **Intent:** Build the Security tab as a summary and deep-link surface to the existing full RBAC page. Shows key counts (members, roles, entity grants, open access reviews) and recent denied-access count from `security_audit_events`.
- **Acceptance Criteria:**
  - `[x]` `components/admin/organization/org-security-summary-panel.tsx` created
  - `[x]` Shows: active member count + "Manage Members" → `/admin/dashboard/rbac?tab=membership`; custom role count + "Manage Roles" → `/admin/dashboard/rbac?tab=roles`; entity grant count (expiring within 7 days highlighted) + "View Grants" → `/admin/dashboard/rbac?tab=grants`; open access review items → `/admin/dashboard/rbac?tab=review`; auth denial count last 24h from `security_audit_events where result = 'denied'` (gracefully unavailable if table missing); "View Audit Log" → `/admin/dashboard/settings/audit`
  - `[x]` `GET /api/admin/organization/security-summary` route created — queries org_members count, organization_roles count, entity_grants count + expiring-soon count, security_audit_events denied count in last 24h (each sub-query wrapped in try/catch with graceful null on 42P01)
  - `[x]` Panel uses `PanelState = "idle" | "loading" | "ready" | "unavailable" | "error"` state machine
  - `[x]` Requires `audit.view` or `org.roles.manage`
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Create `app/api/admin/organization/security-summary/route.ts`
  2. Create `components/admin/organization/org-security-summary-panel.tsx`
  3. Replace `security` `<TabPlaceholder>` in `page.tsx` with `<OrgSecuritySummaryPanel organizerAccountId={organization.profile_id} />`
  4. Run `tsc --noEmit`
  5. Update status, append log
- **Key files:**
  - `app/api/admin/organization/security-summary/route.ts` — new
  - `components/admin/organization/org-security-summary-panel.tsx` — new
  - `app/api/admin/audit/route.ts` — `withAdminAuth` + org-scoping pattern reference

---

#### B3 — Audit Tab: Org-Scoped Audit Log

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/01_Platform_Tenancy_RBAC_and_Audit.md` (SEC-111, SEC-604)
- **Intent:** Surface an org-scoped, filterable audit log directly inside the org profile. Reuses the existing `GET /api/admin/audit` route (already org-scoped). The `action` filter is added as an additive extension to that route.
- **Acceptance Criteria:**
  - `[x]` `components/admin/organization/org-audit-log-panel.tsx` created
  - `[x]` Panel shows a paginated list of audit events scoped to current org, defaulting to last 50 events
  - `[x]` Filters: action (dropdown — added additively to `GET /api/admin/audit`), actor search (text), entity type (text), date range (from/to)
  - `[x]` Each row: timestamp (local), actor display name or `[system]`, action badge, entity type + truncated ID, result badge
  - `[x]` Protected fields (before/after diff) only shown with `audit.view` + `org.roles.manage`
  - `[x]` "Export CSV" button for authorized users — calls `/api/admin/audit?format=csv`
  - `[x]` "Open Full Log" link → `/admin/dashboard/settings/audit`
  - `[x]` Empty state: `"No audit events match these filters."` — never hides errors as empty
  - `[x]` `GET /api/admin/audit` extended with optional `action` query param (additive — `.eq("action", action)` if param present)
  - `[x]` Requires `audit.view` capability
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `app/api/admin/audit/route.ts` lines 15–60 to find where existing filter params are applied — add `action` param in the same pattern
  2. Read `app/admin/dashboard/settings/audit/page.tsx` for UI row-rendering patterns to reuse
  3. Extend `app/api/admin/audit/route.ts` with `action` filter param
  4. Create `components/admin/organization/org-audit-log-panel.tsx`
  5. Replace `audit` `<TabPlaceholder>` in `page.tsx` with `<OrgAuditLogPanel />`
  6. Run `tsc --noEmit`
  7. Update status, append log
- **Key files:**
  - `components/admin/organization/org-audit-log-panel.tsx` — new
  - `app/api/admin/audit/route.ts` — extend with `action` filter (additive only)
  - `app/admin/dashboard/settings/audit/page.tsx` — UI row patterns reference

---

#### B4 — Capabilities Tab: Org Capability Tier Display

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/01_Platform_Tenancy_RBAC_and_Audit.md` (SEC-102, SEC-205)
- **Intent:** Show the full capability surface for this organization, grouped by domain prefix. Uses the existing `GET /api/admin/effective-capabilities` endpoint. Read-only display — no capability write actions.
- **Acceptance Criteria:**
  - `[x]` `components/admin/organization/org-capabilities-panel.tsx` created
  - `[x]` Calls `GET /api/admin/effective-capabilities` for the resolved capability list
  - `[x]` Groups capabilities by domain prefix (16 groups based on the 42 known capability strings from `lib/auth/admin-capabilities.ts`): `org`, `audit`, `tour`, `event`, `routing`, `advance`, `logistics`, `workforce`, `hiring`, `vendor`, `contract`, `finance`, `ticketing`, `site_map`, `communications`, `content`
  - `[x]` Each capability row shows: string name, enabled/disabled badge
  - `[x]` Count badge per domain group
  - `[x]` "Manage Roles" CTA → `/admin/dashboard/rbac?tab=roles`
  - `[x]` Read-only — no write controls
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `lib/auth/admin-capabilities.ts` lines 1–80 to get the full capability string array (already researched: 42 strings across 16 domain prefixes)
  2. Create `components/admin/organization/org-capabilities-panel.tsx` — define domain groupings as a static const keyed by prefix
  3. Replace `capabilities` `<TabPlaceholder>` in `page.tsx` with `<OrgCapabilitiesPanel />`
  4. Run `tsc --noEmit`
  5. Update status, append log
- **Key files:**
  - `components/admin/organization/org-capabilities-panel.tsx` — new
  - `app/api/admin/effective-capabilities/route.ts` — reuse existing (returns `{ capabilities[], orgId, membershipRole }`)
  - `lib/auth/admin-capabilities.ts` — capability string source for grouping

---

#### B5 — Retention Tab: Retention Controls Summary

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/01_Platform_Tenancy_RBAC_and_Audit.md` (SEC-605)
- **Intent:** Mount the existing `RetentionControlsPanel` (already built) into the org profile Retention tab, wrapped with an org-level summary header showing which domains have active policies.
- **Acceptance Criteria:**
  - `[x]` `components/admin/organization/org-retention-summary-panel.tsx` created as a thin wrapper
  - `[x]` Wrapper renders: summary header `"Data Retention Policies"` with description text, then mounts `<RetentionControlsPanel />` below
  - `[x]` Summary section shows a domain status table: audit logs, finance records, tickets, contracts, personnel data, incidents, documents — each showing `configured / not configured / legal hold`
  - `[x]` "Manage in Detail" link → `/admin/dashboard/rbac?tab=retention`
  - `[x]` Requires `org.settings.manage` + `audit.view`
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `components/admin/rbac/retention-controls-panel.tsx` lines 1–30 to confirm it takes no required props (internal `useActingContext()` — confirmed)
  2. Create `components/admin/organization/org-retention-summary-panel.tsx`
  3. Replace `retention` `<TabPlaceholder>` in `page.tsx` with `<OrgRetentionSummaryPanel />`
  4. Run `tsc --noEmit`
  5. Update status, append log
- **Key files:**
  - `components/admin/organization/org-retention-summary-panel.tsx` — new
  - `components/admin/rbac/retention-controls-panel.tsx` — imported as-is (no props)

---

### PHASE C — Tour Portfolio Governance

---

#### C1 — Tours Tab: Portfolio Health Dashboard

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/02_Tour_Portfolio_Lifecycle_and_Command_Center.md` (TOUR-301, TOUR-302, TOUR-401, TOUR-501)
- **Intent:** Build the Tours tab as a portfolio-level health dashboard with lifecycle state counts and health signal rows (route conflicts, missing logistics, uncovered staffing, overdue advances, contract risk, budget variance).
- **Acceptance Criteria:**
  - `[x]` `components/admin/organization/org-tours-health-panel.tsx` created
  - `[x]` Lifecycle state summary: count badges for `draft | planning | ready | published | active | completed | settled | cancelled | archived`
  - `[x]` Health signal rows (from `lib/admin/tour-health-aggregation.ts` + `tour-live-health.ts`): tours with unresolved route conflicts, tours with missing travel/lodging, tours with uncovered critical staffing, tours with overdue advance sections, tours with contract/compliance risk, tours with budget variance > threshold (gated on `finance.view`)
  - `[x]` Each signal row: count + "View affected tours" link → filtered `/admin/dashboard/tours`
  - `[x]` Unknown/stale signal shows `—` with freshness timestamp, never `0`
  - `[x]` "View All Tours" button → `/admin/dashboard/tours`
  - `[x]` `GET /api/admin/organization/tours-health` route created — queries tour counts by state + joins health signal aggregates
  - `[x]` Graceful unavailable (42P01) for any missing health table
  - `[x]` Requires `tour.view`
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `lib/admin/tour-health-aggregation.ts` lines 1–60 for health signal type definitions (note: `tour-health-signals.ts` does not exist — use this file)
  2. Read `lib/admin/tour-live-health.ts` lines 1–60 for live health type definitions
  3. Create `app/api/admin/organization/tours-health/route.ts`
  4. Create `components/admin/organization/org-tours-health-panel.tsx`
  5. Replace `tours` `<TabPlaceholder>` in `page.tsx` with `<OrgToursHealthPanel organizerAccountId={organization.profile_id} />`
  6. Run `tsc --noEmit`
  7. Update status, append log
- **Key files:**
  - `app/api/admin/organization/tours-health/route.ts` — new
  - `components/admin/organization/org-tours-health-panel.tsx` — new
  - `lib/admin/tour-health-aggregation.ts` — health signal types
  - `lib/admin/tour-live-health.ts` — live health types
  - `app/api/admin/tours/route.ts` — reuse state-count query pattern

---

#### C2 — Tours Tab: Saved Views Management

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/02_Tour_Portfolio_Lifecycle_and_Command_Center.md` (TOUR-209)
- **Intent:** Add a "Saved Views" section within the Tours tab letting org admins manage org-scoped portfolio views. Personal views shown read-only.
- **Acceptance Criteria:**
  - `[x]` `components/admin/organization/org-saved-views-panel.tsx` created
  - `[x]` Lists saved views: name, description, filter summary, creator, visibility badge (org/personal)
  - `[x]` "Open View" links → `/admin/dashboard/tours?view=<id>`
  - `[x]` Create new org view: name + description, save button (requires `tour.manage`)
  - `[x]` Delete org view with confirmation dialog (requires `tour.manage`)
  - `[x]` Personal views read-only in this panel (shown with `(personal)` label, no delete)
  - `[x]` Uses existing `GET /api/admin/tours/saved-views` (already confirmed to exist with `{ views[] }` response)
  - `[x]` POST to create, DELETE to `app/api/admin/tours/saved-views/[id]/route.ts`
  - `[x]` Unavailable state if `tour_saved_views` table missing
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `app/api/admin/tours/saved-views/route.ts` in full to confirm GET + POST shapes
  2. Read `app/api/admin/tours/saved-views/[id]/route.ts` to confirm DELETE
  3. Create `components/admin/organization/org-saved-views-panel.tsx`
  4. Mount below `<OrgToursHealthPanel>` inside the `tours` TabsContent with a `<Separator />` divider
  5. Run `tsc --noEmit`
  6. Update status, append log
- **Key files:**
  - `components/admin/organization/org-saved-views-panel.tsx` — new
  - `app/api/admin/tours/saved-views/route.ts` — already exists
  - `app/api/admin/tours/saved-views/[id]/route.ts` — already exists

---

### PHASE D — Publishing & Communications Governance

---

#### D1 — Publishing Tab: Publication SLO + Delivery Dashboard

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/04_Publication_Sharing_and_Work_Mode.md` (PUB-601, PUB-205)
- **Intent:** Build the Publishing tab showing org-level publication health: outbox queue depth/age, delivery success/failure rates, dead-letter items, expiring share tokens, and unacknowledged publications. Uses `PublicationSloMetrics` from `lib/admin/pub-phase6.ts`.
- **Acceptance Criteria:**
  - `[x]` `components/admin/organization/org-publication-slo-panel.tsx` created
  - `[x]` Shows: outbox queue depth + oldest item age; delivery success rate 7-day rolling (`X%` or `—`); failed delivery count with "Retry all failed" (requires `tour.publish`); dead-letter item count + "Review" link → `/admin/dashboard/publications/deliveries`; share tokens expiring in 7 days count; unacknowledged publications count by type
  - `[x]` `GET /api/admin/organization/publication-health` route created — queries outbox table for queue stats, delivery stats, token expiry, ack status; each sub-query gracefully handles 42P01
  - `[x]` Panel state machine: `"idle" | "loading" | "ready" | "unavailable" | "error"`
  - `[x]` Requires `tour.publish`
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `lib/admin/pub-phase6.ts` lines 1–80 for `PublicationSloMetrics` type definition (key fields: queueAgeP95Seconds, successRatePct, deadLetterCount, ackRatePct)
  2. Create `app/api/admin/organization/publication-health/route.ts`
  3. Create `components/admin/organization/org-publication-slo-panel.tsx`
  4. Replace `publishing` `<TabPlaceholder>` in `page.tsx` with `<OrgPublicationSloPanel />`
  5. Run `tsc --noEmit`
  6. Update status, append log
- **Key files:**
  - `app/api/admin/organization/publication-health/route.ts` — new
  - `components/admin/organization/org-publication-slo-panel.tsx` — new
  - `lib/admin/pub-phase6.ts` — `PublicationSloMetrics` type source

---

#### D2 — Communications Tab: Notification Preferences + Calendar SLO

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/12_Calendar_Communications_and_Notifications.md` (COMMS-404, CAL-601)
- **Intent:** Build the Communications tab with two sections: (1) org-level notification preferences (channel opt-in, quiet hours, digest config) and (2) calendar source freshness summary per source (from `CalSourceHealth` in `lib/admin/comms-sec-phase6.ts`).
- **Acceptance Criteria:**
  - `[x]` `components/admin/organization/org-communications-panel.tsx` created with two sections
  - `[x]` Section 1 — Notification Preferences: in-app (always on, fixed label), email toggles per category (operational/commercial/security/emergency — editable with `org.settings.manage`), quiet hours (start + end + time zone — editable), emergency override always-on badge; "Save Preferences" button
  - `[x]` Section 2 — Calendar Source Health (CAL-601): per-source freshness cards for: tours, events, staffing shifts, travel segments, logistics tasks, obligations; each shows source name, last-updated timestamp, lag (minutes/hours), status badge (`fresh / stale / error / unavailable`); stale threshold: > 15 minutes; "View Calendar" → `/admin/dashboard/calendar`
  - `[x]` Calendar freshness sourced from existing `GET /api/admin/analytics/freshness` (already confirmed to exist; returns `{ sources[] }` with `isStale`, `lastCompletedAt`)
  - `[x]` `GET /PATCH /api/admin/organization/communications-settings` route created for notification preferences
  - `[x]` Requires `communications.send` or `org.settings.manage`
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `lib/admin/comms-sec-phase6.ts` lines 1–60 for `CalSourceHealth` and `CalSourceType` types
  2. Read `app/api/admin/analytics/freshness/route.ts` lines 1–50 to confirm source IDs map to calendar domains
  3. Create `app/api/admin/organization/communications-settings/route.ts`
  4. Create `components/admin/organization/org-communications-panel.tsx`
  5. Replace `communications` `<TabPlaceholder>` with `<OrgCommunicationsPanel />`
  6. Run `tsc --noEmit`
  7. Update status, append log
- **Key files:**
  - `app/api/admin/organization/communications-settings/route.ts` — new
  - `components/admin/organization/org-communications-panel.tsx` — new
  - `lib/admin/comms-sec-phase6.ts` — `CalSourceHealth`, `CalSourceType` types
  - `app/api/admin/analytics/freshness/route.ts` — reuse for calendar SLO data

---

### PHASE E — Workforce & Hiring Governance

---

#### E1 — Workforce Tab: Org-Level Workforce Settings

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/06_Workforce_Hiring_Roster_and_Scheduling.md` (HIRE-404, WORK-405, WORK-406, HIRE-406)
- **Intent:** Build the Workforce tab showing org-level workforce governance across four sections: onboarding template summary, labor rule profile, credential requirement policies, and identity conversion pipeline.
- **Acceptance Criteria:**
  - `[x]` `components/admin/organization/org-workforce-settings-panel.tsx` created with four sections
  - `[x]` Section 1 — Onboarding Templates (from `lib/admin/hiring-onboarding-template.ts`): active template name, version, status badge, last-updated, item counts; "Manage Templates" → `/admin/dashboard/hiring`
  - `[x]` Section 2 — Labor Rule Profile: active profile badge (from `live-work-phase6.ts` live ops types), org override reason if custom, profile detail categories; requires `workforce.manage` to see details
  - `[x]` Section 3 — Credential Requirements: table of role types + required credential types + missing/expiring count; alert badge for credentials expiring within 30 days
  - `[x]` Section 4 — Identity Conversion Pipeline (from `lib/admin/hiring-identity-conversion.ts`): pending conversions count + "Review" link; failed conversions + "Retry" (requires `hiring.manage`); last conversion timestamp
  - `[x]` `GET /api/admin/organization/workforce-settings` route created — aggregates onboarding template, labor profile, credential requirements, conversion pipeline; each sub-query gracefully handles 42P01
  - `[x]` Requires `workforce.manage` or `hiring.manage`
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `lib/admin/hiring-onboarding-template.ts` lines 1–50 for template type definitions
  2. Read `lib/admin/hiring-identity-conversion.ts` lines 1–50 for ConversionRecord type
  3. Read `lib/admin/live-work-phase6.ts` lines 1–60 for labor/credential SLO types (note: file exports `LiveOpsObservabilityMetrics` — check if labor profiles are here or in another file)
  4. Create `app/api/admin/organization/workforce-settings/route.ts`
  5. Create `components/admin/organization/org-workforce-settings-panel.tsx`
  6. Replace `workforce` `<TabPlaceholder>` with `<OrgWorkforceSettingsPanel />`
  7. Run `tsc --noEmit`
  8. Update status, append log
- **Key files:**
  - `app/api/admin/organization/workforce-settings/route.ts` — new
  - `components/admin/organization/org-workforce-settings-panel.tsx` — new
  - `lib/admin/hiring-onboarding-template.ts` — onboarding template types
  - `lib/admin/hiring-identity-conversion.ts` — conversion pipeline types
  - `lib/admin/live-work-phase6.ts` — labor/live ops types

---

### PHASE F — Commercial Governance

---

#### F1 — Finance Tab: Approval Policies + FX Config

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/10_Finance_Budgets_Expenses_and_Settlements.md` (FIN-505, FIN-511, FIN-601)
- **Intent:** Build the Finance tab with three sections: approval policy summary (from `lib/admin/finance-domain.ts`), FX configuration (from `lib/admin/commercial-phase6.ts`), and reconciliation health.
- **Acceptance Criteria:**
  - `[x]` `components/admin/organization/org-finance-settings-panel.tsx` created with three sections
  - `[x]` Section 1 — Approval Policy Summary: table of action type | amount threshold | required approvers | SoD | status; rows: expense submission, PO creation, settlement approval, refund authorization; "Manage Policies" link; requires `finance.approve` to view thresholds
  - `[x]` Section 2 — FX Configuration: active rate source (manual/provider), last-updated + `stale` badge if > 24h, base currency, reporting currency; "FX rate unavailable" warning if no rate loaded
  - `[x]` Section 3 — Reconciliation Health (FIN-601): unmatched invoice count, outstanding cash advances count (overdue highlighted), unsettled completed shows, failed finance exports; "View Finance" → `/admin/dashboard/finances`
  - `[x]` `GET /api/admin/organization/finance-settings` route created
  - `[x]` Finance tab suppressed/empty without `finance.view`; thresholds suppressed without `finance.approve`
  - `[x]` Graceful unavailable for missing tables
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `lib/admin/finance-domain.ts` lines 1–60 for approval policy type definitions
  2. Read `lib/admin/commercial-phase6.ts` lines 1–80 for FX + reconciliation observability types
  3. Create `app/api/admin/organization/finance-settings/route.ts`
  4. Create `components/admin/organization/org-finance-settings-panel.tsx`
  5. Replace `finance` `<TabPlaceholder>` with `<OrgFinanceSettingsPanel />`
  6. Run `tsc --noEmit`
  7. Update status, append log
- **Key files:**
  - `app/api/admin/organization/finance-settings/route.ts` — new
  - `components/admin/organization/org-finance-settings-panel.tsx` — new
  - `lib/admin/finance-domain.ts` — approval policy types
  - `lib/admin/commercial-phase6.ts` — FX + reconciliation types

---

#### F2 — Vendors Tab: Vendor & Contract Governance

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/11_Vendors_Procurement_and_Contracts.md` (VEND-502, VEND-601, CONT-507)
- **Intent:** Build the Vendors tab with three sections: vendor master summary, compliance alerts, and contract health.
- **Acceptance Criteria:**
  - `[x]` `components/admin/organization/org-vendor-governance-panel.tsx` created with three sections
  - `[x]` Section 1 — Vendor Master Summary: count by status (approved/preferred/evaluating/restricted/inactive); count by top 5 categories; "Manage Vendors" → `/admin/dashboard/contracts?tab=vendor-master`
  - `[x]` Section 2 — Compliance Alerts (VEND-502): compliance docs expiring within 30 days (count + list: vendor name, doc type, expiry); pending verification count; expired docs count (red badge); "Manage Compliance" link
  - `[x]` Section 3 — Contract Health (CONT-507): contracts expiring within 90 days (count + list: name, counterparty, expiry); overdue obligations count; stalled signature envelopes > 14 days; "Manage Contracts" → `/admin/dashboard/contracts?tab=contracts`
  - `[x]` `GET /api/admin/organization/vendor-governance` route created — uses sub-queries to existing vendors + contracts data
  - `[x]` Reuses existing `GET /api/admin/vendors` and `GET /api/admin/contracts` response shapes for queries
  - `[x]` Requires `vendor.view` or `contract.view`
  - `[x]` Graceful unavailable for missing tables
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `app/api/admin/vendors/route.ts` lines 1–60 for vendor data shape (confirmed: `{ vendors[], total }` with status, vendorType fields)
  2. Read `app/api/admin/contracts/route.ts` lines 1–60 for contract shape (confirmed: `{ contracts[], summary }` with expiresAt field)
  3. Create `app/api/admin/organization/vendor-governance/route.ts`
  4. Create `components/admin/organization/org-vendor-governance-panel.tsx`
  5. Replace `vendors` `<TabPlaceholder>` with `<OrgVendorGovernancePanel />`
  6. Run `tsc --noEmit`
  7. Update status, append log
- **Key files:**
  - `app/api/admin/organization/vendor-governance/route.ts` — new
  - `components/admin/organization/org-vendor-governance-panel.tsx` — new
  - `app/api/admin/vendors/route.ts` — query pattern reference
  - `app/api/admin/contracts/route.ts` — query pattern reference

---

#### F3 — Ticketing Tab: Org-Level Ticketing Configuration

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/09_Ticketing_Admissions_and_Guest_Lists.md` (TIX-104, TIX-509, TIX-512)
- **Intent:** Build the Ticketing tab with three sections: legacy/canonical convergence status, scanner device fleet summary, and provider webhook health.
- **Acceptance Criteria:**
  - `[x]` `components/admin/organization/org-ticketing-settings-panel.tsx` created with three sections
  - `[x]` Section 1 — Legacy/Canonical Convergence (TIX-104): mismatch count (legacy vs canonical totals); `Clear` badge if delta = 0, `Blocked` badge if delta > 0; "Cutover blocked until delta = 0" notice when mismatched; "View Mismatch Details" → `/admin/dashboard/ticketing`
  - `[x]` Section 2 — Scanner Fleet (TIX-509): device count by status (active/revoked/lost); last sync timestamp (oldest device); "Manage Devices" → `/admin/dashboard/ticketing?tab=admissions`
  - `[x]` Section 3 — Provider Webhook Health (TIX-512): webhook provider + status (connected/error/not configured); last successful event timestamp; failed/unmatched event count last 24h; "View Ticketing" link
  - `[x]` `GET /api/admin/organization/ticketing-settings` route created — queries ticketing setup + device fleet + webhook status using data from existing ticketing tables
  - `[x]` Reuses shapes from `GET /api/admin/ticketing/setup` (`{ configs[] }`) and `GET /api/admin/ticketing/admissions` (`{ devices[], admissions }`)
  - `[x]` Requires `ticketing.manage` or `ticketing.view`
  - `[x]` Graceful unavailable for missing tables
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `app/api/admin/ticketing/setup/route.ts` lines 1–40 for ticketing config shape
  2. Read `app/api/admin/ticketing/admissions/route.ts` lines 1–40 for device + admissions shape
  3. Create `app/api/admin/organization/ticketing-settings/route.ts`
  4. Create `components/admin/organization/org-ticketing-settings-panel.tsx`
  5. Replace `ticketing` `<TabPlaceholder>` with `<OrgTicketingSettingsPanel />`
  6. Run `tsc --noEmit`
  7. Update status, append log
- **Key files:**
  - `app/api/admin/organization/ticketing-settings/route.ts` — new
  - `components/admin/organization/org-ticketing-settings-panel.tsx` — new
  - `app/api/admin/ticketing/setup/route.ts` — data shape reference
  - `app/api/admin/ticketing/admissions/route.ts` — data shape reference

---

### PHASE G — Reporting & Observability

---

#### G1 — Observability Tab: System Health + Deployment Gates

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/14_QA_Observability_Migrations_and_Deployment.md` (REL-601–611), `docs/admin-feature-specs/13_Reporting_Exports_and_Analytics.md` (REP-602)
- **Intent:** Build the Observability tab with four sections: recent export jobs, data quality alerts, feature flags, and a deployment readiness checklist.
- **Acceptance Criteria:**
  - `[x]` `components/admin/organization/org-observability-panel.tsx` created with four sections
  - `[x]` Section 1 — Export Jobs: recent 5 jobs (type, status, created, result) from `GET /api/admin/exports/jobs` (requires `content.view`); failed count last 24h; "View All Jobs" → `/admin/dashboard/analytics`
  - `[x]` Section 2 — Data Quality: alerts from `GET /api/admin/analytics/data-quality` (source, severity, description, first-seen); "All Clear" badge when no open alerts
  - `[x]` Section 3 — Feature Flags: active flags count + list (name, environment, default on/off, owner) from `GET /api/admin/features`; expired flags count (flags past expiry date); "Manage Flags" → `/admin/dashboard/features`
  - `[x]` Section 4 — Deployment Readiness Checklist: 5 program-level production gate items with status (pass/warn/unknown): tenant isolation, RLS cross-org denial tests, canonical sources documented, multi-table writes transactional, critical E2E paths defined; "View Roadmap" link to spec doc
  - `[x]` All three data sections reuse existing routes — no new API route needed
  - `[x]` Requires `audit.view`
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Confirm `GET /api/admin/exports/jobs` response shape (confirmed: `{ jobs[], freshAt }` — requires `content.view`)
  2. Confirm `GET /api/admin/analytics/data-quality` shape (confirmed: `{ alerts[], total, freshAt }`)
  3. Confirm `GET /api/admin/features` shape (confirmed: `{ definitions[], assignments[], orgId }`)
  4. Create `components/admin/organization/org-observability-panel.tsx` (no new API route — calls 3 existing routes)
  5. Replace `observability` `<TabPlaceholder>` with `<OrgObservabilityPanel />`
  6. Run `tsc --noEmit`
  7. Update status, append log
- **Key files:**
  - `components/admin/organization/org-observability-panel.tsx` — new
  - `app/api/admin/exports/jobs/route.ts` — reuse (confirmed exists)
  - `app/api/admin/analytics/data-quality/route.ts` — reuse (confirmed exists)
  - `app/api/admin/features/route.ts` — reuse (confirmed exists)

---

#### G2 — Reporting Tab: KPI Catalog + Freshness Config

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/13_Reporting_Exports_and_Analytics.md` (REP-001, REP-601, REP-602)
- **Intent:** Build the Reporting tab showing the governed KPI catalog grouped by domain and read-model freshness watermarks per domain.
- **Acceptance Criteria:**
  - `[x]` `components/admin/organization/org-reporting-config-panel.tsx` created with two sections
  - `[x]` Section 1 — KPI Catalog: grouped by domain (Operational / Commercial / Live Ops / Reporting/Exports); per KPI row: name, business question (short), formula hint, freshness SLO; count badge per group; financial KPIs hidden without `finance.view`; "View Analytics" → `/admin/dashboard/analytics`; KPI catalog defined as a static const in the component (sourced from the REP-001 domain model)
  - `[x]` Section 2 — Read-Model Freshness: per domain (tours, events, logistics, workforce, ticketing, finance, vendors); last-rebuilt timestamp, lag vs SLO, source event count; `stale` badge for any source > SLO; uses `GET /api/admin/analytics/freshness` (confirmed: returns `{ sources[] }` with `isStale`, `lastCompletedAt`, `completenessPercent`); "Rebuild" action for `audit.view` users
  - `[x]` Requires `tour.view` for basic KPIs, additionally `finance.view` for financial KPIs
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Search `lib/admin/` for KPI catalog file (grep for `REP-001` or `kpi-catalog` or `KpiDefinition`)
  2. Read `app/api/admin/analytics/freshness/route.ts` full file to confirm all source IDs (confirmed: tours, events, workforce, ticketing, finance, logistics)
  3. Create `components/admin/organization/org-reporting-config-panel.tsx`
  4. Replace `reporting` `<TabPlaceholder>` with `<OrgReportingConfigPanel />`
  5. Run `tsc --noEmit`
  6. Update status, append log
- **Key files:**
  - `components/admin/organization/org-reporting-config-panel.tsx` — new
  - `app/api/admin/analytics/freshness/route.ts` — reuse for freshness watermarks

---

#### G3 — Overview Tab: Org Identity + Health Summary Cards

- **Status:** `[x] done`
- **Source specs:** `docs/admin-feature-specs/02_Tour_Portfolio_Lifecycle_and_Command_Center.md` (TOUR-203), `docs/admin-feature-specs/01_Platform_Tenancy_RBAC_and_Audit.md` (SEC-102)
- **Intent:** Build the Overview tab as an org-level health dashboard. Shows org identity, 6 domain health summary cards, and quick-action links to each governance tab. Placed last in Phase G because it aggregates data from all other new routes.
- **Acceptance Criteria:**
  - `[x]` `components/admin/organization/org-overview-panel.tsx` created
  - `[x]` Shows org display name, type/subtype, active plan tier
  - `[x]` 6 health summary cards (each uses standard card chrome): Active tours count + link to Tours tab; open staffing gaps + link to Workforce tab; overdue advances count + link to events page; contracts expiring in 30 days + link to Vendors tab; pending finance approvals + link to Finance tab (gated on `finance.view`); publication delivery failures last 24h + link to Publishing tab
  - `[x]` Each card shows freshness timestamp; stale/failed data shows `—` with explicit label, never `0`
  - `[x]` `GET /api/admin/organization/overview` route created — queries tours count, open_roles count, overdue advance sections, expiring contracts (30d), pending finance approvals, failed deliveries (24h) — each sub-query wrapped in try/catch returning `null` on 42P01
  - `[x]` Route uses `withAdminCapability("tour.view", ...)` pattern
  - `[x]` Finance card suppressed without `finance.view`
  - `[x]` TypeScript build passes 0 errors
- **Todo:**
  1. Verify the new `app/api/admin/organization/tours-health/route.ts` (from C1) and `publication-health/route.ts` (from D1) are available to sub-query for the overview
  2. Create `app/api/admin/organization/overview/route.ts`
  3. Create `components/admin/organization/org-overview-panel.tsx`
  4. Replace `overview` `<TabPlaceholder>` in `page.tsx` with `<OrgOverviewPanel organizerAccountId={organization.profile_id} />`
  5. Run `tsc --noEmit`
  6. Update status, append log
- **Key files:**
  - `app/api/admin/organization/overview/route.ts` — new
  - `components/admin/organization/org-overview-panel.tsx` — new

---

### PHASE H — Ledger Finalization

---

#### H1 — Final Verification + Ledger Sync

- **Status:** `[x] done`
- **Intent:** After all Phase A–G sub-tasks complete, run a full verification pass. TypeScript build, no orphan imports, no broken nav links, no dead tabs.
- **Acceptance Criteria:**
  - `[x]` `tsc --noEmit` passes with 0 errors across the full workspace
  - `[x]` All 16 tabs on the organization profile page render without runtime errors (each shows correct content or explicit unavailable state — never a blank white area)
  - `[x]` All sub-task statuses in this plan file are `[x] done`
  - `[x]` `.agents/admin-feature-spec-builder/TASK_LOG.md` has a log entry for every sub-task A2–G3
  - `[x]` No new dead navigation links introduced (spot-check sidebar + tab deep-links)
  - `[x]` No mocks, hardcoded data, or `TODO` comments left in shipped code
- **Todo:**
  1. Run `tsc --noEmit` — fix any remaining errors
  2. Spot-check all 16 org profile tabs in dev mode
  3. Mark all pending statuses `[x] done` in this file
  4. Append final summary entry to `.agents/admin-feature-spec-builder/TASK_LOG.md`

---

## 4. New Files Created by This Plan

### API Routes (all under `app/api/admin/organization/`)
| Route | Task | Capability Gate |
|---|---|---|
| `overview/route.ts` | G3 | `tour.view` |
| `settings/route.ts` | B1 | `org.settings.manage` (GET relaxed) |
| `security-summary/route.ts` | B2 | `audit.view` or `org.roles.manage` |
| `communications-settings/route.ts` | D2 | `communications.send` or `org.settings.manage` |
| `workforce-settings/route.ts` | E1 | `workforce.manage` or `hiring.manage` |
| `finance-settings/route.ts` | F1 | `finance.view` |
| `vendor-governance/route.ts` | F2 | `vendor.view` or `contract.view` |
| `ticketing-settings/route.ts` | F3 | `ticketing.manage` or `ticketing.view` |
| `tours-health/route.ts` | C1 | `tour.view` |
| `publication-health/route.ts` | D1 | `tour.publish` |

### Components (all under `components/admin/organization/`)
| Component | Task |
|---|---|
| `org-overview-panel.tsx` | G3 |
| `org-settings-panel.tsx` | B1 |
| `org-security-summary-panel.tsx` | B2 |
| `org-audit-log-panel.tsx` | B3 |
| `org-capabilities-panel.tsx` | B4 |
| `org-retention-summary-panel.tsx` | B5 |
| `org-tours-health-panel.tsx` | C1 |
| `org-saved-views-panel.tsx` | C2 |
| `org-publication-slo-panel.tsx` | D1 |
| `org-communications-panel.tsx` | D2 |
| `org-workforce-settings-panel.tsx` | E1 |
| `org-finance-settings-panel.tsx` | F1 |
| `org-vendor-governance-panel.tsx` | F2 |
| `org-ticketing-settings-panel.tsx` | F3 |
| `org-observability-panel.tsx` | G1 |
| `org-reporting-config-panel.tsx` | G2 |

### Modified Files
| File | Change | Task |
|---|---|---|
| `app/admin/dashboard/components/optimized-sidebar.tsx` | Label `"Organization team"` → `"Organization"` | A2 |
| `app/api/admin/audit/route.ts` | Add optional `action` query filter (additive only) | B3 |
| `app/admin/dashboard/organization/page.tsx` | Replace 15 `<TabPlaceholder>` stubs with real panel components | A2–G3 (each task replaces its tab's stub) |

---

## 5. Existing Files Reused (not modified, except audit route)

| File | Used by |
|---|---|
| `app/api/admin/audit/route.ts` | B3 (+ additive action filter) |
| `app/api/admin/effective-capabilities/route.ts` | B4 |
| `app/api/admin/features/route.ts` | B1, G1 |
| `app/api/admin/tours/route.ts` | C1 |
| `app/api/admin/tours/saved-views/route.ts` | C2 |
| `app/api/admin/tours/saved-views/[id]/route.ts` | C2 |
| `app/api/admin/vendors/route.ts` | F2 |
| `app/api/admin/contracts/route.ts` | F2 |
| `app/api/admin/ticketing/setup/route.ts` | F3 |
| `app/api/admin/ticketing/admissions/route.ts` | F3 |
| `app/api/admin/exports/jobs/route.ts` | G1 |
| `app/api/admin/analytics/freshness/route.ts` | D2, G2 |
| `app/api/admin/analytics/data-quality/route.ts` | G1 |
| `components/admin/rbac/retention-controls-panel.tsx` | B5 |
| `components/admin/org-team-grants-panel.tsx` | Already mounted in Team tab — untouched |
| `components/admin/band-hub.tsx` | Already mounted in Team tab — untouched |
| `lib/admin/pub-phase6.ts` | D1 |
| `lib/admin/comms-sec-phase6.ts` | D2 |
| `lib/admin/commercial-phase6.ts` | F1, F2 |
| `lib/admin/live-work-phase6.ts` | E1 |
| `lib/admin/finance-domain.ts` | F1 |
| `lib/admin/hiring-onboarding-template.ts` | E1 |
| `lib/admin/hiring-identity-conversion.ts` | E1 |
| `lib/admin/tour-health-aggregation.ts` | C1 |
| `lib/admin/tour-live-health.ts` | C1 |
| `lib/auth/admin-capabilities.ts` | B4 (grouping) |

---

## 6. Design System Quick Reference

All new components must use:

```tsx
// Card chrome
<Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">

// Loading state
<CardContent className="p-4">
  <div className="flex items-center gap-2 text-slate-400 text-sm">
    <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-busy="true" />
    Loading…
  </div>
</CardContent>

// Unavailable state (graceful degradation)
<Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm">
  <CardContent className="p-4">
    <p className="text-sm text-slate-400">{unavailableReason}</p>
  </CardContent>
</Card>

// Error state
<Card className="bg-slate-900/60 border border-red-500/30 rounded-sm">
  <CardContent className="p-4">
    <p className="text-sm text-red-400">{errorMsg}</p>
    <Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}>
      <RefreshCw className="h-3 w-3 mr-1" /> Retry
    </Button>
  </CardContent>
</Card>
```

State machine for all panels:
```ts
type PanelState = "idle" | "loading" | "ready" | "unavailable" | "error"
```

Graceful DB-unavailable detection:
```ts
if (error.code === "42P01") {
  return NextResponse.json({ success: true, unavailable: true, unavailableReason: "..." })
}
```

API auth pattern:
```ts
export const GET = withAdminCapability("capability.string", async (request, { supabase, admin }) => {
  const orgId = admin.orgId
  // ...
})
```

---

## 7. Completed Checklist

When every sub-task below is `[x]`, the plan is complete.

- `[x]` A1 — Tabbed hub architecture (already complete)
- `[x]` A2 — Sidebar label update
- `[x]` B1 — Settings tab
- `[x]` B2 — Security tab
- `[x]` B3 — Audit tab (+ additive action filter on audit route)
- `[x]` B4 — Capabilities tab
- `[x]` B5 — Retention controls tab
- `[x]` C1 — Tours health tab
- `[x]` C2 — Saved views management (within tours tab)
- `[x]` D1 — Publishing SLO tab
- `[x]` D2 — Communications tab
- `[x]` E1 — Workforce settings tab
- `[x]` F1 — Finance settings tab
- `[x]` F2 — Vendor governance tab
- `[x]` F3 — Ticketing settings tab
- `[x]` G1 — Observability tab
- `[x]` G2 — Reporting config tab
- `[x]` G3 — Overview tab (built last — aggregates all other new routes)
- `[x]` H1 — Final verification + ledger sync
