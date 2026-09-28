# Admin Experience and Insights decisions

Append durable decisions using:

## ADMEXP-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision owner: admin
- Decision:
- Evidence:
- Consequences:

Segment-local agents may propose decisions. The parent `admin` agent accepts or rejects decisions that affect more than the assigned bounded task.

## ADMEXP-001 — Tenant-scope a legacy admin method without migrating its auth wrapper

- Date: 2026-09-28
- Status: accepted (segment-local; the parent `admin` agent may overrule, and the grant question below is already routed through ADMIN-022)
- Task: ADMIN-027
- Decision owner: admin
- Decision: To give a `withAdminAuth` handler a tenant boundary without moving it onto `withAdminCapability`, the handler resolves its own acting organization by calling `resolveActingAdminContext(request, auth)` and passing its `NextResponse` through on failure, then verifies it with `resolveAuthorizedOrgLogisticsScope` and uses the resolver's returned `scope.orgId` in an organization predicate on **every** query it issues, reads and writes alike. The service client is taken from `scope.service` rather than constructed by the handler. The auth wrapper is deliberately left as `withAdminAuth`, so the method stays classified `read_only_compat`.
- Evidence: ADMIN-027. The decision rests on the analyzer rather than preference: in `__tests__/admin/support/admin-route-guard-proof.ts`, `guardClassFor` returns `read_only_compat` at the `withAdminAuth` branch, which is evaluated before the `AUTH_PRIMITIVES` branch containing `resolveActingAdminContext`, so the added call is classification-neutral. By contrast `hasAdminCapability` / `requireAdminCapability` are `CAPABILITY_PRIMITIVES` and promote the method to `capability_gated`, which fails `proveAdminRouteEntry` for a `legacy_pending_migration` route with no per-method record and moves `legacyRoutes`, `legacyGuardDrift` and `capabilityGapMethods`. Confirmed after the fact: `__tests__/admin/admin-registry-guard-proof.test.ts` (10 tests) and `npm run check:admin-route-registry` (291 files, 53/53 legacy) both stayed byte-identical to their pre-change runs.
- Consequences: A live P0 cross-tenant write is closed with no registry churn and no lease on an `admin-governance` file. The cost is that a capability-gated route can now be tenant-scoped while still being uncapability-gated, so the organization predicate is the *only* boundary on such a method — it is load-bearing and must be applied in the query, not as a filter after an unscoped read. Anyone who later "hardens" one of these methods by adding a capability check must land that together with the three baseline figures, which requires the `SEGMENT_OWNERSHIP.yaml` grant for `__tests__/admin/admin-registry-guard-proof.test.ts` that ADMIN-022 is blocked on; doing it alone turns the repository red. Two handlers in the same file can now differ in how they surface a resolver denial (PATCH returns the real 403/409, GET still collapses to a 500), which is recorded as follow-up rather than silently absorbed.


