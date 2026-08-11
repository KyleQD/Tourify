# Finance, budgets, expenses, cash, and settlements

## Outcome

Provide a secure operational finance workspace in which organizations can plan versioned tour/show budgets, approve commitments, capture receipts/expenses/cash advances/per diems, reconcile ticket and vendor activity, execute show settlements, and report profitability. Every amount must have organization, currency, source, status, and audit context.

## Current baseline and gaps

- Financial transactions, budgets, overview, and settlement CRUD/audit provide a functional starting surface.
- Audited financial RLS grants all authenticated users full access, creating a critical tenant-isolation gap.
- Budgeting is flat and parts of the UI ask users to paste raw event/tour UUIDs.
- Missing hierarchical categories/departments, versions/scenarios, committed versus actual, purchase orders, approval thresholds, receipts, cash advances, per diems, multi-currency/tax, reconciliation, and robust tour profitability.
- Record-ID updates/deletes are not consistently constrained by organization and parent entity.
- Ticketing, vendor/contract, workforce, travel/lodging, equipment/rental, and settlement costs are not one connected subledger.

## Accounting boundary and principles

Tourify should maintain an operational subledger and evidence trail, not silently claim to replace regulated accounting/payroll/tax systems. ADR-008 must define which records are authoritative, which are estimates/commitments/actuals, approval and posting rules, external export/sync boundaries, retention, and correction behavior.

- Store money as integer minor units plus ISO currency; never floating point.
- Preserve original currency, applied FX rate/source/date, and organization reporting currency.
- Posted/approved records are corrected by reversal/adjustment, not destructive edit.
- Budget versions are immutable once approved; forecasts create new versions or controlled revisions.
- Every commitment/actual links to organization and, where applicable, tour, stop/event, department, category, counterparty, contract/PO, and source document.
- Separation of duties is configurable for create/approve/pay/refund/settle.

## Domain model

- `finance_accounts/categories/departments` with organization-owned hierarchy and active/version state.
- `budget_versions`, `budget_lines`, assumptions, scenario, approval/status.
- `financial_transactions` or journal-style entries with type/source/status, original/reporting amounts and references.
- `purchase_requisitions`, `purchase_orders`, lines, approval history, change orders.
- `expenses`, receipt files, submitter, allocation/split, review/approval/reimbursement state.
- `cash_advances`, issue/acknowledge/receipts/return/reconciliation.
- `per_diem_policies`, entitlements, issue/payment/reconciliation.
- `show_settlements`, versioned statement lines, ticket/provider inputs, expenses/deductions, splits/guarantee/bonus, approval/signoff, variance.
- `fx_rates` with source and immutable applied rate records.

## Functional requirements

### Budgets

- Organization templates by tour/event type; department/category hierarchy.
- Baseline, working forecast, approved, and scenario versions.
- Quantity × unit rate, fixed/percentage/formula lines, assumptions, owner, vendor/contract relation, local/reporting currency.
- Planned, requested, committed, actual, paid, and variance values with data freshness/source.
- Rollups by tour, stop, department, category, vendor, and date.

### Spend and cash

- Purchase request → approval → PO/change order → receipt/service confirmation → invoice → payment-status handoff.
- Mobile expense/receipt capture, split allocations, duplicate detection, policy exceptions, approval, and export.
- Cash advance and per-diem eligibility, issue, acknowledgement, receipts/returns, outstanding balance.

### Settlement

- Import/enter ticket statement and approved local costs.
- Contractual deal calculation with transparent formulas/inputs.
- Versioned negotiation adjustments and evidence.
- Internal approval plus counterparty signoff/document.
- Post approved actuals and variances to tour reporting; corrections use a new version/adjustment.

## Detailed task plan

### Phase 0–1 — security and accounting decisions

| ID | Task | Acceptance criteria |
|---|---|---|
| FIN-001 | Approve operational accounting ADR | Defines authoritative records, statuses/posting, currency/FX/rounding, approval/separation, settlement, correction, retention, and external system boundary. |
| FIN-002 | Inventory deployed finance data/policies | Table/policy/grant/row counts, org/parent coverage, currency formats, duplicates, orphan/raw IDs, and legacy consumers are documented. |
| FIN-101 | Add/backfill validated organization scope | Every finance/budget/settlement child has resolvable org and parent consistency; unresolved rows are quarantined and inaccessible. |
| FIN-102 | Replace blanket RLS | Select/insert/update/delete require organization and finance capability; protected payment/person fields use narrower projection; direct-client tests pass. |
| FIN-103 | Harden finance commands | Allowed-field schemas, org/parent predicates, state transitions, idempotency, money validation, expected version, reason, and immutable audit are required. |
| FIN-104 | Remove raw UUID entry UX | Users select authorized tour/event/vendor/PO/category from scoped search; server still validates relation and state. |
| FIN-105 | Establish financial audit/reversal rules | Approved/posted/settled records cannot be deleted/overwritten; reversal/adjustment links and before/after evidence are tested. |

