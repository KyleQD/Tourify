# Organization Ticketing Inventory

## Accepted architecture and discovery

- `docs/architecture/adr/ADR-007-ticketing.md`
- `docs/admin-feature-specs/adr/TIX-001-canonical-ticketing.md`
- `docs/admin-feature-specs/discovery/TIX-002-ticketing-consumer-inventory.md`

## Preserved working-tree ticketing work

- Modified organization ticketing dashboard and event permission helper.
- Untracked event ticketing workspace.
- Untracked ticketing event, invitation, and unified guest-list modules and migration.
- Existing ticketing domain, read-model, command, setup, migration, and test modules.

## Verified drift

- Current customer dashboard is a large client surface backed by enhanced endpoints and false-zero fallbacks.
- Several Admin endpoints reference undeployed tables or incompatible columns.
- Live promotion infrastructure is richer than the active migration chain.
- Ticketing inventory security-definer grants and overlapping policies require reconciliation.
- Existing focused tests are useful but do not prove deployed-schema, RLS, E2E, offline, or load behavior.

## Working constraints

Additive only; no reset, drop, dual-write, deploy, commit, or overwrite of unrelated changes.

