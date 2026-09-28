# SEC-102 — Effective capability service

**Status:** Complete  
**Date:** 2026-07-21

The canonical resolver is `resolveEffectiveAdminCapabilities` in
`lib/auth/admin-capabilities.ts`.

## Precedence

1. Membership must be explicitly `active` and not expired. Missing, pending,
   invited, revoked, suspended, unknown, invalid-expiry, or expired membership
   returns no capabilities.
2. An active organization creator/master receives the owner invariant full
   catalog. The invariant never bypasses inactive membership.
3. Otherwise, system-role defaults are combined with catalog-valid legacy and
   canonical custom-role capabilities. Unknown permission strings are ignored.
4. Non-revoked, non-expired grants are added only for their exact scope. An
   organization grant never becomes an entity grant; a tour/event/map/document
   grant requires the matching target type and ID.
5. Every output is de-duplicated and contains only canonical capability IDs.

`hasEffectiveAdminCapability` is the target-aware decision helper. Route
wrappers must still verify acting organization, target ownership, record state,
and command schema; capability resolution alone is not authorization.

Focused tests cover system/custom precedence, owner and creator invariants,
unknown/expired membership, invalid capability strings, expired/revoked grants,
wrong entity scope, and unscoped compatibility grants.