### Phase 5 — budget and procurement controls

| ID | Task | Acceptance criteria |
|---|---|---|
| FIN-501 | Create category/department hierarchy | Organization-owned codes/names, parent, reporting order, allowed scopes, active state, and mapping from legacy categories are complete. |
| FIN-502 | Build budget templates/versions | Apply template with preview; baseline/forecast/scenario/approved status and version history; approved version is immutable. |
| FIN-503 | Build budget-line editor | Quantity/rate/fixed/formula, original/reporting currency, owner, scope, vendor/contract/assumption and notes validate and roll up correctly. |
| FIN-504 | Add commitment/actual rollups | Purchase requests/POs/contracts/invoices/expenses/payroll estimate/travel/tickets/settlement post through typed source adapters and reconcile to budget. |
| FIN-505 | Add approval policy engine | Thresholds by amount/category/department/action, required approvers, separation, delegation/expiry, escalation, and audit are configurable. |
| FIN-506 | Build purchase request/PO/change order | Status lifecycle, lines, approvals, vendor/contract/budget, delivery scope, commitments, documents, change impact, and close/cancel are implemented. |
| FIN-507 | Build invoice match/status | Match invoice to PO/receipt/service, detect quantity/price/tax/currency variance, route exception/approval, and track exported/payment state without pretending to execute payment if not integrated. |

### Phase 5 — expenses, cash, per diems, and settlement

| ID | Task | Acceptance criteria |
|---|---|---|
| FIN-508 | Build expense/receipt workflow | Mobile upload is scanned, fields/currency/date/vendor/category/scope/splits validate, duplicates flag, submit/review/approve/reject/reimburse-export states are audited. |
| FIN-509 | Build cash-advance workflow | Request/approve/issue/acknowledge/spend/return/reconcile with custodian, currency, receipts, outstanding balance, due date, and escalation. |
| FIN-510 | Build per-diem policy/entitlement | Policy applies eligible days/locations/roles/meals/currency/rates/deductions; preview, approval, issue/export, and adjustments are traceable. |
| FIN-511 | Add multi-currency/FX service | Approved rate source/manual override policy, immutable applied rate, rounding, unavailable-rate handling, and original/reporting displays are tested. |
| SETTLE-501 | Define deal templates/formulas | Guarantee, percentage, versus, bonuses, tax/fees/deductions, promoter expenses, caps, and splits are versioned and reviewed by domain experts. |
| SETTLE-502 | Build settlement statement workspace | Imports ticket data, pulls approved costs/contracts, shows formula/evidence, supports adjustments/comments/version and prevents stale source use. |
| SETTLE-503 | Add settlement approval/signoff | Internal approval and external acknowledgement/signature/document are scoped/audited; approved statement posts actuals and variance idempotently. |
| SETTLE-504 | Add tour closeout/profitability | Completed stops roll gross/net revenue, commitments, actuals, outstanding items, settlement status and forecast/final margin with consistent definitions. |

### Phase 6 — reconciliation, export, and release

| ID | Task | Acceptance criteria |
|---|---|---|
| FIN-601 | Create reconciliation jobs/dashboard | Compare source totals to finance entries by type/date/currency/event/provider; mismatches have owner/status/evidence and never silently adjust. |
| FIN-602 | Add accounting export adapter | Versioned export maps stable accounts/vendors/projects/taxes/currencies and records external reference/status; retry does not duplicate. |
| FIN-603 | Finance observability | Alert on unauthorized attempts, failed postings/exports, stale FX, approval backlog, unmatched invoices, overdue cash, unsettled completed shows, and reconciliation variance. |
| FIN-604 | Migrate/retire legacy finance paths | Row/total/currency reconciliation passes; old writes/policies/raw-ID UX are removed; retention and historical access are approved. |

## Test requirements

- Minor-unit, currency exponent, FX, rounding, tax/fee, formula, rollup, version, approval, reversal, split, and settlement property tests.
- Direct database multi-org, field-level, approval/separation, guessed child ID, export, and service job tests.
- Migration reconciliation verifies counts and totals by org/tour/event/currency/status.
- E2E: budget → request/PO → expense/invoice → approval/export → ticket/vendor settlement → tour profitability/correction.

## Deployment readiness

- Finance RLS and command authorization pass independent multi-org review.
- Every amount has correct minor unit/currency/scope/source/status; approved data is append/reversal safe.
- Budget, commitments, actuals, ticket/vendor/workforce inputs, and settlement reconcile within approved tolerances.
- Approval and separation-of-duties rules cannot be bypassed through APIs, direct clients, bulk actions, or service jobs.
- No screen requires raw identifiers and no dashboard presents stale/failed dependency as zero.
