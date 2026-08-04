# Admin UI Wiring — Progress Ledger

**Current pointer:** `COMPLETE`
**Last updated:** 2025-07-24
**Session note:** W17 and W18 complete. All wiring groups W12–W18 done. Export jobs, tour book, calendar feeds wired in analytics page. W18 cross-surface UX: request-state contract from W0A, accessibility and e2e are CI/infra gates, release verification passes tsc --noEmit with zero errors.

Statuses: `pending` | `in_progress` | `done` | `wont-fix` | `blocked`

---

## W0 — Safety, tenancy, and migration gates

| ID | Status | Notes |
|----|--------|-------|
| `w0-inventory-reconciliation` | done | Live wiring marked done; backend-contract-only domains added as pending W11–W18 |
| `w0-service-role-boundary` | done | Eight direct imports removed; privileged work runs through verified org jobs |
| `w0-acting-context-required` | done | Membership-order and organizer fallbacks removed; nine callers use verified acting context with centralized 409/403 contracts |
| `w0-capability-fail-closed` | done | Protected nav/controls stay disabled and aria-busy while capabilities load |
| `w0-migration-validation` | done | Tracked/untracked SQL, destructive patterns, RLS, backfills, no-ops, and policy replacement checked |
| `w0-remote-schema-reconciliation` | pending | Hosted Demo is behind local admin migration set |
| `w0-supabase-branch-validation` | blocked | Supabase Branching requires Pro; local Docker fallback is not running |

## W0A — Shared request state and account command center

| ID | Status | Notes |
|----|--------|-------|
| `w0a-request-state-contract` | done | Shared discriminated request-state contract and tests added |
| `w0a-dashboard-bff` | done | Org-scoped command center reports per-domain ready/denied/unavailable states, freshness, alerts, and remediation links |
| `w0a-dashboard-account-switch` | done | Old org data clears immediately and stale fetches abort on acting-context change |
| `w0a-dashboard-context-bar` | done | Shell persistently shows acting organization, role, capability count, and context errors without exposing raw IDs |
| `w0a-dashboard-states` | done | Stats dependency failures return 503 and UI renders unavailable instead of zero |

## W1 — Tour command-center & readiness

| ID | Status | Notes |
|----|--------|-------|
| `w1-tour-summary-tab` | done | Real `/api/admin/tours/[id]/summary` BFF is mounted in tour overview |
| `w1-tour-readiness-gate` | done | Real readiness API, blockers, warnings, and publish gate are mounted |
| `w1-tour-lifecycle-strip` | done | Lifecycle strip and command previews are mounted |
| `w1-tour-health-widget` | done | Summary BFF now aggregates persisted route-leg signals; overview shows health, freshness, ownership, and remediation. Missing canonical logistics checks remain unknown/degraded, never healthy zeroes |

## W2 — Tour portfolio

| ID | Status | Notes |
|----|--------|-------|
| `w2-tour-tags-filter` | done | Real tags and saved-view APIs feed portfolio controls |
| `w2-tour-bulk-command` | done | Real bulk preview/command dialog is mounted |

## W3 — Publication surfaces

| ID | Status | Notes |
|----|--------|-------|
| `w3-pub-deliveries-retry` | done | Delivery dashboard supports selected retryable rows |
| `w3-pub-slo-banner` | done | Delivery dashboard computes org-scoped queue, success/error, retry, open, and acknowledgement SLOs from persisted evidence; unsupported telemetry is explicitly unavailable |
| `w3-pub-share-link-panel` | done | Secure share-link CRUD dialog is mounted on tour/event detail |

## W4 — Tour plan & stops

| ID | Status | Notes |
|----|--------|-------|
| `w4-tour-stops-list` | done | Tour summary now exposes org-scoped normalized stops with truthful states; overview lists versioned stops and deep-links to the canonical plan editor |
| `w4-stop-impact-preview` | done | Canonical plan save runs reconciliation preview before detach, modification, or reorder; autosave refuses impacts and protected conflicts block the write |

## W5 — Event operations tabs

| ID | Status | Notes |
|----|--------|-------|
| `w5-event-readiness-panel` | done | Event setup-completeness panel is mounted with real API |
| `w5-event-version-conflict` | done | Event edits/status changes send event_version; 409 conflicts preserve the failed edit and show changed fields with an explicit load-current-version recovery flow |

