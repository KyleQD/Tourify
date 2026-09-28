# Admin UI Wiring — Inventory

Wires the spec-builder domain models (`lib/admin/*-phase*.ts`, service layers) into
persisted, organization-scoped APIs and real admin pages/components. A spec task is
not considered integrated when it exists only as a TypeScript model or unit test.
No mock data. No DB reset. Additive only.

Status lives in [PROGRESS.md](PROGRESS.md).

## Completion contract

Each item must have the applicable persistence/RLS, server API, capability-aware UI,
designed request states, and deterministic acceptance tests. Existing production
wiring is recorded as `done`; pure model/test foundations remain `pending` with a
`backend contract only` note in the progress ledger.

---

## Wiring groups (in priority order)

### W0 — Safety, tenancy, and migration gates

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w0-inventory-reconciliation` | Reconcile feature claims with live persistence/API/UI imports | REL-103, REP-101 |
| `w0-service-role-boundary` | Move privileged work behind verified org-scoped jobs | SEC-109 |
| `w0-acting-context-required` | Remove membership-order fallback and require explicit acting org | SEC-101, SEC-110 |
| `w0-capability-fail-closed` | Hide/disable sensitive controls until capability resolution completes | SEC-102, SEC-205 |
| `w0-migration-validation` | Validate tracked and untracked SQL for expand-only/RLS safety | SEC-005, REL-102 |
| `w0-remote-schema-reconciliation` | Compare hosted history/schema with local migrations before execution | SEC-001, REL-004 |
| `w0-supabase-branch-validation` | Apply and verify gated batches on an isolated branch; never reset | REL-005, REL-606 |

### W0A — Shared request state and account command center

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w0a-request-state-contract` | Shared loading/ready/empty/denied/unavailable/stale/error contract | TOUR-105, REP-201 |
| `w0a-dashboard-bff` | Org-scoped dashboard command-center summary with per-domain freshness/errors | REP-201, REP-203 |
| `w0a-dashboard-account-switch` | Clear stale account data and refetch by full acting-context key | SEC-101, SEC-205 |
| `w0a-dashboard-context-bar` | Persistent acting organization, role, and capability context | SEC-101, SEC-205 |
| `w0a-dashboard-states` | Stop presenting failed requests as legitimate zero/empty results | TOUR-105, REP-201 |

### W1 — Tour command-center & readiness

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w1-tour-summary-tab` | Tour detail overview tab — wire real BFF summary API | TOUR-201, TOUR-203 |
| `w1-tour-readiness-gate` | Readiness panel inside tour detail showing blockers | PLAN-206, PUB-201 |
| `w1-tour-lifecycle-strip` | Lifecycle strip transitions (activate/publish/archive/cancel) | TOUR-202 |
| `w1-tour-health-widget` | Health/risk widget on tour detail overview | TOUR-301, TOUR-302 |

### W2 — Tour portfolio

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w2-tour-tags-filter` | Tags filter + saved-view selector on tours list | TOUR-209 |
| `w2-tour-bulk-command` | Bulk command dialog properly wired to `/api/admin/tours/bulk` | TOUR-210 |

### W3 — Publication surfaces

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w3-pub-deliveries-retry` | Retry / force-retry button on delivery dashboard rows | PUB-205 |
| `w3-pub-slo-banner` | SLO violation banner on publications deliveries page | PUB-601 |
| `w3-pub-share-link-panel` | Share-link CRUD panel on tour/event detail | PUB-206, PUB-208 |

### W4 — Tour plan & stops

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w4-tour-stops-list` | Stop list in tour detail — wire to `/api/admin/tours/[id]/stops` | PLAN-201, PLAN-202 |
| `w4-stop-impact-preview` | Stop impact preview dialog (blockers, next actions) | PLAN-204 |

### W5 — Event operations tabs

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w5-event-readiness-panel` | Event setup completeness panel using real readiness API | EVENT-201 |
| `w5-event-version-conflict` | Version conflict banner on event detail | EVENT-104 |

### W6 — Ticketing wiring

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w6-ticketing-inventory` | Inventory ledger table on ticketing page (canonical model) | TIX-502 |
| `w6-ticketing-reconciliation` | Dual-read mismatch panel (legacy vs canonical) | TIX-104, TIX-601 |

### W7 — Finance wiring

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w7-finance-budget-rollup` | Budget rollup card on finances page (committed/actuals/remaining) | FIN-504 |
| `w7-finance-reconciliation` | Finance reconciliation mismatch table | FIN-601 |

### W8 — Workforce wiring

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w8-workforce-slo-banner` | SLO/alert banner on hiring/staff pages | WORK-603 |
| `w8-payroll-export-panel` | Payroll export panel on staff page | WORK-602 |

### W9 — Logistics & travel wiring

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w9-logistics-metrics-card` | Logistics metrics snapshot card on logistics page | LOG-601 |
| `w9-travel-slo-banner` | Travel SLO alert banner on logistics/travel tab | TRAVEL-601 |

### W10 — Analytics / reporting wiring

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w10-reporting-freshness` | Report freshness watermark on analytics page | REP-601 |
| `w10-data-quality-alerts` | Data-quality alerts section on analytics page | REP-602 |

