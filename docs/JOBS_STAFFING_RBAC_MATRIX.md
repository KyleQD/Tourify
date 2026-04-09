# Jobs and staffing RBAC matrix

This document ties together **org roles** ([`supabase/migrations/20250816132000_org_rbac.sql`](../supabase/migrations/20250816132000_org_rbac.sql)), **entity (Venue) permissions** used in server actions ([`lib/services/rbac`](../lib/services/rbac)), and **worker** access patterns.

## Roles (simplified)

| Actor | Create / publish job templates | View applicants (PII) | Approve / reject | Onboarding / credentials | Staff shifts |
|-------|-------------------------------|------------------------|------------------|----------------------------|--------------|
| Venue owner / admin (`owner`, `admin` org role) | Yes (via `staff.manage` + entity check) | Yes | Yes | Yes | Yes |
| Production lead (`production`) | Yes if permitted by org | Yes | Yes | Yes | Yes |
| Applicant (authenticated user) | No | Own application only | No | Own candidate record only | Assigned shifts only |
| Anonymous | Public job board read only | No | No | No | No |

## Code touchpoints

- **Posting jobs:** [`app/actions/staffing/create-job-posting.ts`](../app/actions/staffing/create-job-posting.ts) — `hasEntityPermission(..., ASSIGN_EVENT_ROLES)`.
- **Hiring helpers:** [`lib/auth/hiring-permissions.ts`](../lib/auth/hiring-permissions.ts) — reuse for new APIs.
- **Approve applications:** [`app/api/admin/applications/route.ts`](../app/api/admin/applications/route.ts) — authenticated admin; extend with org/venue membership checks as you harden multi-tenant access.

## Notes

- Row Level Security on `job_applications`, `staff_onboarding_candidates`, and `staff_documents` must align with this matrix; APIs using the **service role** should remain minimal and audited.
- “Reviewer without full HR access” (masked PII) is a **future** product slice: introduce a dedicated permission flag in `org_role_permissions` before exposing partial applicant views.
