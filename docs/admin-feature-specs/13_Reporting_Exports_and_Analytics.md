# Reporting, command-center analytics, exports, and tour books

## Outcome

Give organization teams trusted, consistently defined operational and commercial reporting without cross-tenant leakage or “zero means failed” ambiguity. Every metric must identify its source, freshness, scope, definition, and drill-down. Exports must reproduce an authorized version and be auditable.

## Current baseline and gaps

- Tour/event/admin analytics, command-center summaries, CSV/HTML exports, calendar feeds, advancing export, and site-map share primitives exist.
- Large client pages fetch many independent sources and often turn errors into empty panels.
- Generic logistics metrics are weak and can average/count overlapping categories.
- Ticketing/finance have legacy/new or isolation inconsistencies, making aggregate totals unsafe until convergence.
- No governed KPI catalog, source freshness, snapshot/version, role projection, or reconciliation discipline across tour domains.
- Tour-book exports need one publication/version/audience model and production PDF/web/offline behavior.

## Reporting principles

- Operational detail stays in canonical domain databases; dashboards use server read models/materialized projections where necessary.
- Every KPI has a documented name, business question, formula, dimensions, inclusion/exclusion rules, source entities/statuses, currency/time zone, freshness SLO, owner, and reconciliation test.
- Unknown/stale/partial/failed data is visually distinct from zero.
- The same metric identifier/formula powers cards, charts, exports, alerts, and API.
- Access is evaluated before aggregation to avoid inference through counts or filenames.
- Reports using mutable operational data declare “live as of” time; published/financial reports reference immutable source versions.

## Reporting scope

### Operational

- Tour readiness and blockers by stop/domain/owner.
- Route mileage/time/risk and unresolved constraints.
- Advance section completion/overdue/variance.
- Party/travel/lodging/equipment/meal completeness and exceptions.
- Staffing coverage, open roles, availability/conflicts, credentials, estimated/actual labor.
- Publication delivery/open/acknowledgement and stale recipients.
- Live timeline variance, tasks, incidents, check-in/attendance.

### Commercial

- Ticket inventory/allocation/sales/refunds/comps/check-in and provider reconciliation.
- Budget baseline/forecast/committed/actual/paid and variance.
- Vendor sourcing/contract/compliance/obligation/invoice status.
- Show settlement and tour profitability by event/department/category/vendor/currency.

## Read-model/API design

- `tour_command_center_summary`: event-driven projection keyed by org/tour/version/access class, with source watermarks and rebuild capability.
- Domain aggregate APIs accept authorized tour/date/stop/department filters and return metric IDs, values, units, dimensions, freshness, completeness, and drilldown token/URL.
- Long exports run as idempotent jobs with requested filter/version/audience, status/progress, signed result, checksum, expiry, and audit.
- Export renderers consume canonical projection contracts; they do not independently reimplement business formulas.

## Detailed task plan

### Phase 0–2 — metric governance and summary foundation

| ID | Task | Acceptance criteria |
|---|---|---|
| REP-001 | Create KPI catalog/template | Product/data owners document definition/source/freshness/access/test for every existing and planned Admin metric; duplicate/conflicting metrics are flagged. |
| REP-101 | Inventory reporting consumers | Every dashboard/card/chart/export/query has source, formula, org filter, failure behavior, owner, canonical replacement and retirement plan. |
| REP-201 | Build command-center summary contract | Identity/version/lifecycle/access, domain counts/risks/freshness/degraded states and direct remediation links are typed and contract-tested. |
| REP-202 | Implement event-driven read-model updates | Domain/outbox events update idempotently; per-source watermarks, replay/rebuild, lag and reconciliation are available. |
| REP-203 | Add protected aggregate policy | Finance/personnel/ticket/customer/incident metrics require capability and suppress unauthorized dimensions/drilldowns without inference leaks. |

### Phase 3–5 — domain dashboards

| ID | Task | Acceptance criteria |
|---|---|---|
| REP-301 | Route/logistics dashboard | Uses normalized legs/manifests/rooms/equipment/meals; completeness and risks have defined denominators, freshness, owner and drilldown. |
| REP-401 | Workforce/advance/live dashboard | Coverage/conflicts/credentials/cost, advance status, publication acknowledgement, timeline variance/tasks/incidents/check-in use governed definitions. |
| REP-501 | Ticketing dashboard | Canonical inventory ledger/provider state feeds event/tour totals; allocations/refunds/comps/attendance and reconciliation variance are explicit. |
| REP-502 | Finance/profitability dashboard | Approved budget/forecast/commitment/actual/settlement data displays original/reporting currency, FX freshness, variance and outstanding items. |
| REP-503 | Vendor/contract dashboard | Engagement/RFP/quote/compliance/contract/signature/obligation/PO/invoice status and risk are attributable and permissioned. |

### Phase 6 — exports and release

| ID | Task | Acceptance criteria |
|---|---|---|
| EXP-601 | Build export job service | Validates org/capability/filter/version/audience, snapshots inputs, renders asynchronously, retries idempotently, expires files, and writes audit/access logs. |
| EXP-602 | Version CSV/XLSX schemas | Columns/types/units/time zone/currency/schema version and backward policy are documented; spreadsheet formula injection is prevented. |
| EXP-603 | Build web/PDF tour book | Composable authorized sections, table of contents, page headers/version/local time context, accessible web equivalent, overflow/empty/error handling, checksum and publication link are complete. |
| EXP-604 | Harden ICS/feed exports | Uses calendar contract and scoped tokens; stable UIDs, updates/cancellations, projection, access logs and revocation are verified. |
| REP-601 | Add reporting freshness/reconciliation UI | Users see source completeness/watermark and last reconciliation; stale/partial values are not styled as final. |
| REP-602 | Add data-quality monitors | Orphan/unscoped/duplicate source, negative/impossible quantities, mismatched totals, missing dimensions and stale projection create owned alerts. |
| REP-603 | Establish performance budgets | Representative tour/org queries and exports meet agreed p50/p95/queue/render/file-size targets without loading entire raw graphs into clients. |
| REP-604 | Retire duplicated client aggregation | UI consumes governed read models; old formulas/fanout are removed after comparison reports match approved tolerances. |

## Export security requirements

- File names and job status are not discoverable across organizations.
- Signed URLs are short-lived; final download reauthorizes where supported.
- Exports contain only requested/authorized columns and rows, including nested/attachment data.
- CSV defends against formula injection; HTML/PDF content is escaped/sanitized; user-uploaded active content never executes.
- Large export rate/concurrency/retention limits prevent abuse.
- Audit captures requester, acting org, report/schema/source versions, filters, audience, size/checksum, result, and downloads where appropriate.

## Test requirements

- Golden metric fixtures with edge statuses, empty data, failed/stale source, currencies/time zones, and role projections.
- Rebuild/replay/idempotency and source-to-projection reconciliation tests.
- Multi-org/inference/bulk export/job/file/token authorization tests.
- Visual/layout/accessibility checks for representative long names, many stops, large tables, missing sections, and translated/Unicode content.

## Deployment readiness

- KPI catalog and governed formulas cover every released dashboard/export.
- Stale, partial, failed, and zero states are distinct and tested.
- Read models rebuild/reconcile from canonical sources and meet freshness/performance SLOs.
- Exports are versioned, scoped, sanitized, expiring, checksummed, and audited.
- Legacy client aggregation is removed after comparison confirms trusted totals.
