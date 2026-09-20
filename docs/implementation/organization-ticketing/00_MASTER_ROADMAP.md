# Organization Ticketing Redesign — Master Roadmap

## Execution rule

Work advances in strict phase order from `TKT-P00` through `TKT-P12`. A phase is closed only when every task is `done` or has an approved `wont_fix` rationale and the phase acceptance evidence is recorded in `implementation-manifest.json` and `.agents/organization-ticketing/TASK_LOG.md`.

The program is additive and non-destructive. It does not reset the database, drop historical tables, weaken row-level security, dual-write, deploy, or commit. Canonical writes become forward-only after an organization crosses the canonical-write gate.

## Phase gates

| Phase | Objective | Dependency | Gate |
| --- | --- | --- | --- |
| `TKT-P00` | Organization context and tenant isolation | None | Verified organization authority and cross-tenant isolation |
| `TKT-P01` | Canonical contract | P00 | One typed source-of-truth and state-machine contract |
| `TKT-P02` | Compatibility repositories | P01 | Runtime consumers no longer choose tables directly |
| `TKT-P03` | Organization dashboard | P02 | Truthful portfolio, alerts, freshness, and no migration UI |
| `TKT-P04` | Event workspace | P03 | Seven functional, deep-linkable, permission-aware tabs |
| `TKT-P05` | Inventory and pricing | P04 | One reconstructable inventory calculation; no oversell |
| `TKT-P06` | Orders and attendees | P05 | Scoped, auditable, idempotent operations and PII controls |
| `TKT-P07` | Admissions and access | P06 | Online/offline admission operations reconcile deterministically |
| `TKT-P08` | Promotions and distribution | P06 | Existing promoter network is canonical and reconciled |
| `TKT-P09` | Finance integration | P06, P08 | Ticketing projections tie to Finance evidence |
| `TKT-P10` | Analytics | P05–P09 | Governed definitions and explicit source freshness |
| `TKT-P11` | Cutover | P00–P10 | Per-organization, approved reconciliation evidence |
| `TKT-P12` | Release readiness | P11 | Security, E2E, performance, accessibility, and runbooks pass |

## Non-negotiable release gates

- Zero cross-organization leakage and zero oversell under required concurrency.
- No customer-facing migration/debug language and no false-zero metrics.
- All seven event workspace tabs pass authenticated end-to-end tests.
- Offline admissions reconcile deterministically.
- Finance and ticketing totals reconcile in integer minor units.
- Ticketing-specific blocker/high security findings are closed.
- Every stable manifest task is `done` or explicitly approved as `wont_fix`.

## Current pointer

`TKT-P00 / TKT-0001`