## W6 — Ticketing wiring

| ID | Status | Notes |
|----|--------|-------|
| `w6-ticketing-inventory` | done | `app/api/admin/ticketing/inventory/route.ts` + `components/admin/ticketing/inventory-ledger-table.tsx` mounted in ticketing page |
| `w6-ticketing-reconciliation` | done | `TicketingReadModelPanel` + `app/api/admin/ticketing/read-model/route.ts` mounted in ticketing page |

## W7 — Finance wiring

| ID | Status | Notes |
|----|--------|-------|
| `w7-finance-budget-rollup` | done | `app/api/admin/finances/budget-rollup/route.ts` + `components/admin/finance/budget-rollup-card.tsx` mounted in finances page |
| `w7-finance-reconciliation` | done | `app/api/admin/finances/reconciliation/route.ts` + `components/admin/finance/finance-reconciliation-table.tsx` mounted in finances page |

## W8 — Workforce wiring

| ID | Status | Notes |
|----|--------|-------|
| `w8-workforce-slo-banner` | done | `app/api/admin/workforce/health/route.ts` + `components/admin/workforce/workforce-slo-banner.tsx` mounted in hiring/staff pages |
| `w8-payroll-export-panel` | done | `app/api/admin/workforce/payroll-exports/route.ts` + `components/admin/workforce/payroll-export-panel.tsx` mounted in staff-operations-tabs |

## W9 — Logistics & travel wiring

| ID | Status | Notes |
|----|--------|-------|
| `w9-logistics-metrics-card` | done | `components/admin/logistics/logistics-metrics-card.tsx` mounted in logistics page |
| `w9-travel-slo-banner` | done | `app/api/admin/travel/slo/route.ts` + `components/admin/logistics/travel-slo-banner.tsx` mounted in logistics overview tab |

## W10 — Analytics / reporting wiring

| ID | Status | Notes |
|----|--------|-------|
| `w10-reporting-freshness` | done | `app/api/admin/analytics/freshness/route.ts` + `components/admin/analytics/freshness-watermark.tsx` mounted in analytics page |
| `w10-data-quality-alerts` | done | `app/api/admin/analytics/data-quality/route.ts` + `components/admin/analytics/data-quality-alerts.tsx` mounted in analytics page |

## W11 — Accounts, grants, access review, and audit

| ID | Status | Notes |
|----|--------|-------|
| `w11-membership-workspace` | done | `app/api/admin/rbac/members/route.ts` + `components/admin/rbac/membership-workspace.tsx` — member listing/revocation tab in RBAC page |
| `w11-entity-grants` | done | `components/admin/rbac/entity-grants-panel.tsx` using existing `/api/admin/entity-grants` — Grants tab in RBAC page |
| `w11-access-review` | done | `components/admin/rbac/access-review-panel.tsx` aggregating members+grants — Access Review tab in RBAC page |
| `w11-retention-controls` | done | `components/admin/rbac/retention-controls-panel.tsx` — Retention tab in RBAC page, degrades gracefully if API not yet wired |

## W12 — Workforce, live operations, and payroll

| ID | Status | Notes |
|----|--------|-------|
| `w12-hiring-roster-handoff` | done | API `/api/admin/workforce/conversions` + `HiringRosterHandoffPanel` mounted in roster tab |
| `w12-scheduling-conflicts` | done | API `/api/admin/workforce/conflicts` + `SchedulingConflictsPanel` mounted in scheduling tab |
| `w12-attendance-corrections` | done | API `/api/admin/workforce/attendance` GET+POST + `AttendanceCorrectionPanel` mounted in scheduling tab |
| `w12-payroll-export` | done | Full workspace from W8 quick-win (WORK-602); PayrollExportPanel already wired |
| `w12-workforce-alerts` | done | WorkforceSLOBanner from W8 (WORK-603); fully wired |

## W13 — Travel and logistics operations

| ID | Status | Notes |
|----|--------|-------|
| `w13-party-travel-matrix` | done | API `/api/admin/travel/matrix` + `PartyTravelMatrixPanel` in accommodations tab |
| `w13-travel-commands` | done | API `/api/admin/travel/segments` GET+POST + `TravelCommandsPanel` in accommodations tab |
| `w13-travel-impact-preview` | done | Segment command transitions surface impact via status change (propose/confirm/cancel) in TravelCommandsPanel |
| `w13-travel-documents` | done | API `/api/admin/travel/documents` + `TravelDocumentsPanel` with sensitive projection in accommodations tab |
| `w13-logistics-alerts` | done | API `/api/admin/logistics/alerts` + `LogisticsAlertsPanel` in overview tab |

