# Security and Authorization Remediation

## Scope

This workstream covers:

- Public and authenticated grants on privileged functions.
- RLS correctness and policy ownership.
- Service-role bypass risk.
- Parent/child content authorization.
- Organization, venue, tour, employer, and acting-context boundaries.
- Internal/debug/admin RPC exposure.
- Negative authorization testing.

## Finding A — Broad privileged-function execution

The live public schema contains 136 `SECURITY DEFINER` functions. Advisor results include eight anonymous-executable findings and 129 authenticated-role findings; those sets may overlap.

High-risk anonymous examples include functions affecting hiring PII, direct messages, thread membership/admin decisions, conversation creation, and post-style triggers. Some accept caller-controlled identities. The audit did not execute them, so the correct conclusion is exposure requiring immediate containment—not a claim of proven exploitation.

### Remediation sequence

1. Inventory signature, owner, body hash, search path, grants, triggers, policies, callers, and domain owner.
2. Classify each function:
   - Trigger-only
   - Policy helper
   - Client RPC
   - Worker/internal
   - Obsolete candidate
3. Revoke `PUBLIC` and `anon` execution where no approved anonymous caller exists.
4. Make trigger-only functions non-callable by client roles.
5. Convert to `SECURITY INVOKER` when elevation is unnecessary.
6. Move internal helpers outside exposed schemas where feasible.
7. For remaining definers:
   - Set a fixed safe search path.
   - Schema-qualify every referenced object.
   - Derive caller identity from trusted context.
   - Validate tenant/entity membership inside the function.
   - Grant only to the minimum required role.
8. Change default function privileges so new functions are not public by default.
9. Add automated direct-call denial and impersonation tests.

### Emergency anonymous-function gate

Before changing a grant:

- Map all application, trigger, policy, and worker callers.
- Prove the expected user journeys on a disposable/branch database.
- Apply the grant change through one reviewed forward migration.
- Smoke-test intended calls and direct denied calls.
- Roll back exposure by a forward grant migration if a legitimate client breaks.

Do not blanket-revoke all authenticated functions without a caller inventory.

## Finding B — Comments may bypass parent visibility

`GET /api/posts/[id]/comments` uses service-role access, accepts a caller-supplied post ID, and reads comments without first proving the parent post is visible.

### Canonical visibility matrix

The backend and product owners must explicitly decide behavior for:

| Parent state | Expected comment read |
|---|---|
| Public and published | Allowed subject to blocks/moderation |
| Followers-only | Allowed only to approved followers and owner |
| Friends-only | Allowed only to accepted friends and owner |
| Private | Owner and explicitly authorized admins only |
| Unpublished/draft | Author/editor only |
| Soft-deleted | Denied except approved moderation/admin workflows |
| Hard missing | Stable 404 without existence leakage |
| Block relationship | Denied in both directions per approved block contract |
| Account suspended | Follow moderation policy |

### Route redesign

1. Resolve caller identity with a user-scoped server client.
2. Load or authorize the parent using one shared visibility helper.
3. Query child comments only after the parent decision passes.
4. Replace per-comment profile requests with a joined or bounded bulk query.
5. Return stable public errors and a correlation ID; do not expose raw database details.
6. Validate comment creation against visibility, comments-enabled state, blocks, deletion, normalization, and rate limits.
7. Make comment-count updates atomic through a trigger or approved RPC.
8. Add count reconciliation to repair existing mismatches without deleting comments.

### Required tests

- Anonymous public read.
- Authenticated public read.
- Follower/friend allowed and denied.
- Private/draft/deleted parent denied.
- Known post ID does not bypass visibility.
- Blocked users denied.
- Comment creation on invisible/disabled parent denied.
- Concurrent comment creation produces the correct count.

## Finding C — RLS policy gaps and dangerous rules

Four RLS-enabled tables were observed with no policies:

- `application_form_templates`
- `marketplace_payment_events`
- `onboarding_steps`
- `work_mode_publications`

An authenticated insert policy on `music_finance_offering_orders` uses `WITH CHECK (true)`.

### Required decisions

For each table, choose:

- Service-only: revoke client table privileges.
- Client-readable: add explicit select policy.
- Client-writable: add explicit `USING` and `WITH CHECK` ownership/tenant rules.
- Feature-gated: retain closed access until product/legal/security approval.

The music-finance offering path should remain feature-gated until ownership, eligibility, financial compliance, and legal rules are approved.

## Finding D — Multi-entity authorization drift

Live errors include permission failures involving organization membership and tour team members. Hiring/logistics code also spans organization, venue, tour, employer, artist, worker, and acting-context identities.

### Canonical authorization model

Build an entity/action matrix before changing policies:

| Persona | Example allowed scope |
|---|---|
| Anonymous | Explicitly public profiles, events, posts, storefront content |
| General user | Own profile/data and approved interactions |
| Worker | Assigned jobs, onboarding, schedules, scoped documents |
| Artist member/admin | Artist profile/content and approved team operations |
| Venue staff/admin | Venue-owned operations and staff scope |
| Organization staff/admin | Organization-owned tours, hiring, logistics, budgets |
| Tour collaborator | Explicit tour role and stop-specific permissions |
| Platform admin | Audited privileged operations with step-up controls |

Venue and organization permissions must remain independent. A venue is a physical host with its own staff; an organization may book or operate events at the venue but does not inherit venue-admin privileges.

## RPC containment

Classify all absent or risky RPC references as:

- Production business operation.
- Atomic counter/helper.
- Debug/admin utility.
- Legacy compatibility alias.
- Invalid generic SQL executor.

Generic executors such as `exec`, `exec_sql`, and `execute_sql` must not be callable from ordinary production paths. Remove application references and assert direct client denial.

## Authorization test personas

Every active domain should test:

- Anonymous.
- Owner.
- Same-tenant collaborator.
- Organization admin.
- Venue admin.
- Tour collaborator.
- Platform admin.
- Unrelated authenticated user.
- Blocked user.
- Former member after role removal.
- Suspended/deleted state where applicable.

Test reads, inserts, updates, deletes, RPC calls, storage operations, and role changes. Positive tests are insufficient; cross-tenant and caller-identity manipulation tests are required.

## Completion gate

- All 136 definers have an owner and classification.
- Anonymous privileged execution exists only where explicitly approved and tested.
- Internal/admin functions are not client-callable.
- Comments and other child-content APIs enforce parent visibility.
- All active tables have explicit access decisions.
- Multi-entity permissions pass cross-tenant and role-change tests.
- No service-role route substitutes service access for user authorization.

## Related tracker prefixes

`API-*`, `SEC-*`, `RLS-*`, `RPC-*`, `DOM-401`–`DOM-406`, `AUTH-*`, `STO-*`
