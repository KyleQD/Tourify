# Organization gaps

Task: ORG-001. Triage: **missing** = nothing exists / **incomplete** = exists but not finished / **improve** = works but needs hardening. Every item has evidence and a location. Not all gaps are bugs; sequencing is the owner's decision (see QUESTIONS.md).

## Missing

1. **Org-owned membership lifecycle surface.**
   The org domain has `createInviteAction` and `/api/orgs/invite/accept` only (`app/orgs/_actions/org-actions.ts`, `app/api/orgs/invite/accept/route.ts`). There is no org-facing member **list / role change / revoke / leave-org / ownership-transfer** action or route under `app/orgs/**` or `app/api/orgs/**` (api-routes.md lists only `/api/orgs/invite/accept`). Membership administration lives in the separate RBAC page (`components/admin/rbac/membership-workspace.tsx`, `app/api/admin/rbac/members/route.ts`), not in the org working set. The C2 fix even relied on invite-only membership; revocation is called out as remaining in `docs/DEVELOPMENT_BACKLOG.md` WS-0.2 ("Add invite revocation column + atomic accept RPC migration").

2. **Org invites: revocation column + atomic accept RPC.** WS-0.2 remaining. `org_invites` accepts are multi-step, non-transactional writes (member upsert → invite update → account_relationships upsert) in `app/api/orgs/invite/accept/route.ts`; a mid-sequence failure leaves a dangling `org_members` row or orphan relationship. Tour invites already have an atomic RPC (`accept_tour_collaboration_invitation`, `app/api/tours/invitations/[token]/route.ts`); org invites do not. No migration exists for an `org_invites.revoked_at` column.

3. **`lib/organization/**` declared but absent.** `WORKING_SET.json` and `ARCHITECTURE.md` list `lib/organization/**`; the directory does not exist. Real code lives in `lib/organizations/`, `lib/public-organization/`, `lib/auth/org-command.ts`, and `lib/admin/tour-*`. This is a working-set defect that misguides future discovery and audit scope.

4. **Org-domain test coverage.** Only 5 files exist in `__tests__/organization/` (see BASELINE §6). There are no tests for `lib/admin/tour-access.service.ts`, `lib/auth/org-command.ts`, the tour collaboration invite accept RPC, org-member lifecycle, or the multi-org RLS matrix described as a release gate in `docs/admin-feature-specs/00_Master_Roadmap.md` §8.

## Incomplete

5. **Admin org governance panels are read-only.** Under `app/api/admin/organization/**`, only `settings` (GET/PATCH) and `communications-settings` (GET/PATCH) write; `ticketing-settings`, `finance-settings`, `vendor-governance`, `workforce-settings`, `publication-health`, `tours-health`, `security-summary`, `overview` are GET-only (api-routes.md lines 197–206; permissions.md lines 246–255). The hub (`app/admin/dashboard/organization/page.tsx`) renders all 16 tabs, but most settings tabs have no save path.

6. **Legacy `/api/tours` route survives with non-org scope (WS-2.3).** `app/api/tours/route.ts` GET filters `.eq('user_id', user.id)` — multi-account users silently get the wrong tenant's data (the exact "Class A" acting-context defect documented in `.agents/plans/admin-org-schema-reconnect.md`), and POST writes tour + default `events_v2` + `tour_events` + `total_shows` in non-transactional steps with errors absorbed (`recordLegacyTourRouteHit`, returns `success:true` with empty tours on `42P01`). The admin parity route (`app/api/admin/tours/[id]/route.ts`, SEC-201) exists; retirement of the legacy route is a stated backlog item (WS-2.3).

7. **`withOrgCommand` (SEC-103) adoption is limited to 5 endpoints.** `lib/auth/org-command.ts` is the canonical org command wrapper, but `app/api/admin/tours/**` mutations overwhelmingly use `withAdminCapability` + `assertAdminTourAccess` (WS-1.7 documents ~8 guard idioms that predate the wrapper). Only `app/api/admin/tours/route.ts` (DELETE), `app/api/admin/tours/bulk/route.ts`, and the three `*/commands/route.ts` (finance/logistics/ticketing) use it.