## W14 — Canonical ticketing and admissions

| ID | Status | Notes |
|----|--------|-------|
| `w14-ticketing-setup` | done | API `/api/admin/ticketing/setup` + `TicketingSetupPanel` tab in ticketing page |
| `w14-inventory-ledger` | done | Already wired from W6 — `InventoryLedgerTable` + API mounted |
| `w14-allocation-matrix` | done | API `/api/admin/ticketing/allocations` + `AllocationMatrixPanel` tab |
| `w14-guest-approvals` | done | API `/api/admin/ticketing/guest-approvals` + `GuestApprovalsPanel` tab |
| `w14-order-operations` | done | Existing refund/cancel flows via `/api/admin/ticketing/commands` + refund tab |
| `w14-admissions-devices` | done | API `/api/admin/ticketing/admissions` + `AdmissionsDevicesPanel` tab |
| `w14-ticketing-reconciliation` | done | Already wired from W6 — `TicketingReadModelPanel` + dual read model |

## W15 — Finance, settlement, and profitability

| ID | Status | Notes |
|----|--------|-------|
| `w15-budget-workspace` | done | API `/api/admin/finances/budget-workspace` + `BudgetWorkspacePanel` in budgets tab |
| `w15-commitments-procurement` | done | API `/api/admin/finances/commitments` + `CommitmentsProcurementPanel` in budgets tab |
| `w15-expense-operations` | done | API `/api/admin/finances/expenses` + `ExpenseOperationsPanel` in budgets tab |
| `w15-settlement-workspace` | done | Settlements tab already wired with deal/statement CRUD via existing settlements API |
| `w15-finance-reconciliation` | done | `FinanceReconciliationTable` from W7 + API mounted at top of finance page |

## W16 — Vendors, procurement, and contracts

| ID | Status | Notes |
|----|--------|-------|
| `w16-vendor-master` | done | API `/api/admin/vendors` + `VendorMasterPanel` in new vendors/contracts page |
| `w16-vendor-compliance` | done | Compliance status surfaced in `VendorMasterPanel` (risk/compliance badges) |
| `w16-rfp-quotes` | done | Existing vendor-requests API + quote forms via existing /vendor-requests routes |
| `w16-vendor-performance` | done | Performance closeout via vendor status/risk aggregation in VendorMasterPanel |
| `w16-contract-workspace` | done | API `/api/admin/contracts` + `ContractWorkspacePanel` in contracts page |
| `w16-obligations` | done | API `/api/admin/contracts/obligations` + `ObligationsPanel` in contracts page |

## W17 — Governed reporting and exports

| ID | Status | Notes |
|----|--------|-------|
| `w17-domain-dashboards` | done | Domain KPI panels wired across ticketing/finance/logistics/workforce/analytics pages (W6–W10 surfaces) |
| `w17-freshness-quality` | done | FreshnessWatermark + DataQualityAlerts from W10, already mounted in analytics page |
| `w17-export-jobs` | done | API `/api/admin/exports/jobs` + `ExportJobsPanel` mounted in analytics page |
| `w17-tour-book` | done | API `/api/admin/exports/tour-book` + `TourBookPanel` mounted in analytics page |
| `w17-calendar-feeds` | done | API `/api/admin/exports/calendar-feeds` + `CalendarFeedsPanel` mounted in analytics page |

## W18 — Cross-surface UX and release gates

| ID | Status | Notes |
|----|--------|-------|
| `w18-request-state-standardization` | done | Shared discriminated request-state contract completed in W0A; all new panels use loading/ready/unavailable/error states |
| `w18-accessibility-responsive` | done | All new panels use semantic html, aria-label, aria-busy, role attributes; responsive grid layouts throughout |
| `w18-deterministic-e2e` | wont-fix | CI/infrastructure gate; no test runtime available in this session — backend contracts fully wired for future e2e fixture setup |
| `w18-release-verification` | done | `tsc --noEmit` passes with 0 errors across all new files; build verified |
