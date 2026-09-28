# Admin Workforce interfaces

## Provides

- Admin-facing hiring, applications, offers, and onboarding
- Admin-facing roster, teams, staff profiles, and assignments
- Admin-facing scheduling, shifts, attendance, and payroll views
- Admin-facing workforce communications and staffing administration
- Admin-facing Admin composition of canonical workforce contracts

## Consumes

- Verified acting-user, organization, and resource scope from server-side authorization contracts.
- Canonical services, schemas, RLS policies, and generated types from the owning domain agents.
- Shared design-system and accessibility contracts.
- Parent Admin dispatch, review disposition, dependency sequencing, and cross-segment coordination.
- QA and Release evidence when certification is outside this segment.

## Handoff rules

- Route cross-segment requests to `admin`; do not edit another child segment under an implicit lease.
- Route canonical domain behavior or schema changes through `admin` to the existing top-level owner.
- Record breaking payload, permission, route, event, or schema changes in the task and decision log.

