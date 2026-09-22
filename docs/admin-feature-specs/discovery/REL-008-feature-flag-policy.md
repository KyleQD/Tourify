# REL-008 — Organization feature-flag policy

**Status:** Complete in code; manual migration pending  
**Date:** 2026-07-21

## Rules

Every organization-scoped flag must declare:

| Field | Requirement |
|-------|-------------|
| Owner | Team/person accountable |
| Purpose | One sentence |
| Environments | local / staging / pilot / production |
| Default | off for new production orgs unless GA |
| Audit | Enable/disable events with actor + reason |
| Metrics | Adoption + error rate while flagged |
| Rollback | Instant disable + safe unavailable UI state |
| Expiry | Removal issue / date after GA |

## Naming

`admin_<domain>_<capability>_vN` e.g. `admin_ticketing_canonical_v1`, `admin_publication_outbox_v1`.

## Unavailable state

When flag off: hide write affordances or show explicit unavailable; never silent mock data.

## Implemented boundary

- The code registry requires versioned keys, owner, purpose, allowed environments, safe default, adoption/error metrics, rollback instructions, expiry, and removal issue.
- The additive schema normalizes governed definitions, organization/environment assignments, and immutable change history. It does not rewrite or remove the legacy `feature_flags` table and does not infer organization assignments from `target_org_ids`.
- Organization assignments require explicit acting context plus `org.settings.manage`; writes use the user-scoped client and RLS rather than a direct service-role client.
- Every assignment/change requires reason, idempotency key, actor, and optimistic version. Delete is forbidden; operators disable assignments and retain evidence. Definitions retire instead of being deleted.
- Missing definitions/assignments, unsupported environments, expiry, retirement, disabled state, and out-of-rollout buckets resolve to the safe default with an explicit unavailable reason.
- The Admin page clears old account data on context changes and exposes owner, rollout, expiry, removal issue, rollback, request errors, and explicit unavailable state. It never displays raw organization IDs.

The manual migration must be validated on an isolated Supabase branch before Tourify Demo. Until it is applied, the page returns `503 feature_flag_store_unavailable`; it does not fall back to legacy global flags or mock values.
