# Admin Governance interfaces

## Provides

- Admin-facing acting organization and platform-administrator context
- Admin-facing capability and RBAC administration
- Admin-facing organization settings and feature flags
- Admin-facing audit contracts and Admin route-registry governance
- Admin-facing Admin security posture and authorization presentation

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

