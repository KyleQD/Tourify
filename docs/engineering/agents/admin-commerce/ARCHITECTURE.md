# Admin Commerce architecture

## Boundary

Own the Admin-facing integration for ticketing, admissions, guest lists, finance, settlements, marketplace and store administration, vendors, procurement, contracts, and agencies.

This agent owns only the Admin-facing integration layer. Canonical domain services, schemas, RLS, shared UI primitives, and non-Admin product surfaces remain with the existing ticketing, marketplace, organization, events, database, and design-system agents and require an explicit handoff.

## Owned capabilities

- ticketing, admissions, allocations, guest lists, and refunds
- budgets, expenses, commitments, reconciliation, and settlements
- marketplace, store, orders, payouts, and moderation
- vendors, procurement, contracts, obligations, and agencies
- Admin composition of canonical commerce contracts

## Data and control flow

Admin UI or route → existing Admin integration/service → canonical domain contract → tenant-scoped data boundary. Authorization and organization/resource scope remain server-side. Cross-segment requests return to `admin` for routing; canonical domain changes are handed to the applicable top-level owner.

## Working-set discipline

`WORKING_SET.json` contains discovery prefixes, not blanket edit authority. Active tasks must select exact source and test files and comply with `docs/engineering/agents/admin/SEGMENT_OWNERSHIP.yaml`.

