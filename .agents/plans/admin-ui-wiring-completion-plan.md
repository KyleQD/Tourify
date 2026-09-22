# Admin UI Wiring — Full Completion Plan

**Created:** 2026-07-24  
**Source of truth for task IDs:** `.agents/admin-ui-wiring/INVENTORY.md`  
**Live status tracked in:** `.agents/admin-ui-wiring/PROGRESS.md`  
**Spec references:** `docs/admin-feature-specs/` (docs 00–14)

---

## Overview

All 362 admin feature spec tasks (Phases 0–6) are complete. All 90 admin route surfaces are built. The **remaining work** is wiring the backend domain contracts — currently TypeScript models, unit tests, and service layers only — into persisted, organization-scoped APIs, capability-gated UI surfaces, and deterministic acceptance tests.

This plan covers **wiring groups W6–W18** (40 items). W0–W5 (18 items) are already done.

### Non-negotiable constraints

- **No DB reset.** Expand-only, additive migrations only.
- **No mock data in live UI.** Wire real APIs/Supabase, use explicit unavailable states.
- **Additive only.** Extend; do not rewrite or gut working surfaces.
- **Design consistency.** Use `AdminPageHeader`, `AdminEmptyState`, `AdminErrorCard`, `AdminPageSkeleton`, and existing admin chrome tokens.
- **Capability-gated UI.** Controls stay disabled/aria-busy until capability resolution completes.
- **After each task: update `PROGRESS.md` status to `done` and append to `TASK_LOG.md`.**

---

## Phases

| Phase | Groups | Items | Key domains |
|-------|--------|-------|------------|
| Phase A | W6–W10 | 10 | Quick-win wiring: ticketing, finance, workforce, logistics, analytics page widgets |
| Phase B | W11–W13 | 13 | RBAC/access review, full workforce ops, travel/logistics operations |
| Phase C | W14–W16 | 18 | Full ticketing, full finance/settlement, vendors & contracts |
| Phase D | W17–W18 | 8 | Reporting dashboards, exports, tour book, release gates |

---

## Phase A — Quick-Win Wiring (W6–W10)

### A.1 — `w6-ticketing-inventory`

- **Status:** `[ ] pending`
- **Intent:** Surface the canonical ticketing inventory ledger (append-only movement table) on the `/admin/dashboard/ticketing` page, replacing any empty/mock placeholder.
- **Expected Outcomes:**
  - The ticketing page shows a real inventory ledger table sourced from the canonical model (`lib/admin/ticketing-read-model.ts` / `TIX-502`).
  - Each row shows: movement type, quantity delta, reservation ID, event, timestamp, triggered-by.
  - Empty state shown when no movements exist; `denied` state when capability check fails.
  - Real API route: `GET /api/admin/ticketing/inventory` with org-scoped RLS.
- **Todo List:**
  1. Read `lib/admin/ticketing-read-model.ts` and `lib/admin/ticketing-command.service.ts` to understand the canonical model.
  2. Create/extend `app/api/admin/ticketing/inventory/route.ts` — org-scoped query returning `InventoryLedgerEntry[]`.
  3. Create `components/admin/ticketing/inventory-ledger-table.tsx` — table component with request states.
  4. Mount the component on the existing `app/admin/dashboard/ticketing/page.tsx`.
  5. Add capability gate: `can_ticketing` required.
  6. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/ticketing-read-model.ts`, `lib/admin/tix-phase6.ts`, `app/admin/dashboard/ticketing/`, `components/admin/event-ticket-manager.tsx`

---

### A.2 — `w6-ticketing-reconciliation`

- **Status:** `[ ] pending`
- **Intent:** Show the dual-read mismatch panel (legacy vs canonical ticketing delta) that acts as a cutover blocker on the ticketing page.
- **Expected Outcomes:**
  - A collapsible panel on the ticketing page shows the count of tickets where legacy and canonical counts diverge.
  - Displays mismatch type, event, legacy count, canonical count, and delta.
  - Acts as a publish-gate blocker when delta > threshold.
  - Sourced from `TIX-104` dual-read mismatch dashboard contract.
- **Todo List:**
  1. Read `lib/admin/tix101-rls-isolation-contract.ts` and TIX-104 reconciliation model.
  2. Create `app/api/admin/ticketing/reconciliation/route.ts` — query that compares legacy vs canonical by event.
  3. Create `components/admin/ticketing/reconciliation-panel.tsx` with mismatch table and gate badge.
  4. Mount panel on ticketing page (collapsed by default; auto-expands on mismatch).
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/tix102-foundation-rls-contract.ts`, `lib/admin/legacy-ticketing-rls-contract.ts`, `lib/admin/ticketing-validation.ts`

---

### A.3 — `w7-finance-budget-rollup`

- **Status:** `[ ] pending`
- **Intent:** Show a budget rollup summary card on the `/admin/dashboard/finances` page (committed / actuals / remaining / utilization %).
- **Expected Outcomes:**
  - A card at the top of the finances page shows org-scoped totals: committed, actuals, remaining, and utilization percentage.
  - Sourced from `buildBudgetRollup` in `lib/admin/finance-command.service.ts` (FIN-504).
  - Displays stale/unavailable state if data is older than freshness threshold.
- **Todo List:**
  1. Read `lib/admin/finance-command.service.ts` and `lib/admin/finance-domain.ts` (FIN-504 budget rollup contract).
  2. Create/extend `app/api/admin/finances/budget-rollup/route.ts` — org-scoped rollup query.
  3. Create `components/admin/finance/budget-rollup-card.tsx` with utilization bar.
  4. Mount card on `app/admin/dashboard/finances/page.tsx`.
  5. Capability gate: `can_finance`.
  6. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/finance-command.service.ts`, `lib/admin/commercial-phase6.ts`, `components/admin/event-finance-manager.tsx`

---

### A.4 — `w7-finance-reconciliation`

- **Status:** `[ ] pending`
- **Intent:** Show the finance reconciliation mismatch table on the finances page (immutable mismatch rows surfaced from FIN-601).
- **Expected Outcomes:**
  - A section on the finances page lists reconciliation mismatches: source, amount expected, amount recorded, delta, status (open/resolved).
  - Supports manual resolution action (mark-resolved) with reason required.
  - Sourced from FIN-601 reconciliation contract.
- **Todo List:**
  1. Read `lib/admin/commercial-phase6.ts` (FIN-601 section) to understand mismatch structure.
  2. Create `app/api/admin/finances/reconciliation/route.ts` — org-scoped mismatch query and resolve mutation.
  3. Create `components/admin/finance/reconciliation-table.tsx`.
  4. Mount on finances page below the budget rollup card.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/finance-rls-contract.ts`, `lib/admin/commercial-phase6.ts`

