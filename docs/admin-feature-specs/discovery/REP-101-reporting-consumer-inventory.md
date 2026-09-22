# REP-101 — Inventory reporting consumers

**Date:** 2026-07-20  
**Spec:** `13_Reporting_Exports_and_Analytics.md`

## Acceptance criteria

Every dashboard/card/chart/export/query has source, formula, org filter, failure behavior, owner, canonical replacement and retirement plan.

## What shipped

Machine-readable inventory:

- `lib/admin/reporting-consumer-inventory.ts` — `REPORTING_CONSUMERS` (~55) + coverage assert
- `__tests__/admin/reporting-consumer-inventory.test.ts`

Kinds covered: dashboard, card, chart, export, query, widget.

### Priority gaps

1. **Failure ≡ zero** — `REP-QUERY-DASHBOARD-STATS` catch path; analytics `EMPTY_STATS`
2. **Org holes** — `REP-QUERY-TOP-PERFORMERS` unscoped; analytics CSV first membership; global artist/venue counts
3. **Zero-mock** — legacy `dashboard.tsx`, vendor export stub, synthetic revenue history, hardcoded ticketing trends
4. **Incomplete series** — finance/analytics charts on ≤10 recent txs
5. **Exports pre-EXP-601** — sync CSV blobs; no job/version/checksum
6. **Duplicate fans** — home KPIs ≈ analytics ≈ embed dashboard; logistics metrics ≈ tour summary

### Retirement clusters

| Cluster | Plan |
|---|---|
| Dashboard stats + analytics page + embed | consolidate → org KPI read model |
| Ticketing trends + event analytics | replace → REP-501 |
| Client CSV (finance/inventory/content) | replace → EXP-601/602 |
| Legacy mock dashboard + placeholders + vendor stub | retire |
| Tour/calendar/site-map/advancing exports | keep → EXP-603/604 |
| Finance overview / logistics metrics / content-hub | keep (harden) |

## Follow-ups

- Phase 2 starts at `SEC-201` (REP-201+ later in Phase 2 for command-center summary)
- `REP-001` KPI catalog should consume these IDs as the consumer side
