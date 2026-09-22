# Runtime Schema and API Contract Restoration

## Problem statement

Current live traffic is hitting a schema contract the connected database does not satisfy.

Observed missing or invalid runtime targets include:

- `artist_music.trust_schema_version`
- `artist_music.origin_status`
- `tour_artists.artist_user_id`
- `artist_merchandise.is_active`
- `posts.poll_ends_at`
- `posts.poll_total_votes`
- `account_relationships.owner_user_id`
- Missing marketplace fulfillment/integration relations
- Function return shapes that do not match declarations
- Permission failures around organization/tour membership

Static analysis also found approximately 83 table-like targets and 16 RPC names absent from the live public schema. Static references are an inventory, not proof every feature should be built.

## Core rule

Every production reference must resolve in one of two ways:

1. The relation, column, RPC, view, or bucket exists in the approved baseline with correct authorization; or
2. The path is explicitly future-gated/retired and proven inaccessible in production.

“Missing table means return an empty success” is not an acceptable contract for an active feature because it hides outages as valid empty data.

## Machine-readable contract gate

Generate a manifest from production source that captures:

- Schema name.
- Relation/view name.
- Selected, inserted, updated, and ordered columns.
- RPC name and expected argument/return shape.
- Storage bucket and object-prefix reference.
- Source file and route.
- Owning domain.
- Feature flag/capability.
- Dynamic-name justification and allowlist entry.

Compare it in CI with disposable-database metadata and freshly generated types. A mismatch fails CI unless the owning route is server-gated and the inaccessible-path test passes.

## Runtime error containment

Before schema convergence:

1. Register each live error signature.
2. Associate request count, route, user journey, write risk, and owner.
3. Rank by data-loss/security/user-impact risk.
4. Disable unreleased capabilities on the server.
5. Return a stable capability-unavailable response.
6. Add alerts for:
   - Missing relation.
   - Missing column.
   - Permission denied.
   - Function return mismatch.
   - Schema-cache mismatch.
7. Keep the signature open until it remains at zero through the observation window.

Client-only hiding is insufficient; the server path must reject execution.

## Domain Batch 1 — Feed and social graph

### Known contracts

- Poll columns and potentially poll tables/RPCs.
- Account relationship ownership.
- Comment counter atomicity.
- Parent-post visibility.

### Implementation

1. Decide whether polls are currently released.
2. If active, approve column types, nullability, defaults, close behavior, vote uniqueness, RLS, and backfill meaning.
3. Add schema through a forward migration.
4. Add `owner_user_id` without replacing existing relationship identifiers.
5. Backfill through deterministic ownership sources.
6. Implement atomic comment counters and reconciliation.
7. Validate feed, author feed, profiles, comments, polls, follows, friends, and blocks.

### Do not

- Create poll tables solely because static code mentions them.
- Guess relationship ownership.
- use a service-role fallback to make social reads “work.”

## Domain Batch 2 — Music, artist, merchandise, and tour participation

### Known contracts

- Music trust/origin state fields.
- Artist-to-tour user mapping.
- Merchandise active state.
- RPC return-shape mismatches.

### Implementation

1. Approve the music trust/origin state model and compatibility defaults.
2. Add nullable/safely defaulted expansion columns.
3. Backfill in resumable batches while preserving original metadata.
4. Resolve `artist_user_id` through verified account/profile relationships.
5. Quarantine ambiguous tour-artist mappings for manual review.
6. Add or derive merchandise active state without hiding existing listings.
7. Version function signatures where an active caller cannot switch atomically.
8. Validate upload, preview, trust metadata, public player, merch, and roster flows.

## Domain Batch 3 — Marketplace integration and fulfillment

### Known absent relations

- `marketplace_fulfillment_requests`
- `marketplace_integration_sync_runs`
- `marketplace_integration_products`

### Implementation

1. Map which external checkout, native checkout, booking request, quote request, synchronization, and fulfillment paths are exposed.
2. Server-gate unreleased connectors.
3. For released paths, add tables with:
   - Seller/entity scope.
   - Provider and external identifiers.
   - Status constraints.
   - Timestamps and audit history.
   - RLS and minimum grants.
   - Foreign keys and verified indexes.
4. Make sync operations idempotent with uniqueness constraints.
5. Add bounded retry, dead-letter, and audit behavior without deleting failures.
6. Validate guest/buyer/seller/admin personas and all released transaction modes.

## Domain Batch 4 — Hiring, staffing, logistics, and membership

### Scope

Authorization and schema are intertwined across organization, venue, tour, employer, worker, staff zone, shift, role, advancing, and logistics data.

### Implementation

1. Approve the canonical acting-context and tenant-scope model.
2. Repair membership helpers without service-role bypass.
3. Classify all missing operational relations.
4. Add only `ACTIVE_REQUIRED` relations.
5. Include tenant keys, RLS, audit fields, retention, and indexes in the same reviewed design.
6. Gate future logistics/staffing modules whose data model remains undecided.
7. Test organization, venue, artist, worker, tour collaborator, and unrelated personas.

## RPC restoration

The 16 absent RPCs must be handled individually.

| Class | Action |
|---|---|
| Business operation | Implement/version with typed inputs, explicit authorization, grants, stable return |
| Counter/helper | Prefer trigger or atomic statement; use RPC only when justified |
| Debug/admin | Remove from production code and deny direct client calls |
| Legacy alias | Temporary wrapper with owner and retirement date |
| Generic SQL/schema executor | Remove and block |

## API contract standards

Every active API route should define:

- Authentication mode.
- Authorization source.
- Tenant/entity scope.
- Input schema and size limits.
- Stable success and error shapes.
- Pagination/cursor behavior.
- Idempotency requirements.
- Transaction boundaries.
- Retry behavior.
- Audit event requirements.
- Feature-flag off/on behavior.
- Data freshness/caching contract.

Raw database error messages must remain server-side and be tied to a correlation ID.

## Completion gate

- Active source references no absent database or storage target.
- Unreleased paths are server-gated and tested inaccessible.
- Live missing-object and return-mismatch signatures remain at zero.
- Generated types match the approved disposable baseline.
- Every dynamic relation/RPC reference has an owner and explicit allowlist entry.
- Critical journeys pass contract and persona tests.

## Related tracker prefixes

`RUN-*`, `CON-*`, `DOM-*`, `RPC-*`, `API-*`
