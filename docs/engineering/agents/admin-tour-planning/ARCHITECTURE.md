# Admin Tour Planning architecture

## Boundary

Own the Admin-facing integration for tour portfolio, lifecycle, builder, stops, routing, holds, collaboration, publication, tour books, and the tour command center.

This agent owns only the Admin-facing integration layer. Canonical domain services, schemas, RLS, shared UI primitives, and non-Admin product surfaces remain with the existing events, organization, artist, venue, database, and design-system agents and require an explicit handoff.

## Owned capabilities

- tour portfolio and command-center surfaces
- tour creation, lifecycle, duplication, archival, and publication
- stops, holds, routing, readiness, and collaboration
- tour books, exports, saved views, and planning workflows
- Admin composition of domain-owned tour contracts

## Data and control flow

Admin UI or route → existing Admin integration/service → canonical domain contract → tenant-scoped data boundary. Authorization and organization/resource scope remain server-side. Cross-segment requests return to `admin` for routing; canonical domain changes are handed to the applicable top-level owner.

## Working-set discipline

`WORKING_SET.json` contains discovery prefixes, not blanket edit authority. Active tasks must select exact source and test files and comply with `docs/engineering/agents/admin/SEGMENT_OWNERSHIP.yaml`.

