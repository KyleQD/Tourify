# Database and Application Performance

## Timing

Begin performance remediation only after correctness and authorization are stable. Optimizing a broken RLS policy or caching a schema failure can make the defect harder to detect.

## Audited database findings

Supabase Performance Advisor returned 4,230 findings:

| Category | Count | Treatment |
|---|---:|---|
| Multiple permissive policies | 2,088 | Consolidate only with persona-equivalence proof |
| `auth_rls_initplan` | 919 | Rewrite safe repeated Auth expressions |
| Unused indexes | 756 | Registry only until representative traffic exists |
| Unindexed foreign keys | 431 | Add only on verified hot paths |
| Duplicate indexes | 36 | Candidate list; no bulk removal |

## Audited application signals

Across 3,452 source files:

- 1,364 `fetch()` calls.
- 4,928 Supabase `.from()` calls.
- 181 `cache: "no-store"` occurrences.
- 285 `force-dynamic` occurrences.
- 569 effect-based fetch/load patterns.

Hotspots include onboarding, tour/event operations, rosters, artist jobs, venue scheduling, site-map viewing, and travel coordination.

## RLS performance strategy

### Step 1 — Rank

Rank policies by:

- Production traffic.
- p50/p95 latency.
- Rows scanned.
- Query-plan cost.
- Policy count per action/role.
- Authorization sensitivity.

### Step 2 — Prove behavior

Capture the authorization matrix and run positive/negative personas before any rewrite.

### Step 3 — Optimize narrowly

- Consolidate overlapping permissive policies by action and role.
- Use scalar subqueries for stable Auth lookups where semantics remain identical.
- Add indexes for verified foreign-key and RLS predicate paths.
- Apply changes in small domain batches.

### Step 4 — Compare

Require before/after:

- Query plans.
- Latency.
- Rows scanned.
- Advisor deltas.
- Write amplification.
- Full persona results.

Any authorization difference is a stop condition.

## Index policy

- Add missing indexes only with a known query or policy path.
- Monitor insert/update/delete cost after each batch.
- Record duplicate indexes as candidates, but remove none in this remediation without separate approval.
- Retain “unused” indexes until production traffic and statistics are representative.
- Prefer online-safe creation for large/hot tables.

## Journey performance budgets

Define budgets for:

1. Login and initial account resolution.
2. Feed and author feed.
3. Public profile.
4. Admin onboarding.
5. Organization tour operations.
6. Roster and scheduling.
7. Venue operations.
8. Travel/logistics coordination.

Each budget should include:

| Metric | Required |
|---|---|
| Server response p50/p95 | Numeric target |
| Database query count | Maximum per route/action |
| Client request count | Maximum per transition |
| Payload size | Maximum initial and paginated |
| Error rate | Alert and rollback threshold |
| Cache freshness | TTL/tag and invalidation rule |
| Tenant isolation | Explicit test |

## Request-fan-out remediation

1. Trace the real request waterfall.
2. Identify duplicate and per-row lookups.
3. Move authorization-sensitive aggregation to bounded server loaders.
4. Replace N+1 reads with joins or two-stage bulk fetches.
5. Add cursor pagination to unbounded lists.
6. Centralize duplicated domain loaders.
7. Deduplicate client requests.
8. Cache only stable reference data with tenant-aware keys.
9. Review every `no-store` and `force-dynamic` use; remove only with correctness proof.
10. Load-test the journey against the Phase 0 baseline.

## Cache safety

Never cache a response across:

- Different tenants.
- Different acting contexts.
- Different visibility roles.
- Block relationship changes.
- Role revocation.
- Feature-flag cohorts.

Cache keys and tags must encode the relevant entity, tenant, and permission-changing version. Sensitive authorization should be revalidated at the correct boundary.

## Completion gate

- Top journeys have approved budgets.
- Hotspots have before/after traces.
- Advisor counts decline through measured work.
- No RLS optimization changes access.
- Query and request fan-out are bounded.
- Pagination exists for large collections.
- Cache isolation and invalidation tests pass.
- Load-smoke results meet the agreed thresholds.

## Related tracker prefixes

`PERF-*`, `API-004`, `QLT-003`
