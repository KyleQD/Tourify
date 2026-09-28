# Admin Logistics architecture

## Boundary

Own the Admin-facing integration for travel, transportation, lodging, equipment, rentals, catering, logistics boards, site maps, and operational tasking.

This agent owns only the Admin-facing integration layer. Canonical domain services, schemas, RLS, shared UI primitives, and non-Admin product surfaces remain with the existing events, organization, workforce, database, venue, and design-system agents and require an explicit handoff.

## Owned capabilities

- logistics command center and operational tasking
- travel, transportation, vehicles, and passenger coordination
- lodging, catering, equipment, rentals, and vendors used in logistics
- site maps, zones, layers, measurements, and issues
- Admin composition of domain-owned logistics contracts

## Data and control flow

Admin UI or route → existing Admin integration/service → canonical domain contract → tenant-scoped data boundary. Authorization and organization/resource scope remain server-side. Cross-segment requests return to `admin` for routing; canonical domain changes are handed to the applicable top-level owner.

## Working-set discipline

`WORKING_SET.json` contains discovery prefixes, not blanket edit authority. Active tasks must select exact source and test files and comply with `docs/engineering/agents/admin/SEGMENT_OWNERSHIP.yaml`.