---

### A.5 — `w8-workforce-slo-banner`

- **Status:** `[ ] pending`
- **Intent:** Add a governed workforce SLO/alert banner to hiring and staff pages that surfaces health signals and remediation links (WORK-603 / REP-401).
- **Expected Outcomes:**
  - An alert banner appears at the top of `/admin/dashboard/hiring` and `/admin/dashboard/staff` when SLO thresholds are breached (e.g., overdue onboarding, unfilled required positions).
  - Each alert carries a remediation link (deep-link to the specific issue).
  - Banner is dismissible per-session; critical alerts cannot be dismissed.
  - Sourced from `lib/admin/live-work-phase6.ts` WORK-603 contract.
- **Todo List:**
  1. Read `lib/admin/live-work-phase6.ts` WORK-603 / `lib/admin/live-ops-report.ts` for alert model.
  2. Create `app/api/admin/workforce/health/route.ts` — org-scoped SLO query.
  3. Create `components/admin/workforce/workforce-slo-banner.tsx`.
  4. Mount on hiring and staff pages.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/staffing-matrix.ts`, `lib/admin/live-work-phase6.ts`, `app/admin/dashboard/hiring/`, `app/admin/dashboard/staff/`

---

### A.6 — `w8-payroll-export-panel`

- **Status:** `[ ] pending`
- **Intent:** Add a payroll export panel to the staff page — approved, versioned payroll export batches (WORK-602).
- **Expected Outcomes:**
  - The staff page has a "Payroll Export" panel showing past export batches (date, version, status, line count).
  - Supports creating a new export batch (capability-gated: requires payroll approval capability).
  - Export triggers an async job, shows pending/complete/failed state.
  - Sourced from WORK-602 payroll export contract.
- **Todo List:**
  1. Read WORK-602 in `lib/admin/live-work-phase6.ts` and `lib/admin/staffing-matrix.ts`.
  2. Create `app/api/admin/workforce/payroll-export/route.ts` (GET list + POST create batch).
  3. Create `components/admin/workforce/payroll-export-panel.tsx`.
  4. Mount on `app/admin/dashboard/staff/page.tsx`.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/live-work-phase6.ts`, `lib/admin/labor-cost-forecast.ts`

---

### A.7 — `w9-logistics-metrics-card`

- **Status:** `[ ] pending`
- **Intent:** Add a logistics metrics snapshot card to the `/admin/dashboard/logistics` page (LOG-601).
- **Expected Outcomes:**
  - A metrics card at the top of the logistics page shows: open tasks count, overdue tasks, equipment gap count, rental alerts, catering exceptions.
  - Each metric has a severity indicator (ok/warning/critical) and a drill-down link.
  - Sourced from `lib/admin/travel-log-phase6.ts` LOG-601 contract.
- **Todo List:**
  1. Read `lib/admin/travel-log-phase6.ts` LOG-601 section and `lib/admin/logistics-board.ts`.
  2. Create `app/api/admin/logistics/metrics/route.ts` — org-scoped metrics snapshot.
  3. Create `components/admin/logistics/logistics-metrics-card.tsx`.
  4. Mount on `app/admin/dashboard/logistics/page.tsx`.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/logistics-board.ts`, `lib/admin/logistics-task.ts`, `lib/admin/travel-log-phase6.ts`

---

### A.8 — `w9-travel-slo-banner`

- **Status:** `[ ] pending`
- **Intent:** Add a travel SLO alert banner to the logistics/travel tab (TRAVEL-601).
- **Expected Outcomes:**
  - A banner on the logistics page (travel sub-tab) shows travel SLO breaches: unconfirmed segments past deadline, missing travel assignments for required party members, overdue lodging commitments.
  - Sourced from TRAVEL-601 in `lib/admin/travel-log-phase6.ts`.
- **Todo List:**
  1. Read `lib/admin/travel-log-phase6.ts` TRAVEL-601 section and `lib/admin/travel-segments.ts`.
  2. Create `app/api/admin/logistics/travel-slo/route.ts`.
  3. Create `components/admin/logistics/travel-slo-banner.tsx`.
  4. Mount on logistics page travel view.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/travel-segments.ts`, `lib/admin/party-manifest.ts`

---

### A.9 — `w10-reporting-freshness`

- **Status:** `[ ] pending`
- **Intent:** Show a report freshness watermark on the analytics page — per-domain source health and last-updated timestamps (REP-601).
- **Expected Outcomes:**
  - The analytics page shows a freshness bar/table: each reporting domain (tours, workforce, ticketing, finance, logistics) with last-computed timestamp, freshness status (fresh/stale/unavailable), and a manual refresh trigger.
  - Sourced from REP-601 in `lib/admin/rep-exp-phase6.ts` / `lib/admin/kpi-catalog.ts`.
- **Todo List:**
  1. Read `lib/admin/rep-exp-phase6.ts` REP-601 and `lib/admin/kpi-catalog.ts`.
  2. Create `app/api/admin/analytics/freshness/route.ts`.
  3. Create `components/admin/analytics/freshness-watermark.tsx`.
  4. Mount on `app/admin/dashboard/analytics/page.tsx`.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/command-center-projection.ts`, `lib/admin/rep-exp-phase6.ts`

---

### A.10 — `w10-data-quality-alerts`

- **Status:** `[ ] pending`
- **Intent:** Add a data-quality alerts section to the analytics page (REP-602).
- **Expected Outcomes:**
  - A section below the freshness watermark lists active data-quality alerts: missing required fields, reconciliation failures, duplicate detections, schema violations.
  - Each alert has a severity, affected domain, affected record count, and remediation link.
  - Sourced from REP-602 in `lib/admin/rep-exp-phase6.ts`.
- **Todo List:**
  1. Read `lib/admin/rep-exp-phase6.ts` REP-602 section.
  2. Create `app/api/admin/analytics/data-quality/route.ts`.
  3. Create `components/admin/analytics/data-quality-alerts.tsx`.
  4. Mount on analytics page below freshness watermark.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/rep-exp-phase6.ts`, `lib/admin/kpi-catalog.ts`

