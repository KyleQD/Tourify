# REP-001 — KPI catalog template

**Status:** Complete for Phase 0 governance; runtime convergence remains REP-201+  
**Date:** 2026-07-21

## Template (per KPI)

| Field | Description |
|-------|-------------|
| `kpi_id` | Stable string |
| `name` | Human label |
| `domain` | tour / logistics / workforce / ticketing / finance / vendors / publication |
| `business_question`, `formula` | Decision served and exact calculation |
| `dimensions`, `inclusion_rules`, `exclusion_rules` | Authorized slicing and population boundaries |
| `source_entities`, `source_statuses`, `source_version_mode` | Canonical lineage and live/immutable version behavior |
| `grain`, `unit`, `currency`, `time_zone` | Aggregation and interpretation contract |
| `freshness_slo_minutes` | Maximum accepted lag; null means unresolved and never fresh-by-default |
| `product_owner`, `data_owner` | Accountable definition and source owners |
| `required_capabilities` | Access evaluated before aggregation |
| `degraded_behavior` | Unavailable/partial/stale — never fake zero |
| `reconciliation_test` | Exact source-to-metric comparison |
| `consumers` | Every inventoried dashboard/card/chart/export/query using the metric |
| `governance_status`, `governance_flags`, `conflict_group` | Planned/governed/legacy-conflict status and duplicate/conflict evidence |

## Seed KPIs (to implement in REP-201+)

| kpi_id | Domain | Definition (summary) |
|--------|--------|----------------------|
| `tour.readiness_blocker_count` | tour | Count of open blocker-severity readiness rules |
| `tour.unacked_publications` | publication | Required acks past deadline |
| `route.unresolved_conflicts` | logistics | Open route constraint conflicts |
| `workforce.uncovered_shifts` | workforce | Shifts with zero assignment in window |
| `advance.overdue_sections` | advance | Sections past due without approval |
| `ticketing.scan_reconcile_gap` | ticketing | Sold − scanned − refunded unexplained |
| `finance.budget_variance_pct` | finance | (actual−budget)/budget for active tours |
| `contract.overdue_obligations` | vendors | Obligations past due |

Owner: reporting workstream; dashboards must cite `kpi_id`.

## Enforced catalog

`lib/admin/kpi-catalog.ts` is the typed source of truth. It contains complete
governance records for the eight seed KPI definitions and creates an explicit
`legacy_conflict` record for every item in the REP-101 reporting-consumer
inventory. Legacy entries retain their discovered source/formula/owner but are
not promoted to governed definitions: unresolved access, currency, time zone,
failure-as-empty, mock sources, organization scope, and duplicate replacement
families are machine-visible flags.

`validateKpiCatalog` rejects duplicate KPI IDs, uncovered reporting consumers,
incomplete template records, and unflagged legacy metrics. Focused tests prove
all inventoried consumers are covered and duplicate/conflicting families remain
flagged until their REP-201+ replacement is reconciled.
