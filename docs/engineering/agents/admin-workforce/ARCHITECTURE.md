# Admin Workforce architecture

## Boundary

Own the Admin-facing integration for hiring, applications, offers, onboarding, roster, scheduling, attendance, payroll views, workforce communications, and staffing administration.

This agent owns only the Admin-facing integration layer. Canonical domain services, schemas, RLS, shared UI primitives, and non-Admin product surfaces remain with the existing workforce, organization, events, database, and design-system agents and require an explicit handoff.

## Owned capabilities

- hiring, applications, offers, and onboarding
- roster, teams, staff profiles, and assignments
- scheduling, shifts, attendance, and payroll views
- workforce communications and staffing administration
- Admin composition of canonical workforce contracts

## Data and control flow

Admin UI or route → existing Admin integration/service → canonical domain contract → tenant-scoped data boundary. Authorization and organization/resource scope remain server-side. Cross-segment requests return to `admin` for routing; canonical domain changes are handed to the applicable top-level owner.

## Working-set discipline

`WORKING_SET.json` contains discovery prefixes, not blanket edit authority. Active tasks must select exact source and test files and comply with `docs/engineering/agents/admin/SEGMENT_OWNERSHIP.yaml`.