---

## Phase B — RBAC, Full Workforce, Travel/Logistics (W11–W13)

### B.1 — `w11-membership-workspace`

- **Status:** `[ ] pending`
- **Intent:** Organization member/role lifecycle with immediate revocation on the RBAC/organization page (SEC-102, SEC-604).
- **Expected Outcomes:**
  - The `/admin/dashboard/rbac` or `/admin/dashboard/organization` page has a membership workspace showing all org members with their roles, capabilities count, last-active, and status.
  - Supports: invite member, assign role, revoke role, remove member (immediate revocation — no delay).
  - Capability gate: requires `manage_org_members` capability.
  - Any revocation immediately invalidates acting-context cache for that member.
- **Todo List:**
  1. Read `lib/admin/comms-sec-phase6.ts` SEC-602/604, `lib/admin/entity-grants.ts`, and existing `components/admin/permissions-matrix.tsx`.
  2. Extend `app/api/admin/organization/members/route.ts` (or create) with revocation mutation.
  3. Create `components/admin/rbac/membership-workspace.tsx` — member list + invite/revoke actions.
  4. Mount on the organization/RBAC admin page.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/comms-sec-phase6.ts`, `components/admin/permissions-matrix.tsx`, `app/admin/dashboard/rbac/`

---

### B.2 — `w11-entity-grants`

- **Status:** `[ ] pending`
- **Intent:** Scoped grant creation, expiry, revocation, and resource visibility (SEC-204, SEC-604).
- **Expected Outcomes:**
  - A grants panel on the RBAC page shows all scoped entity grants (tour/event/domain scoped access).
  - Supports: create grant (with scope + expiry), revoke grant, view all active grants per resource.
  - Enforces: no enumeration — grants only show resources the current admin can see.
- **Todo List:**
  1. Read `lib/admin/entity-grants.ts` and SEC-204 in `lib/admin/comms-sec-phase6.ts`.
  2. Create `app/api/admin/rbac/grants/route.ts` (list + create + revoke).
  3. Create `components/admin/rbac/entity-grants-panel.tsx`.
  4. Mount on RBAC page alongside membership workspace.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/entity-grants.ts`, `lib/admin/state-aware-authorization.ts`

---

### B.3 — `w11-access-review`

- **Status:** `[ ] pending`
- **Intent:** Owner review surface for roles, grants, share links, and privileged actions (SEC-604).
- **Expected Outcomes:**
  - An "Access Review" tab on the RBAC page lists: all active shares (expiry/usage), all active grants (with last-used), all members with elevated permissions.
  - Owner can revoke any share, grant, or privileged access directly from this view.
  - Provides an exportable audit snapshot.
- **Todo List:**
  1. Read `lib/admin/comms-sec-phase6.ts` SEC-604 and `lib/admin/publication-share-links.ts`.
  2. Create `app/api/admin/rbac/access-review/route.ts` — aggregated review snapshot.
  3. Create `components/admin/rbac/access-review-panel.tsx`.
  4. Mount as a tab on the RBAC page.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/publication-share-links.ts`, `lib/admin/entity-grants.ts`

---

### B.4 — `w11-retention-controls`

- **Status:** `[ ] pending`
- **Intent:** Permissioned retention/hold status controls on relevant entity detail pages (SEC-605).
- **Expected Outcomes:**
  - Tour and event detail pages show a "Retention" control (hold/release-hold) that is visible only to admins with `manage_retention` capability.
  - Hold prevents archival/deletion of the entity and its children.
  - No destructive actions exposed — hold/release only.
- **Todo List:**
  1. Read `lib/admin/comms-sec-phase6.ts` SEC-605 retention model.
  2. Create `app/api/admin/retention/route.ts` (set-hold + release-hold mutations).
  3. Create `components/admin/retention-control.tsx` — small capability-gated pill/button.
  4. Mount on tour detail and event detail pages.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/comms-sec-phase6.ts`, `lib/admin/tour-delete-eligibility.ts`

---

### B.5 — `w12-hiring-roster-handoff`

- **Status:** `[ ] pending`
- **Intent:** Wire the hired-candidate-to-canonical-worker/roster identity handoff (HIRE-401, WORK-103).
- **Expected Outcomes:**
  - After an offer is accepted, the applications detail page shows a "Convert to Worker" action that triggers the 6-step conversion record (`HIRE-406` ConversionRecord state machine).
  - Progress bar shows each conversion step (create_org_person / create_tour_role / grant_work_mode / update_onboarding / update_offer / update_requisition).
  - Failed steps are retryable; complete conversion is idempotent.
- **Todo List:**
  1. Read `lib/admin/hiring-identity-conversion.ts` (HIRE-406 ConversionRecord) and `lib/admin/hiring-offer-handoff.ts`.
  2. Create `app/api/admin/hiring/convert/route.ts` — execute/resume/rollback conversion.
  3. Create `components/admin/hiring/conversion-progress.tsx` — 6-step progress tracker.
  4. Mount on `app/admin/dashboard/applications/[id]/page.tsx` (accepted-offer state only).
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/hiring-identity-conversion.ts`, `components/admin/enhanced-application-review.tsx`

---

### B.6 — `w12-scheduling-conflicts`

- **Status:** `[ ] pending`
- **Intent:** Conflict review, resolution, rest-rule, and coverage states on the scheduling page (WORK-408, WORK-410).
- **Expected Outcomes:**
  - The scheduling page has a "Conflicts" panel showing all active conflicts (6 source types) with severity and override status.
  - Supports: override conflict (reason required), mark remediated.
  - Shows coverage summary: filled/partial/open/N/A cells.
  - Labor rest-rule violations flagged distinctly.
- **Todo List:**
  1. Read `lib/admin/live-work-phase6.ts` WORK-601/602 and `lib/admin/labor-rest-rules.ts`.
  2. Create `app/api/admin/scheduling/conflicts/route.ts`.
  3. Create `components/admin/scheduling/conflicts-panel.tsx`.
  4. Mount on `app/admin/dashboard/scheduling/page.tsx`.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/staffing-matrix.ts`, `lib/admin/labor-rest-rules.ts`, `lib/admin/ros-validation.ts`

