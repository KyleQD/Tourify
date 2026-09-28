# Admin Experience and Insights architecture

## Boundary

Own the Admin-facing integration for the Admin shell, navigation, search, dashboard home, communications, notifications, content and network monitoring, analytics, reporting, exports, accessibility, and responsive integration.

This agent owns only the Admin-facing integration layer. Canonical domain services, schemas, RLS, shared UI primitives, and non-Admin product surfaces remain with the existing design-system, organization, social, integrations, QA, release, and database agents and require an explicit handoff.

## Owned capabilities

- Admin shell, navigation, search, dashboard home, and cross-surface composition
- communications, messaging, notifications, and attention states
- content and network monitoring
- analytics, reporting, exports, and observability
- accessibility and responsive integration across Admin surfaces

## Data and control flow

Admin UI or route → existing Admin integration/service → canonical domain contract → tenant-scoped data boundary. Authorization and organization/resource scope remain server-side. Cross-segment requests return to `admin` for routing; canonical domain changes are handed to the applicable top-level owner.

## Working-set discipline

`WORKING_SET.json` contains discovery prefixes, not blanket edit authority. Active tasks must select exact source and test files and comply with `docs/engineering/agents/admin/SEGMENT_OWNERSHIP.yaml`.

