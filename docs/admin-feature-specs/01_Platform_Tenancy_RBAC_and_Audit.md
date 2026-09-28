# Platform foundation: tenancy, RBAC, APIs, RLS, and audit

## Outcome

Create one security and data-access foundation for every organization/admin feature. A user must always know which organization they are acting for, and the server and database must independently enforce that context. Entering the Admin surface must never imply unrestricted access to tours, finance, tickets, personnel, logistics, or contracts.

## Current baseline and gaps

- The Admin shell has an acting-account concept, but multiple services select the first organization membership.
- The broad Admin guard is frequently treated as sufficient authorization.
- Newer tour/event code is organization-scoped while older routes are owner-scoped.
- Finance, legacy ticketing, and several logistics tables contain permissive authenticated RLS policies in the audited migrations.
- Record-ID mutations do not consistently include an organization predicate or validate the parent entity.
- Audit primitives exist but are not uniformly applied or designed as an immutable security trail.

## Target behavior

### Acting context

- The user selects an organization/profile from an account switcher.
- The selection is stored in signed, server-readable session state and exposed to the client as display context only.
- `resolveActingAdminContext()` returns `userId`, `profileId`, `orgId`, membership, role IDs, effective capabilities, and correlation ID.
- If a user has multiple eligible organizations and none is selected, organization-scoped APIs return a typed `409 acting_context_required` response.
- Body/query/path `org_id` values never establish authority; they must equal the resolved context or be rejected.
- Background jobs carry an immutable organization and initiating actor/system principal.

### Capabilities

Minimum capability namespaces:

- `org.roles.manage`, `org.settings.manage`, `audit.view`
- `tour.view/manage/publish/archive/delete`
- `event.view/manage/publish/live_ops`
- `routing.manage`, `advance.manage`, `logistics.view/manage`
- `workforce.view/manage/publish`, `hiring.manage`
- `ticketing.view/manage/scan/refund`, `finance.view/manage/approve/pay`
- `vendor.view/manage`, `contract.view/manage/sign`
- `site_map.view/edit/share`, `communications.send/broadcast`

Default roles should be owner, organization admin, tour manager, production manager, department manager, finance manager, ticketing manager, viewer, and worker. Custom roles may aggregate capabilities but must not override creator/master invariants or grant platform scope.

### Authorization rule

Every sensitive operation enforces:

`authenticated actor` + `acting organization` + `required capability` + `target belongs to organization` + `record state permits action`.

RLS repeats the tenant/relationship boundary. APIs add validation, business rules, audit, and clearer errors; they are not the sole security boundary.

## Data and service design

### Required records

- `organization_roles`: organization, name, system/custom flag, status.
- `organization_role_capabilities`: role-to-capability mapping.
- `org_members`: membership state and role assignments; retain creator/master invariant.
- `entity_grants`: optional exceptions for a tour/event/site map/document with expiry.
- `security_audit_events`: append-only actor, principal type, acting org/profile, action, target type/id, request/correlation ID, IP/user-agent fingerprint where lawful, result, reason, and protected before/after diff.
- `idempotency_keys`: org, actor, command, key, request hash, response reference, expiry.

All operational tables must have non-null `org_id`; child tables may derive it by immutable parent relation only if RLS can safely and efficiently assert that relation. Denormalized `org_id` is preferred on sensitive/high-volume child records and must be consistency-constrained.

### Server interfaces

- `resolveActingAdminContext(request)`
- `requireCapability(context, capability)`
- `requireEntityAccess(context, entityType, entityId, capability)`
- `executeOrgCommand(context, schema, handler)` for validation, idempotency, transaction, audit, and typed errors
- `writeAuditEvent()` through a restricted append-only path
- `authorizeOutboxDelivery()` for publication/notification jobs

Standard errors: `401 unauthenticated`, `403 capability_denied`, `404 entity_not_found` without existence leakage, `409 acting_context_required`, `409 version_conflict`, `422 business_rule_failed`, `503 dependency_unavailable`.

## Detailed task plan

### Phase 0 — decisions and discovery

| ID | Task | Acceptance criteria |
|---|---|---|
| SEC-001 | Inventory deployed database policies and grants | Automated export lists tables, RLS enabled state, policies, functions, triggers, grants, and migration versions; drift from repository is reviewed and stored securely. |
| SEC-002 | Approve acting-context ADR | Session format, switch behavior, multi-tab behavior, expiry, support access, and `409` contract are documented with threat model. |
| SEC-003 | Approve capability matrix | Every Admin navigation item and API command maps to one or more capabilities and default roles; product/security sign off. |
| SEC-004 | Create two-org security fixture | Fixture includes one multi-org user, distinct owners, managers, viewers, workers, and parent/child records in all audited domains. |
| SEC-005 | Establish migration safety process | Dry run, row counts, unresolved bucket, rollback/forward-fix, lock budget, and verification-query template are checked into engineering documentation. |

### Phase 1 — context and authorization convergence