---

### B.7 — `w12-attendance-corrections`

- **Status:** `[ ] pending`
- **Intent:** Audited actual-time and attendance correction ledger (WORK-601).
- **Expected Outcomes:**
  - The staff page (or event HQ) has an attendance corrections ledger: each row shows original planned time, actual time, corrector, reason, timestamp.
  - Corrections are immutable (append-only); re-correction creates a new entry.
  - Sourced from WORK-601 ActualRecord model.
- **Todo List:**
  1. Read `lib/admin/live-work-phase6.ts` WORK-601 and `lib/admin/live-task.ts`.
  2. Create `app/api/admin/workforce/attendance-corrections/route.ts`.
  3. Create `components/admin/workforce/attendance-correction-ledger.tsx`.
  4. Mount on staff page and/or event HQ day-sheet tab.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/live-ops-report.ts`, `lib/admin/live-work-phase6.ts`

---

### B.8 — `w12-payroll-export` (Full W12 variant)

- **Status:** `[ ] pending`
- **Intent:** Full payroll export workspace with approved, versioned batches (WORK-602) — extends the A.6 panel into a full management surface.
- **Expected Outcomes:**
  - Beyond the panel in A.6, includes: batch detail view, line-item review, re-approval flow, download (CSV/JSON), and audit trail.
  - Approval workflow: requires designated approver capability; prevents double-export.
- **Todo List:**
  1. Extend the API from A.6 to include batch detail and approval mutation.
  2. Create `app/admin/dashboard/staff/payroll/page.tsx` — full batch workspace.
  3. Create `components/admin/workforce/payroll-batch-workspace.tsx`.
  4. Link from staff page payroll panel (A.6) to this detail page.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** A.6 deliverables, `lib/admin/labor-cost-forecast.ts`

---

### B.9 — `w12-workforce-alerts`

- **Status:** `[ ] pending`
- **Intent:** Governed workforce health dashboard with remediation links (WORK-603, REP-401).
- **Expected Outcomes:**
  - The hiring/staff pages show a governed health dashboard: SLO metrics (fill rate, onboarding completion, credential compliance) with severity and remediation links.
  - Metrics sourced from REP-401 `buildLiveDashboard`.
  - Distinguishes warning vs critical SLO breaches.
- **Todo List:**
  1. Read `lib/admin/live-work-phase6.ts` WORK-603 + REP-401 `buildLiveDashboard`.
  2. Extend `app/api/admin/workforce/health/route.ts` (from A.5) to include full REP-401 metrics.
  3. Create `components/admin/workforce/workforce-health-dashboard.tsx`.
  4. Mount on hiring page and staff page.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/live-work-phase6.ts`, `lib/admin/live-ops-report.ts`

---

### B.10 — `w13-party-travel-matrix`

- **Status:** `[ ] pending`
- **Intent:** Person/group vs required route leg/night matrix on logistics/travel page (TRAVEL-301, LODGE-302).
- **Expected Outcomes:**
  - The logistics travel tab shows a matrix: rows = party members, columns = route legs/nights, cells = coverage status (covered/gap/pending).
  - Gap cells are highlighted and link to the travel command dialog.
  - Lodging nightly matrix alongside travel matrix.
- **Todo List:**
  1. Read `lib/admin/party-manifest.ts` + TRAVEL-301 `buildPartyManifestMatrix` + LODGE-302 `buildNightlyInventoryMatrix`.
  2. Create `app/api/admin/logistics/party-matrix/route.ts`.
  3. Create `components/admin/logistics/party-travel-matrix.tsx`.
  4. Mount on logistics page travel tab.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/party-manifest.ts`, `lib/admin/lodging.ts`, `lib/admin/travel-segments.ts`

---

### B.11 — `w13-travel-commands`

- **Status:** `[ ] pending`
- **Intent:** Travel segment command surface — proposed/requested/held/confirmed/change/cancel state transitions (TRAVEL-302, TRAVEL-104).
- **Expected Outcomes:**
  - Travel matrix gap cells open a command dialog allowing: propose segment, request booking, mark held, confirm, record change, cancel.
  - Each transition validates 9-status state machine and surfaces conflict errors.
  - Idempotency keys prevent duplicate bookings.
- **Todo List:**
  1. Read `lib/admin/travel-segments.ts` (TRAVEL-302 state machine) and `lib/admin/travel-segments.ts`.
  2. Create `app/api/admin/logistics/travel/route.ts` — command executor with idempotency key.
  3. Create `components/admin/logistics/travel-command-dialog.tsx`.
  4. Wire from party-travel-matrix gap cells.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/travel-segments.ts`, `lib/admin/logistics-command.service.ts`

---

### B.12 — `w13-travel-impact-preview`

- **Status:** `[ ] pending`
- **Intent:** Travel change impact preview — passenger, room, shift, cost, and publication impact before commit (TRAVEL-305).
- **Expected Outcomes:**
  - Before any travel change/cancel command is confirmed, a preview modal shows: affected passengers, room re-assignment needed, shift coverage impact, estimated cost delta, publications requiring re-acknowledgement.
  - User must explicitly confirm after seeing the impact.
