# REP-201 — Command-center summary contract (implemented)

**Status:** Complete  
**Date:** 2026-07-20  
**Spec:** `docs/admin-feature-specs/13_Reporting_Exports_and_Analytics.md` — REP-201  
**Upstream:** TOUR-203 summary BFF

## Acceptance criteria

Identity/version/lifecycle/access, domain counts/risks/freshness/degraded states and direct remediation links are typed and contract-tested.

## Contract (`lib/admin/command-center-summary-contract.ts`)

| Field | Notes |
|-------|--------|
| `contractVersion` | `1` |
| `identity` | org/tour ids, name, lifecycle state, dates |
| `lifecycle` | last command / transition / publisher |
| `versions` | metadata / plan / published |
| `access` | access class + domain capability projection |
| `domainMetrics[]` | count **nullable** when `denied`/`unavailable`; state + remediationUrl |
| `risks[]` | severity + **required** remediationUrl |
| `freshness` | generatedAt, isStale, staleReasons, isDegraded, p95TargetMs |

### Degraded vs zero

- Capability denied → `state: denied`, `count: null` (not 0)
- Load failure → `state: unavailable`, `count: null`, remediation deep link
- Success → `state: ok`, numeric count

## Wiring

- `buildTourCommandCenterSummary` emits `contract` + `domainMetrics` + risk remediation links
- `GET /api/admin/tours/[id]/summary` returns `contract` and `meta.contractVersion` / `meta.isDegraded`
- Consumer inventory: `REP-QUERY-TOUR-CMD-SUMMARY`

## Tests

- `__tests__/admin/command-center-summary-contract.test.ts`
- `__tests__/admin/tour-command-center-summary.test.ts` (extended)

## Follow-ups

- REP-202 — event-driven watermarks / rebuild
- REP-203 — protected aggregate policy for finance/personnel dimensions
