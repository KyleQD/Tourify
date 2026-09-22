# Organization questions for the owner

## Resolved by ORG-002

Question 1 is resolved: retain the `ops_org_id` bridge as the permanent compatibility boundary, with `organizations` as the canonical tenant identity. See `docs/engineering/agents/organization/DECISIONS.md` ORG-002 and `lib/organizations/identity.ts`. The remaining migration work is data repair/retirement sequencing, not a second runtime identity model.

Prioritized (P1 → P3). Each question is tied to a GAPS.md item and framed as **build / fix / drop** with sequencing. Answers become follow-up task records owned by the organization agent.

## P1 — decisions that unblock the next wave of org work

1. **Dual identity model: which is canonical?** (GAPS-12)
   `organizer_accounts.ops_org_id` bridges the public/ops profile (`organizer_accounts`) to the tenant org (`organizations`), while `accounts` is yet another identity. Should the org tenant identity become the single source (orgs move toward `organizations` + migrate `organizer_accounts` to a profile-of-org model), or is the `ops_org_id` bridge the accepted permanent design? This answers ADR-001/002/003 from `docs/admin-feature-specs/00_Master_Roadmap.md` §3. Sequencing impact: every org-surface build depends on this.

2. **Membership lifecycle scope.** (GAPS-1)
   Build org-owned member management (list / role change / revoke / leave / ownership transfer) under `app/orgs/_actions` + `app/api/orgs/**`, or keep membership administration exclusively in the RBAC page (`components/admin/rbac/membership-workspace.tsx`) and only add the missing invite-revocation + atomic-accept RPC (WS-0.2 remaining)? Recommendation: finish WS-0.2 first (revocation column + atomic accept RPC), then decide whether member management belongs to org or admin RBAC.

3. **Cross-check: does membership → capability mapping already hold?** (GAPS-15)
   `org_role_permissions` (DB, `20250816132000_org_rbac.sql`) must be consistent with `lib/auth/admin-capabilities.ts` and the invite roles `owner|admin|production|finance|tour_manager` (`app/orgs/_actions/org-actions.ts`). Build a contract test asserting the mapping before any new capability-gated surface ships.

## P2 — fix items that are ready now

4. **Org invite accept atomicity + hardening.** (GAPS-2, GAPS-10, GAPS-11)
   Fix the accept path: single RPC (`accept_org_invite` style, mirroring `accept_tour_collaboration_invitation`), revocation column, hashed invite tokens (parity with tour invites), rate limit, and audit event. This closes the last WS-0.2 items and the plaintext-token inconsistency. Migrations must go through the gated DB pipeline (WS-1.1).

5. **Delete / gate the legacy `/api/tours` route.** (GAPS-6)
   It is `user_id`-scoped (wrong-tenant risk for multi-account users) and does non-transactional multi-writes with absorbed errors. Admin parity exists (`/api/admin/tours/[id]`, SEC-201). Drop the legacy GET-list/POST, keep only token/accept flows, and point stale clients at admin routes (WS-2.3). Confirm whether any current client depends on `/api/tours` GET/POST first (grep shows none in the working set, but mobile may).

6. **Acting-context headers on org hub panels.** (GAPS-9)
   Fix `components/admin/organization/*` panels to use `useActingContext()`/`actingHeaders` (pattern already proven in `app/admin/dashboard/tours/tours-page-client.tsx` per `.agents/plans/admin-org-schema-reconnect.md`). Small, mechanical, prevents wrong-org data on the org hub.

7. **Public DTO manage-check parity.** (GAPS-8)
   `resolveViewerCanManage` (`lib/public-organization/get-public-organization-profile.ts`) should recognize confirmed tour team members/collaborators so a tour manager can manage the org public page. Confirm the intended audience: should collaborators manage the org public profile, or only their tour?

## P3 — improvements to schedule

8. **Extend `withOrgCommand` adoption.** (GAPS-7)
   Migrate the remaining `app/api/admin/tours/**` mutations off the ~8 guard idioms onto SEC-103 `withOrgCommand` (WS-1.7, SEC-104). Maintainability + uniform audit/correlation; not security-blocking (WS-1.7 found zero unguarded mutations).

9. **RLS final-state reconciliation for tours.** (GAPS-13)
   Collapse the stacked permissive→restrictive policy generations into one coherent, documented policy set and prove it with a multi-org RLS test matrix (WS-1.1, roadmap gate "tenant isolation").

10. **Org test coverage + public-page caching.** (GAPS-4, GAPS-14)
    Add tests for `tour-access.service.ts` and `org-command.ts`; add multi-org RLS fixture tests. Convert public org/tour profile reads to ISR/cache-with-auth-variant (WS-3.4) and stop unbounded `select('*')` in tour routes (WS-3.3).

## Items considered for **drop**

11. **`lib/organization/**` path.** (GAPS-3) Drop the phantom path from `WORKING_SET.json`/`ARCHITECTURE.md` and replace with the real paths (`lib/organizations/`, `lib/public-organization/`, `lib/admin/tour-*`, `app/api/admin/organization/**`, `app/api/admin/tours/**`, admin org/tours UI). Confirm the org-vs-admin ownership line for `app/admin/dashboard/organization/**` + `components/admin/organization/**` (current registry: admin agent owns admin dashboards; org agent owns tours/collaboration/tenant) — either keep panels under admin with org-visible interfaces, or re-scope the working set.

## First five to answer

1. Canonical identity model (`organizations` vs `organizer_accounts` vs `accounts`) — build/fix/drop the ops bridge.
2. Membership lifecycle ownership: org domain vs admin RBAC; and WS-0.2 atomic accept + revocation (build now?)
3. Legacy `/api/tours` GET/POST — delete after confirming zero live clients?
4. Org hub panels acting-context headers — fix mechanical wrong-org risk?
5. Public manage-check for tour collaborators — fix or intentional?