- **Todo List:**
  1. Read `lib/admin/travel-segments.ts` TRAVEL-305 `computeTravelChangeImpact`.
  2. Create `app/api/admin/logistics/travel/impact-preview/route.ts`.
  3. Create `components/admin/logistics/travel-impact-preview-modal.tsx`.
  4. Integrate into travel-command-dialog (from B.11) as confirmation step.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/travel-segments.ts`, `lib/admin/party-manifest.ts`

---

### B.13 — `w13-travel-documents`

- **Status:** `[ ] pending`
- **Intent:** Protected provider documents and unmatched import review (TRAVEL-501, TRAVEL-502).
- **Expected Outcomes:**
  - A "Provider Documents" panel on the logistics/travel page shows uploaded provider confirmations (secured, no raw URL leak).
  - Unmatched imports (provider bookings not yet matched to tour segments) are listed for review.
  - Document upload uses secure storage tokens (not direct public URL).
- **Todo List:**
  1. Read `lib/admin/travel-log-phase6.ts` TRAVEL-501/502 and `lib/admin/logistics-command.service.ts`.
  2. Extend `app/api/admin/logistics/travel/documents/route.ts` — list + upload + match operations.
  3. Create `components/admin/logistics/travel-documents-panel.tsx`.
  4. Mount on logistics page travel tab.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/travel-log-phase6.ts`, secure storage patterns from `lib/admin/protected-data-policy.ts`

---

### B.14 (merged into B.7) — `w13-logistics-alerts`

- **Status:** `[ ] pending`
- **Intent:** Equipment, rental, catering, map, and publication remediation alerts on the logistics page (LOG-601, LOG-602).
- **Expected Outcomes:**
  - A logistics alerts panel surfaces: equipment custody gaps, overdue rental returns, catering delivery exceptions, map review blockers, publications requiring re-ack.
  - Each alert links to the relevant domain panel.
  - Severity: critical/warning/info.
- **Todo List:**
  1. Read `lib/admin/travel-log-phase6.ts` LOG-601/602 and `lib/admin/logistics-board.ts`.
  2. Extend `app/api/admin/logistics/metrics/route.ts` to include alert array.
  3. Create `components/admin/logistics/logistics-alerts-panel.tsx`.
  4. Mount on logistics page alongside the metrics card (A.7).
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/logistics-board.ts`, `lib/admin/equipment-damage-service.ts`, `lib/admin/rental-agreement.ts`

---

## Phase C — Full Ticketing, Finance/Settlement, Vendors & Contracts (W14–W16)

### C.1 — `w14-ticketing-setup`

- **Status:** `[ ] pending`
- **Intent:** Explicit ticketing configuration and availability preview on the ticketing page (TIX-501).
- **Expected Outcomes:**
  - The ticketing page has a setup section: configure ticket types, pricing, on-sale window, capacity, purchase limits, group/promo settings.
  - Preview panel shows computed availability before saving.
  - Validated by `validateTicketingConfig` / `computeAvailabilityPreview`.
- **Todo List:**
  1. Read `lib/admin/ticketing-command.service.ts` TIX-501 contract.
  2. Create `app/api/admin/ticketing/setup/route.ts`.
  3. Create `components/admin/ticketing/ticketing-setup-form.tsx` with availability preview.
  4. Mount on ticketing page as a setup section (behind `not_ticketed` state guard).
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/ticketing-command.service.ts`, `lib/admin/event-ticketing-setup.ts`

---

### C.2 — `w14-inventory-ledger` (Full)

- **Status:** `[ ] pending`
- **Intent:** Full append-only inventory movements surface including reservation management (extends A.1).
- **Expected Outcomes:**
  - Full inventory ledger: filter by movement type, event, date range. Includes reservations detail panel.
  - Reserve/cancel operations with oversell guard and idempotency key.
