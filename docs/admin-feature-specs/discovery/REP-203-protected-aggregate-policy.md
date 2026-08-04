# REP-203 — Protected aggregate policy (implemented)

**Status:** Complete  
**Date:** 2026-07-20  
**Spec:** `docs/admin-feature-specs/13_Reporting_Exports_and_Analytics.md` — REP-203  
**Depends on:** SEC-203 field policy, FIN-102, WORK-102, REP-201 domain metrics

## Acceptance criteria

Finance/personnel/ticket/customer/incident metrics require capability and suppress unauthorized dimensions/drilldowns without inference leaks.

## Policy (`lib/admin/protected-aggregate-policy.ts`)

| Class | View (aggregate) | Dimensions / drilldown |
|-------|------------------|------------------------|
| `finance` | `finance.view`+ | manage/pay/approve (FIN-102) |
| `personnel` | `workforce.view`+ | manage / hiring.manage |
| `ticket` | `ticketing.view`+ | manage / refund |
| `customer` | ticketing.manage / finance.manage / audit.view | same |
| `incident` | `event.live_ops` / `audit.view` | same |

Denied → `value: null`, empty dimensions, no drilldown (**never** fake `0`).

## Wiring

- Command-center people domain access requires workforce/hiring caps (not `tour.manage` alone).
- `buildTourCommandCenterSummary` projects domainMetrics + hydration rows (finance/workforce/vendor).
- Denied personnel/finance aggregates clear row fanout; legacy `counts.teamMembers` / `counts.financeTransactions` are `null` when denied.

## Tests

`__tests__/admin/protected-aggregate-policy.test.ts`

## Follow-ups

- Apply `projectProtectedAggregate` to REP-301+ domain dashboard cards
- REP-501/502 wire ticket/finance KPIs through the same helper