### W11 — Accounts, grants, access review, and audit

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w11-membership-workspace` | Organization member/role lifecycle with immediate revocation | SEC-102, SEC-604 |
| `w11-entity-grants` | Scoped grant creation, expiry, revocation, and resource visibility | SEC-204, SEC-604 |
| `w11-access-review` | Owner review of roles, grants, shares, and privileged actions | SEC-604 |
| `w11-retention-controls` | Permissioned retention/hold status without destructive UI | SEC-605 |

### W12 — Workforce, live operations, and payroll

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w12-hiring-roster-handoff` | Hired candidate to canonical worker/roster identity | HIRE-401, WORK-103 |
| `w12-scheduling-conflicts` | Conflict review, resolution, rest-rule and coverage states | WORK-408, WORK-410 |
| `w12-attendance-corrections` | Audited actual-time and attendance correction ledger | WORK-601 |
| `w12-payroll-export` | Approved, versioned payroll export batches | WORK-602 |
| `w12-workforce-alerts` | Governed workforce health and remediation links | WORK-603, REP-401 |

### W13 — Travel and logistics operations

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w13-party-travel-matrix` | Person/group versus required route leg/night matrix | TRAVEL-301, LODGE-302 |
| `w13-travel-commands` | Proposed/requested/held/confirmed/change/cancel commands | TRAVEL-302, TRAVEL-104 |
| `w13-travel-impact-preview` | Passenger, room, shift, cost, and publication impact preview | TRAVEL-305 |
| `w13-travel-documents` | Protected provider documents and unmatched import review | TRAVEL-501, TRAVEL-502 |
| `w13-logistics-alerts` | Equipment, rental, catering, map, and publication remediation | LOG-601, LOG-602 |

### W14 — Canonical ticketing and admissions

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w14-ticketing-setup` | Explicit ticketing configuration and availability preview | TIX-501 |
| `w14-inventory-ledger` | Append-only inventory movements and reservations | TIX-502 |
| `w14-allocation-matrix` | Tour/stop allocation and deadline management | TIX-503 |
| `w14-guest-approvals` | Comp/guest request, approval, issuance, and attendance | TIX-504 |
| `w14-order-operations` | Scoped resend/transfer/void/refund with impact preview | TIX-506 |
| `w14-admissions-devices` | Scanner/device packages, sync health, gates, and fallback | TIX-509, TIX-511 |
| `w14-ticketing-reconciliation` | Legacy/canonical variance and cutover blocker UI | TIX-104, TIX-601 |

### W15 — Finance, settlement, and profitability

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w15-budget-workspace` | Versioned budget templates/lines, approvals, and rollups | FIN-501, FIN-504 |
| `w15-commitments-procurement` | Commitments, requisitions, POs, receipts, and invoice match | FIN-505, FIN-506 |
| `w15-expense-operations` | Expenses, receipts/splits, cash advances, per diem, and FX | FIN-507, FIN-508, FIN-509 |
| `w15-settlement-workspace` | Deal terms, statement versions, adjustments, approvals, post | SETTLE-501, SETTLE-504 |
| `w15-finance-reconciliation` | Immutable mismatch resolution and accounting export | FIN-601, FIN-602 |

### W16 — Vendors, procurement, and contracts

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w16-vendor-master` | Scoped vendor search/edit, contacts, status, risk, and merge | VEND-501 |
| `w16-vendor-compliance` | Requirements, secure documents, verification, expiry, waiver | VEND-502 |
| `w16-rfp-quotes` | Engagement, RFP/invitation, quote versions, comparison, decision | VEND-503, VEND-504, VEND-505, VEND-506 |
| `w16-vendor-performance` | Delivery evidence, closeout, risk, and performance | VEND-507 |
| `w16-contract-workspace` | Templates, drafts, review, negotiation, signing, amendments | CONT-501, CONT-502, CONT-503, CONT-504, CONT-505, CONT-506 |
| `w16-obligations` | Contract obligations, evidence, reminders, and finance links | CONT-507, CONT-508 |

### W17 — Governed reporting and exports

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w17-domain-dashboards` | Governed logistics/workforce/ticketing/finance/vendor projections | REP-301, REP-401, REP-501, REP-502, REP-503 |
| `w17-freshness-quality` | Source watermarks, reconciliation, partial/stale presentation | REP-601, REP-602 |
| `w17-export-jobs` | Authorized, versioned, auditable asynchronous exports | EXP-601, EXP-602 |
| `w17-tour-book` | Accessible web/PDF tour book with version/checksum | EXP-603 |
| `w17-calendar-feeds` | Scoped token feeds with stable UID and revocation | EXP-604 |

### W18 — Cross-surface UX and release gates

| ID | Surface | Spec tasks |
|----|---------|-----------|
| `w18-request-state-standardization` | Canonical loading/error/empty/denied/stale states across admin pages | REL-603 |
| `w18-accessibility-responsive` | Keyboard, focus, labels, contrast, mobile and overflow pass | REL-603 |
| `w18-deterministic-e2e` | Seeded hard-assertion account and domain workflows | REL-004, REL-607 |
| `w18-release-verification` | Typecheck, build, RLS, advisors, migration and SLO gates | REL-601, REL-604, REL-610 |