- **Todo List:**
  1. Extend A.1 API/component to include reservations + filtering.
  2. Add reservation detail panel: `components/admin/ticketing/reservation-detail.tsx`.
  3. Wire oversell guard (canReserve) visually — oversell-blocked state.
  4. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/ticketing-command.service.ts` TIX-502/503

---

### C.3 — `w14-allocation-matrix`

- **Status:** `[ ] pending`
- **Intent:** Tour/stop allocation and deadline management (TIX-503).
- **Expected Outcomes:**
  - An allocation matrix tab on the ticketing page shows: tour stop × ticket type grid, with allocation counts, at-risk expiry flags, and deadline controls.
  - Supports: create/update allocation, extend deadline, release held inventory.
- **Todo List:**
  1. Read TIX-503 `AllocationRecord` from `lib/admin/ticketing-command.service.ts`.
  2. Create `app/api/admin/ticketing/allocations/route.ts`.
  3. Create `components/admin/ticketing/allocation-matrix.tsx`.
  4. Mount as a tab on the ticketing page.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### C.4 — `w14-guest-approvals`

- **Status:** `[ ] pending`
- **Intent:** Comp/guest request, approval, issuance, and attendance tracking (TIX-504).
- **Expected Outcomes:**
  - The ticketing page has a Guest Approvals section with a request queue (pending/approved/denied/issued).
  - Approve: issues comp credential. Deny: reason required. Issued comps tracked for attendance.
  - Sourced from `approveCompRequest` / `denyCompRequest` / `issueComp`.
- **Todo List:**
  1. Read TIX-504 comp request model from `lib/admin/ticketing-command.service.ts`.
  2. Create `app/api/admin/ticketing/comps/route.ts`.
  3. Create `components/admin/ticketing/guest-approvals-panel.tsx`.
  4. Mount on ticketing page.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### C.5 — `w14-order-operations`

- **Status:** `[ ] pending`
- **Intent:** Scoped resend/transfer/void/refund ticket operations with impact preview (TIX-506).
- **Expected Outcomes:**
  - The ticketing page (or event detail ticketing tab) supports per-order operations: resend, transfer (to new holder), void, refund.
  - Each operation requires capability gate and shows impact preview before execution.
  - Void/refund are audited and irreversible once executed.
- **Todo List:**
  1. Read TIX-506 `ALLOWED_OPERATIONS` and `createTicketOperation` from `lib/admin/ticketing-command.service.ts`.
  2. Create `app/api/admin/ticketing/orders/[id]/operations/route.ts`.
  3. Create `components/admin/ticketing/order-operations-panel.tsx`.
  4. Mount on event ticketing tab and ticketing management page.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### C.6 — `w14-admissions-devices`

- **Status:** `[ ] pending`
- **Intent:** Scanner/device management — packages, sync health, gate config, and offline fallback (TIX-509, TIX-511).
- **Expected Outcomes:**
  - An admissions devices tab shows: registered devices (status: active/revoked/lost), last-sync, gate assignment.
  - Supports: register device, revoke, view offline queue length, trigger sync.
  - Anomaly panel: shows `computeAdmissionsAnomalies` results (duplicate scans, out-of-window, capacity breach, scan-without-ticket).
- **Todo List:**
  1. Read TIX-509/511 from `lib/admin/ticketing-command.service.ts`.
  2. Create `app/api/admin/ticketing/devices/route.ts` + `app/api/admin/ticketing/anomalies/route.ts`.
  3. Create `components/admin/ticketing/admissions-devices-tab.tsx`.
  4. Mount as a tab on the ticketing page.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### C.7 — `w14-ticketing-reconciliation` (Full)

- **Status:** `[ ] pending`
- **Intent:** Legacy/canonical variance UI and cutover blocker (extends A.2 into a full reconciliation workspace, TIX-104, TIX-601).
- **Expected Outcomes:**
  - Full reconciliation workspace: side-by-side legacy vs canonical counts by event, variance drill-down, cutover status (blocked/eligible).
  - Supports manual reconciliation trigger (admin-only) and evidence export.
- **Todo List:**
  1. Extend A.2 API and component into a full workspace.
  2. Add cutover eligibility badge and evidence export button.
  3. Create `app/admin/dashboard/ticketing/reconciliation/page.tsx`.
  4. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### C.8 — `w15-budget-workspace`

- **Status:** `[ ] pending`
- **Intent:** Versioned budget templates/lines, approvals, and rollups (FIN-501, FIN-504).
- **Expected Outcomes:**
  - The finances page has a Budget workspace: baseline/forecast/scenario versions, line items (quantity×rate/fixed/formula), approval workflow, rollup summary.
  - Version comparison: previous vs current line-item delta view.
  - Approval: requires finance-approver capability; immutable once approved.
- **Todo List:**
  1. Read `lib/admin/commercial-phase6.ts` FIN-501–504 and `lib/admin/finance-command.service.ts`.
  2. Create `app/api/admin/finances/budgets/route.ts` (CRUD + approval).
  3. Create `components/admin/finance/budget-workspace.tsx` with version tabs.
  4. Mount on finances page.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### C.9 — `w15-commitments-procurement`

- **Status:** `[ ] pending`
- **Intent:** Commitments, requisitions, POs, receipts, and invoice matching (FIN-505, FIN-506).
- **Expected Outcomes:**
  - A Procurement section on the finances page: list of commitments, PO lifecycle (8-status), receipt matching, invoice-to-PO matching with variance detection.
  - Approval policy enforced (threshold + separation of duties).
- **Todo List:**
  1. Read FIN-505/506/507 from `lib/admin/commercial-phase6.ts`.
  2. Create `app/api/admin/finances/procurement/route.ts`.
  3. Create `components/admin/finance/procurement-workspace.tsx`.
  4. Mount on finances page as a Procurement tab.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### C.10 — `w15-expense-operations`

- **Status:** `[ ] pending`
- **Intent:** Expenses, receipts/splits, cash advances, per diem, and FX (FIN-507–511).
- **Expected Outcomes:**
  - Expense reports with receipt attachment, split allocation, per-diem computation, FX rate locking.
  - Cash advance: issue, track outstanding, mark repaid.
  - All amounts in minor units; FX rates immutable once applied.
- **Todo List:**
  1. Read FIN-508–511 from `lib/admin/commercial-phase6.ts`.
  2. Create `app/api/admin/finances/expenses/route.ts`.
  3. Create `components/admin/finance/expense-report-workspace.tsx`.
  4. Mount on finances page as an Expenses tab.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### C.11 — `w15-settlement-workspace`

- **Status:** `[ ] pending`
- **Intent:** Deal terms, statement versions, adjustments, approvals, and posting (SETTLE-501, SETTLE-504).
- **Expected Outcomes:**
  - A Settlement workspace on the finances page: deal template selection, statement versions, line-item adjustments, approval workflow, post-to-accounting action.
  - Tour profitability rollup visible alongside.
- **Todo List:**
  1. Read `lib/admin/settlement-domain.ts` SETTLE-501–504.
  2. Create `app/api/admin/finances/settlements/route.ts`.
  3. Create `components/admin/finance/settlement-workspace.tsx`.
  4. Mount on finances page as a Settlements tab.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### C.12 — `w15-finance-reconciliation` (Full)

- **Status:** `[ ] pending`
- **Intent:** Full immutable mismatch resolution and accounting export (extends A.4 into full workspace, FIN-601, FIN-602).
- **Expected Outcomes:**
  - Full reconciliation workspace with: filter by domain, mismatch type, date range; resolution workflow; export to accounting system (versioned, auditable).
- **Todo List:**
  1. Extend A.4 API and component.
  2. Add filter controls and export action.
  3. Create `app/admin/dashboard/finances/reconciliation/page.tsx`.
  4. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### C.13 — `w16-vendor-master`

- **Status:** `[ ] pending`
- **Intent:** Scoped vendor search/edit, contacts, status, risk, and merge (VEND-501).
- **Expected Outcomes:**
  - A Vendors page (`/admin/dashboard/...`) shows the org-scoped vendor list: search, filter by status/risk, edit contacts, merge duplicate vendors (with preview).
  - No cross-org vendor data exposed.
- **Todo List:**
  1. Read `lib/admin/commercial-phase6.ts` VEND-501 and existing `components/admin/event-vendor-manager.tsx`.
  2. Create `app/api/admin/vendors/route.ts` (list + search + merge).
  3. Create `components/admin/vendors/vendor-master-table.tsx` + merge dialog.
  4. Mount on existing vendors route or create new page.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `components/admin/event-vendor-manager.tsx`, `components/admin/event-vendor-requests.tsx`

---

### C.14 — `w16-vendor-compliance`

- **Status:** `[ ] pending`
- **Intent:** Compliance document requirements, secure uploads, verification, expiry, and waiver (VEND-502).
- **Expected Outcomes:**
  - Vendor detail page shows compliance requirements (e.g., insurance, W-9) with status (submitted/verified/expired/waived).
  - Upload triggers secure scan; verified by admin with expiry date.
  - Waiver requires reason and capability gate.
- **Todo List:**
  1. Read VEND-502 from `lib/admin/commercial-phase6.ts`.
  2. Create `app/api/admin/vendors/[id]/compliance/route.ts`.
  3. Create `components/admin/vendors/vendor-compliance-panel.tsx`.
  4. Mount on vendor detail page.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### C.15 — `w16-rfp-quotes`

- **Status:** `[ ] pending`
- **Intent:** Engagement, RFP/invitation, quote versions, comparison, and decision (VEND-503–506).
- **Expected Outcomes:**
  - Create engagement for a vendor, send RFP invitation, receive quote versions, compare quotes side-by-side, record decision (award/decline).
  - Quote versioning: each submission is a new version; prior versions are immutable.
- **Todo List:**
  1. Read VEND-503–506 from `lib/admin/commercial-phase6.ts`.
  2. Create `app/api/admin/vendors/[id]/engagements/route.ts` + RFP + quotes routes.
  3. Create `components/admin/vendors/rfp-quotes-workspace.tsx`.
  4. Mount on vendor detail page as Procurement tab.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### C.16 — `w16-vendor-performance`

- **Status:** `[ ] pending`
- **Intent:** Vendor delivery evidence, closeout, risk, and performance tracking (VEND-507).
- **Expected Outcomes:**
  - After an engagement completes, a performance closeout is recorded (delivery evidence, rating, risk level, notes).
  - Performance history visible on vendor detail page.
- **Todo List:**
  1. Read VEND-507 from `lib/admin/commercial-phase6.ts`.
  2. Create `app/api/admin/vendors/[id]/performance/route.ts`.
  3. Create `components/admin/vendors/vendor-performance-panel.tsx`.
  4. Mount on vendor detail page.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### C.17 — `w16-contract-workspace`

- **Status:** `[ ] pending`
- **Intent:** Contract templates, drafts, internal review, negotiation, signing, and amendments (CONT-501–506).
- **Expected Outcomes:**
  - A Contracts section: create from template, edit draft, internal review with approval, send to counterparty for negotiation, record signature via adapter, amend/terminate/renew.
  - Version history for all states; each negotiation round is a separate version.
- **Todo List:**
  1. Read `lib/admin/contract-domain.ts` CONT-501–506.
  2. Create `app/api/admin/contracts/route.ts` + sub-routes for review/sign/amend.
  3. Create `components/admin/contracts/contract-workspace.tsx`.
  4. Mount accessible from vendor page and event detail.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### C.18 — `w16-obligations`

- **Status:** `[ ] pending`
- **Intent:** Contract obligations, evidence tracking, reminders, and finance links (CONT-507, CONT-508).
- **Expected Outcomes:**
  - Obligation tracker panel on contract detail: each obligation has due date, evidence requirement, current status, reminder schedule.
  - Links to associated PO/invoice/settlement.
  - Overdue obligations surface in the main dashboard alert widget.
- **Todo List:**
  1. Read CONT-507/508 from `lib/admin/contract-domain.ts` and `lib/admin/commercial-phase6.ts`.
  2. Extend contracts API with obligations sub-route.
  3. Create `components/admin/contracts/obligations-tracker.tsx`.
  4. Mount on contract detail page.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.

---

## Phase D — Reporting, Exports, and Release Gates (W17–W18)

### D.1 — `w17-domain-dashboards`

- **Status:** `[ ] pending`
- **Intent:** Governed domain-specific dashboards for logistics, workforce, ticketing, finance, and vendor projections (REP-301, REP-401, REP-501–503).
- **Expected Outcomes:**
  - The analytics page renders governed KPI tiles for each domain using the metrics defined in `lib/admin/kpi-catalog.ts` and `lib/admin/rep-exp-phase6.ts`.
  - Each tile shows: metric value, severity (ok/warning/critical), freshness timestamp, drill-down link.
  - Protected aggregates: no raw IDs, no individual PII, dimension redaction where required.
- **Todo List:**
  1. Read `lib/admin/kpi-catalog.ts`, `lib/admin/rep-exp-phase6.ts` REP-301/401/501–503.
  2. Create `app/api/admin/analytics/domains/route.ts` — multi-domain governed projection.
  3. Create `components/admin/analytics/domain-dashboard-tiles.tsx`.
  4. Mount on analytics page.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### D.2 — `w17-freshness-quality` (Full)

- **Status:** `[ ] pending`
- **Intent:** Comprehensive freshness watermarks and reconciliation for partial/stale presentation (extends A.9/A.10, REP-601, REP-602).
- **Expected Outcomes:**
  - Full freshness workspace: per-source watermarks, reconciliation job status, stale-data warnings injected at the metric tile level.
  - Partial data clearly labeled (strikethrough or badge) rather than silently presented as full.
- **Todo List:**
  1. Extend A.9/A.10 deliverables with stale-data injection into D.1 tiles.
  2. Create reconciliation job status panel.
  3. Mount on analytics page.
  4. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### D.3 — `w17-export-jobs`

- **Status:** `[ ] pending`
- **Intent:** Authorized, versioned, auditable asynchronous export jobs (EXP-601, EXP-602).
- **Expected Outcomes:**
  - A "Exports" section on the analytics page allows: create export job (domain, format, scope, filters), track job status (queued/running/complete/failed), download completed export, view audit trail (who requested, when, download count).
  - Export jobs are capability-gated; download tokens are scoped and expiring.
- **Todo List:**
  1. Read EXP-601/602 from `lib/admin/rep-exp-phase6.ts`.
  2. Create `app/api/admin/analytics/exports/route.ts` (create job + status + download).
  3. Create `components/admin/analytics/export-jobs-panel.tsx`.
  4. Mount on analytics page as Exports tab.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### D.4 — `w17-tour-book`

- **Status:** `[ ] pending`
- **Intent:** Accessible web/PDF tour book with version and checksum (EXP-603).
- **Expected Outcomes:**
  - The tour detail page has a "Generate Tour Book" action that assembles a versioned tour book (11 sections, audience-projected for role) as a web-rendered page and downloadable PDF.
  - Book includes checksum, version pin, and offline package manifest.
  - Sourced from PUB-301–303 section contracts and EXP-603.
- **Todo List:**
  1. Read `lib/admin/rep-exp-phase6.ts` EXP-603 and `lib/admin/pub-phase6.ts` PUB-301–303.
  2. Create `app/api/admin/tours/[id]/tour-book/route.ts` — assembly + PDF generation trigger.
  3. Create `app/admin/dashboard/tours/[id]/tour-book/page.tsx` — web-rendered tour book.
  4. Add "Tour Book" action to tour detail page.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/day-sheet-composer.ts` (pattern reference), `lib/admin/pub-phase6.ts`

