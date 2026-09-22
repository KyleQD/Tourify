# SEC-103 — Canonical route/command wrapper

**Status:** Complete for new Admin commands  
**Date:** 2026-07-21

`withOrgCommand` and `executeOrgCommand` enforce this order before a handler:

1. authenticated user;
2. verified Admin acting context and correlation ID;
3. required canonical capability;
4. request parsing and Zod schema validation;
5. mandatory target contract:
   - organization target rejects a supplied `org_id`/`orgId` that differs from
     the acting organization;
   - entity target verifies every tour/event ID belongs to that organization,
     including bulk lists, and returns non-leaking `404 entity_not_found`;
6. required idempotency header when declared;
7. fail-closed authorized-intent audit;
8. handler, outcome audit, and correlation response header.

The wrapper returns structured `401`, `403`, `404`, `409`, `422`, and `503`
errors. It does not expose whether a guessed cross-organization entity exists.
Legacy `withAdminAuth` remains visibly a compatibility wrapper and is migrated
under SEC-104; it is not approved for new Admin commands.
