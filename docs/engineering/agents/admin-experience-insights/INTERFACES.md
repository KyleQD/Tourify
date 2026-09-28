# Admin Experience and Insights interfaces

## Provides

- Admin-facing Admin shell, navigation, search, dashboard home, and cross-surface composition
- Admin-facing communications, messaging, notifications, and attention states
- Admin-facing content and network monitoring
- Admin-facing analytics, reporting, exports, and observability
- Admin-facing accessibility and responsive integration across Admin surfaces

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