---

### D.5 — `w17-calendar-feeds`

- **Status:** `[ ] pending`
- **Intent:** Scoped token-based ICS calendar feeds with stable UID and revocation (EXP-604).
- **Expected Outcomes:**
  - The calendar page offers "Subscribe" for org admins — generates a scoped ICS feed token.
  - Feed URL is stable (UID-based); revocation invalidates all subsequent fetches.
  - Token scoping: tour-only, event-only, or full org (capability-gated).
- **Todo List:**
  1. Read EXP-604 from `lib/admin/rep-exp-phase6.ts` and `lib/admin/calendar-command.service.ts`.
  2. Create `app/api/admin/calendar/feeds/route.ts` (create/revoke token) and `app/api/calendar/[token]/route.ts` (serve ICS).
  3. Create `components/admin/calendar/feed-subscription-panel.tsx`.
  4. Mount on calendar page.
  5. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### D.6 — `w18-request-state-standardization`

- **Status:** `[ ] pending`
- **Intent:** Canonical loading/error/empty/denied/stale states across all admin pages (REL-603).
- **Expected Outcomes:**
  - All admin pages use the shared discriminated request-state contract established in `w0a-request-state-contract`.
  - Audit all W6–W17 deliverables: ensure no page presents an error as an empty state, no stale data as current, no denied access as unavailable.
  - Fix any pages found to diverge.
