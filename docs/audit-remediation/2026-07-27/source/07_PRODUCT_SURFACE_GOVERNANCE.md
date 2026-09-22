# Product-Surface and Schema Governance

## Problem statement

Tourify’s current surface is large relative to active usage:

- About 6,594 tracked files.
- 347 pages.
- 726 API route files.
- 543 public tables.
- Overlapping families such as `events`, `events_old`, `events_v2`, `notifications_v2`, and `venues_v2`.
- A large archive of documents that may use “complete” language for systems no longer aligned with the live schema.

Low row counts do not prove an object is safe to remove. This program classifies and contains legacy surfaces; it does not destructively retire them.

## Required registries

### Schema object registry

Include every production:

- Table.
- View/materialized view.
- Function.
- Trigger.
- Policy.
- Type.
- Sequence.
- Storage bucket.

Required fields:

| Field | Requirement |
|---|---|
| Object identity | Schema, name, signature/type |
| Domain owner | Accountable team/person |
| Lifecycle | One approved status |
| Source migration | Version or baseline origin |
| Runtime references | Routes, jobs, policies, triggers |
| Grants/RLS owner | Named security/data owner |
| Row-count band | Operational signal, not retirement proof |
| Data sensitivity | Public, internal, PII, finance, rights, security |
| Retention | Requirement and owner |
| Compatibility plan | For legacy/overlap |
| Tests | Contract/RLS/behavior |

### Page and API route registry

Include:

- Route/path.
- Domain owner.
- Lifecycle.
- Authentication mode.
- Authorization helper/source.
- Feature/capability flag.
- Database, RPC, and storage dependencies.
- Runtime traffic/error rate.
- Test coverage.
- Client consumers.
- Deprecation/compatibility plan.

## Lifecycle statuses

- `ACTIVE`: released and supported.
- `COMPATIBILITY`: required while callers migrate.
- `FUTURE_GATED`: code may exist but cannot execute in production.
- `INTERNAL_ONLY`: restricted operational/admin surface.
- `DEPRECATED_READ_ONLY`: no new writes; compatibility window active.
- `RETIREMENT_CANDIDATE`: evidence gathering only.
- `UNKNOWN_BLOCKING`: owner/behavior unknown; blocks release for referenced paths.

## Overlapping domain decisions

Prioritize architectural decisions for:

- Event families.
- Venue families.
- Notification families.
- Marketplace integration/fulfillment.
- Music trust/certification.
- Hiring/onboarding generations.
- Tour versus organization versus venue operations.
- Demo and test tables present in public schema.

For each family, declare:

1. Canonical write model.
2. Canonical read model.
3. Compatibility source.
4. Ownership and authorization model.
5. Data synchronization direction.
6. Sunset evidence required.

## Documentation governance

1. Create one current documentation index.
2. Mark the July 27 audit/remediation package as authoritative for this recovery program.
3. Move historical “implementation complete” documents into an archive index without deleting them.
4. Add status banners to old documents where they could mislead implementation.
5. Require every new migration or route to update the appropriate registry.

## New-work requirements

A pull request adding a new table, function, policy, route, or bucket must provide:

- Domain owner.
- Lifecycle status.
- Data contract.
- Authorization matrix.
- Migration and rollback plan.
- Contract/RLS tests.
- Observability.
- Retention and sensitivity.
- Documentation update.

CI should reject new unowned objects or routes.

## Separate retirement standard

Destructive retirement is outside this program. A later retirement request must prove:

- Zero source references.
- Zero runtime traffic for an approved window.
- No policy/trigger/function dependencies.
- Data-retention and legal approval.
- Export/backup if required.
- Compatibility consumers migrated.
- Rollback/recovery plan.
- Dedicated change window and approval.

No object should be dropped merely because an advisor calls an index unused or because a table is currently small.

## Venue/organization boundary

Governance must preserve Tourify’s business model:

- A venue is the physical host with independent staff and operations.
- An organization can plan/promote/operate tours and events.
- An artist can be booked by either.
- Booking or partnership does not automatically grant venue-admin or organization-admin rights.
- Shared data should use explicit collaboration/booking/tour relationships.

This boundary should be visible in route ownership, schema ownership, and persona tests.

## Completion gate

- Production objects and routes have owners and lifecycle statuses.
- `UNKNOWN_BLOCKING` remains at zero for active references.
- Overlapping families have canonical-state decisions.
- New work cannot add unowned surfaces.
- Legacy surfaces are observable and contained.
- No destructive retirement occurred under this remediation program.

## Related tracker prefixes

`GOV-*`, `DB-006`–`DB-010`, `CON-*`
