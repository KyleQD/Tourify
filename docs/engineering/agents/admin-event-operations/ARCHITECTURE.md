# Admin Event Operations architecture

## Boundary

Own the Admin-facing integration for event setup, advancing, readiness, run of show, day sheets, live tasks, incidents, show-day operations, and closeout.

This agent owns only the Admin-facing integration layer. Canonical domain services, schemas, RLS, shared UI primitives, and non-Admin product surfaces remain with the existing events, organization, database, workforce, and design-system agents and require an explicit handoff.

## Owned capabilities

- event portfolio, setup, advancing, and readiness
- run of show, day sheets, live tasks, and incident response
- show-day work mode and operational collaboration
- event closeout and operational evidence
- Admin composition of canonical event contracts

## Data and control flow

Admin UI or route → existing Admin integration/service → canonical domain contract → tenant-scoped data boundary. Authorization and organization/resource scope remain server-side. Cross-segment requests return to `admin` for routing; canonical domain changes are handed to the applicable top-level owner.

## Working-set discipline

`WORKING_SET.json` contains discovery prefixes, not blanket edit authority. Active tasks must select exact source and test files and comply with `docs/engineering/agents/admin/SEGMENT_OWNERSHIP.yaml`.