- **Todo List:**
  1. Audit all components built in W6–W17 against the request-state contract.
  2. Fix any divergences (loading spinner on errors, empty state on denied, etc.).
  3. Add a shared `useAdminRequestState` hook if not already present.
  4. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** `lib/admin/admin-request-state.ts`, `w0a-request-state-contract` deliverables

---

### D.7 — `w18-accessibility-responsive`

- **Status:** `[ ] pending`
- **Intent:** Keyboard navigation, focus management, ARIA labels, contrast ratios, mobile layout, and overflow pass (REL-603).
- **Expected Outcomes:**
  - All W6–W17 components pass: keyboard-accessible (tab/enter/escape), ARIA roles/labels on interactive elements, 4.5:1 contrast, no horizontal scroll overflow at 375px, logical focus order.
  - No regression on existing W0–W5 surfaces.
- **Todo List:**
  1. Run accessibility audit on W6–W17 deliverables (manual keyboard test + axe).
  2. Fix missing ARIA labels, focus traps, contrast issues, and overflow.
  3. Verify mobile breakpoints for all new components.
  4. Update `PROGRESS.md` and `TASK_LOG.md`.

---

### D.8 — `w18-deterministic-e2e`

- **Status:** `[ ] pending`
- **Intent:** Seeded hard-assertion account and domain workflow E2E tests (REL-004, REL-607).
- **Expected Outcomes:**
  - Playwright tests cover key W6–W17 flows: ticketing setup → inventory → allocation → check-in, budget create → line items → approve → rollup, vendor engagement → RFP → contract → obligation.
  - Tests use deterministic seed data; no mocks; hard assertions on specific UI text/state.
- **Todo List:**
  1. Read existing Playwright tests in `e2e/` or `tests/` to understand seed/fixture patterns.
  2. Write E2E test files for the three key flows above.
  3. Verify tests pass deterministically.
  4. Update `PROGRESS.md` and `TASK_LOG.md`.
- **Relevant Context:** Existing Playwright test patterns in the project

---

### D.9 — `w18-release-verification`

- **Status:** `[ ] pending`
- **Intent:** Final release gate: typecheck, build, RLS advisors, migration validation, and SLO checks all pass (REL-601, REL-604, REL-610).
- **Expected Outcomes:**
  - `npm run build` exits 0 with no new type errors.
  - `supabase db lint` (or equivalent RLS advisor) shows no new warnings.
  - Migration validation CI gate passes.
  - All W0–W18 items are `done` in `PROGRESS.md`.
  - Final completion summary appended to `TASK_LOG.md`.
- **Todo List:**
  1. Run `npm run build` and fix any type errors.
  2. Run TypeScript no-emit pass.
  3. Run ESLint and fix any new warnings.
  4. Verify migration CI gate.
  5. Update `PROGRESS.md` Current pointer to `COMPLETE`. Append final summary to `TASK_LOG.md`.
- **Relevant Context:** `scripts/ci/check-admin-route-registry.mjs`, `scripts/ci/check-migration-validation.mjs`

---

## Progress Tracking

After each task is implemented, the agent must:

1. Update the item status to `done` in `.agents/admin-ui-wiring/PROGRESS.md`.
2. Append a task log entry to `.agents/admin-ui-wiring/TASK_LOG.md` (or create it if absent).
3. Update the corresponding status entry in **this plan file** (`[ ] pending` → `[x] done`).
4. Proceed to the next `pending` item without waiting for user confirmation, unless blocked on a user decision.

---

## Phase Summary

| Phase | Items | Status |
|-------|-------|--------|
| **Phase A** — W6–W10 quick-win wiring | 10 | `[ ] pending` |
| **Phase B** — W11–W13 RBAC, workforce, travel/logistics | 13 | `[ ] pending` |
| **Phase C** — W14–W16 ticketing, finance, vendors/contracts | 18 | `[ ] pending` |
| **Phase D** — W17–W18 reporting, exports, release gates | 9 | `[ ] pending` |
| **Total** | **50** | |

*(Note: W6–W18 inventory has 40 named items; this plan expands some items into full sub-tasks, resulting in 50 implementation units.)*
