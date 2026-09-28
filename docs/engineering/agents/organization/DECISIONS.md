# Organization decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## ORG-002 — Organizations are the canonical tenant identity

- Date: 2026-09-10
- Status: accepted
- Task: ORG-002
- Decision: `organizations.id` is the canonical organization/tenant identity and `org_members` is the authorization boundary. `organizer_accounts` remains the public/ops profile projection and must link to the tenant through `ops_org_id`. `accounts` remains a compatibility/search projection keyed by `profile_table = 'organizer_accounts'` and `profile_id = organizer_accounts.id`; it is never an authorization grant or a second organization identity.
- Evidence: `20250816132000_org_rbac.sql` defines `organizations`, `org_members`, and their RLS; `20260712005429_organization_public_personas.sql` creates the `ops_org_id` foreign key and creates the organizer profile plus tenant in `create_organizer_account`; `20260711182530_organization_personas_integration.sql` backfills `accounts` from organizer profiles; `lib/auth/admin-context.ts` and `lib/auth/acting-context.ts` now consume the shared contract in `lib/organizations/identity.ts`.
- Consequences: New tenant-scoped authorization must resolve and carry `organizationId`; public profile and account-switcher code may carry `organizerAccountId`; `accounts` rows can be repaired or retired independently without changing tenant authorization. Organizer profiles without `ops_org_id` are legacy/unscoped and cannot authorize organization operations.
