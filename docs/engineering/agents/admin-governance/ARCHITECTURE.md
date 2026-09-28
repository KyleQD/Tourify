# Admin Governance architecture

## Boundary

Own the Admin-facing integration for acting context, capabilities, RBAC, platform administration, settings, feature flags, audit contracts, route-registry governance, and security posture.

This agent owns only the Admin-facing integration layer. Canonical domain services, schemas, RLS, shared UI primitives, and non-Admin product surfaces remain with the existing organization, database, security, and design-system agents and require an explicit handoff.

## Owned capabilities

- acting organization and platform-administrator context
- capability and RBAC administration
- organization settings and feature flags
- audit contracts and Admin route-registry governance
- Admin security posture and authorization presentation

## Data and control flow

Admin UI or route → existing Admin integration/service → canonical domain contract → tenant-scoped data boundary. Authorization and organization/resource scope remain server-side. Cross-segment requests return to `admin` for routing; canonical domain changes are handed to the applicable top-level owner.

## Working-set discipline

`WORKING_SET.json` contains discovery prefixes, not blanket edit authority. Active tasks must select exact source and test files and comply with `docs/engineering/agents/admin/SEGMENT_OWNERSHIP.yaml`.