| ID | Task | Acceptance criteria |
|---|---|---|
| SEC-101 | Implement signed acting context | Server resolves the same org as the visible account switcher; tampered/missing values fail safely; switching invalidates org-scoped caches. |
| SEC-102 | Implement capability service | Effective capabilities combine system role, custom role, creator/master invariant, membership state, and scoped grants; unit tests cover precedence and expiry. |
| SEC-103 | Create route/command wrappers | New Admin endpoints cannot execute without context, schema validation, required capability, target assertion, correlation ID, and structured error mapping. |
| SEC-104 | Migrate existing Admin endpoints | Inventory reaches 100% classification; high-risk finance/ticketing/logistics and all tour mutations migrate first; CI rejects unclassified new endpoints. |
| SEC-105 | Add/backfill tenant keys | Finance, logistics, staffing, site-map, ticketing, and child tables receive validated `org_id`; unresolvable rows move to a quarantine table/view and are inaccessible to normal users. |
| SEC-106 | Replace finance RLS | Blanket authenticated policies are dropped; select/insert/update/delete require effective organization relationship and suitable capability/service function. |
| SEC-107 | Replace logistics RLS | Travel, flight, passenger, lodging, guest, transport, rental, and child policies prevent parent-ID and child-ID bypasses. |
| SEC-108 | Replace legacy ticketing RLS | Permissive policies are explicitly dropped, not shadowed; old tables become migration-only/read-only until retired. |
| SEC-109 | Constrain service-role use | Service role exists only in named internal modules/jobs; every call supplies verified org and reason; client-supplied org/target values are revalidated. |
| SEC-110 | Add organization predicates to mutations | Update/delete queries include target ID and acting `org_id`; child mutations validate the parent chain inside the same transaction. |
| SEC-111 | Implement immutable security audit | Privileged reads/exports and every mutation write an append-only result event; audit failures follow an approved fail-closed/fail-open policy by action class. |
| SEC-112 | Add authorization contract tests | Endpoint tests cover owner, role, custom role, expired/revoked membership, wrong org, guessed ID, child ID, bulk IDs, share token, and service job. |

### Phase 2–5 — domain enforcement

| ID | Task | Acceptance criteria |
|---|---|---|
| SEC-201 | Retire owner-only tour authorization | Legacy routes delegate to canonical org/entity authorization; valid collaborators receive consistent behavior across every command-center tab. |
| SEC-202 | Introduce state-aware authorization | Published, active, settled, archived, and legally retained records enforce stronger actions and approval/separation-of-duties rules. |
| SEC-203 | Add field-level protected-data policy | Traveler PII, accessibility/dietary data, financial details, contracts, credentials, and incidents expose only the minimum required fields by role/audience. |
| SEC-204 | Add delegated/external access model | Venue/vendor/contractor links grant only named resources/actions, expire automatically, and cannot enumerate organization data. |
| SEC-205 | Enforce capability-aware UI | Navigation and controls reflect capability but never replace server enforcement; denied actions explain how to request access without revealing protected data. |

### Phase 6 — assurance and operations

| ID | Task | Acceptance criteria |
|---|---|---|
| SEC-601 | Automated RLS matrix in CI | Direct authenticated database clients prove cross-org denial for every table/action and valid access for each intended relationship. |
| SEC-602 | Authorization observability | Metrics and alerts cover denied spikes, context mismatches, service-role usage, policy errors, and audit-write failures without logging secrets/PII. |
| SEC-603 | Security review and penetration test | Independent review covers IDOR, privilege escalation, token leakage, bulk/export bypass, race conditions, webhook replay, and stored-file access; critical/high items are closed. |
| SEC-604 | Access review workflow | Organization owners can review members, roles, entity grants, external shares, and recent privileged actions; revoked access takes effect immediately. |
| SEC-605 | Data-retention controls | Retention/deletion policies are implemented and tested for audit, finance, tickets, contracts, personnel, incidents, and uploaded documents. |

## Test matrix

- API unit/contract tests for every standard error and capability branch.
- Database tests executed as anonymous, authenticated Org A, authenticated Org B, revoked member, and service role.
- Browser tests verify account switch, stale tab, bookmark/deep link, refresh, multi-tab switch, and permission changes during a session.
- Concurrency tests cover membership revocation during a write and organization switching during queued requests.
- Export/share tests prove that filters and child records cannot bypass organization scope.

## Deployment and migration plan

1. Deploy context resolver and audit in observe-only mode; compare resolved org with existing behavior.
2. Add nullable tenant keys, backfill, report unresolved rows, then enforce constraints.
3. Introduce restrictive policies under a pilot flag/role test harness; validate with both API and direct client.
4. Migrate high-risk endpoints and enable per pilot organization.
5. Enforce capability middleware globally and make unclassified endpoints fail CI.
6. Disable legacy writes, monitor reconciliation, then remove old policies/routes.

## Definition of deployment readiness

- No endpoint or table relies on “is Admin” alone for sensitive authority.
- Cross-organization access tests pass for every parent and child entity.
- The active organization is explicit in UI, API context, audit events, jobs, exports, and alerts.
- No unresolved unscoped production row is reachable by normal users.
- Owner/role/grant changes propagate within the documented cache-invalidation SLO.
- Security review has no open critical/high issue and rollback has been rehearsed.