8. **Public org DTO manage-check omits tour collaborators.** `lib/public-organization/get-public-organization-profile.ts` (`resolveViewerCanManage`) checks `org_members` (owner/admin/tour_manager) and `account_relationships`, but not `is_confirmed_tour_team_member` / tour collaboration invites. A tour-scoped collaborator therefore cannot manage the org's public page even when they can plan the tour — inconsistent with the TOUR-102 collaboration model in `lib/admin/tour-access.service.ts`.

9. **Admin org panels fetch without acting-context headers.** `components/admin/organization/org-overview-panel.tsx` calls `fetch('/api/admin/organization/overview', { credentials: 'include' })` — no `actingHeaders`, no `useActingContext` guard (same for sibling panels by pattern). This reproduces the multi-account wrong-org data risk documented in `.agents/plans/admin-org-schema-reconnect.md` §1 (Class A) on the org hub itself.

10. **Tour invitations are hashed; org invitations are not.** `app/api/tours/invitations/[token]/route.ts` stores/looks up `token_hash` (`lib/admin/tour-collaboration-invitations.ts`), while `org_invites.token` is stored plaintext (`app/orgs/_actions/org-actions.ts` insert; `app/api/orgs/invite/accept/route.ts` `.eq('token', token)`). Schema + behavior inconsistency with security impact; fixing requires migration (DB pipeline).

## Improve

11. **Org invite accept has no rate limit or audit event.** `createInviteAction` rate-limits (`createRateLimiter`), but `app/api/orgs/invite/accept/route.ts` does not; accept also writes `account_relationships.permissions` without a security-audit event (contrast `lib/auth/org-command.ts` audit intent/outcome pattern).

12. **`organizations` vs `organizer_accounts` dual identity model.** Tenant context is `organizations` + `org_members` + `org_role_permissions` (`20250816132000_org_rbac.sql`); public/ops identity is `organizer_accounts` with `ops_org_id` bridging the two (`20260604100000_content_moderation.sql`, `20260712005429_organization_public_personas.sql`), plus `accounts`/`profiles` for social identity. The roadmap's Phase-0 decisions (ADR-001 acting account, ADR-002 ownership, ADR-003 capabilities in `docs/admin-feature-specs/00_Master_Roadmap.md` §3) are still "required answer"; the code has grown the `ops_org_id` bridge as a de-facto decision that should be ratified or changed before more surfaces are built.

13. **Tour RLS policy stacking / archive-sourced tables.** `tours` is created in `archive/critical_missing_tables.sql` with an open `auth.role()='authenticated'` `tours_read`/`tours_write` baseline (`20250818121000_tours_core.sql`), tightened later by `20260710024052_fix_tours_rls_recursion.sql`, `20260710032640_harden_tour_events_org_rls.sql`, `20260710032714_harden_tour_satellite_rls.sql`, and `20260825140000_phase4_tour_events_org_match_and_ghost_sweep.sql`. Multiple stacked generations + archive-sourced DDL is exactly the migration-reconciliation risk WS-1.1 targets; needs a coherent final policy state + multi-org RLS tests.

14. **`select(*)` and N+1 queries in org hot paths.** `app/api/tours/[id]/route.ts`, `teams`/`invites` routes use `.select('*')`; the public DTO fans out roster→`profiles` in a second query (`lib/public-organization/get-public-organization-profile.ts`). WS-3.3 bans unbounded `select('*')`; WS-3.4 wants cached public profiles. Not launch-blocking but on the P3 list.

15. **Role → capability mapping lives only in the DB.** `org_role_permissions` (DB) and `lib/auth/admin-capabilities.ts` (`hasAdminCapability`) must stay in lockstep, and roles invented at invite time (`owner|admin|production|finance|tour_manager`) must map to the capability catalog (ADR-003 not yet answered). No code-level test asserts the mapping is complete.

## Blocks

- None currently. WS-0.2's remaining migration items are explicitly gated on the DB pipeline (`docs/DEVELOPMENT_BACKLOG.md` WS-0.2/WS-1.1); those are sequencing dependencies, not audit blockers.