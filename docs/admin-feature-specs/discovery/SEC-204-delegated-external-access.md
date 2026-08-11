# SEC-204 — Delegated / external access model

**Date:** 2026-07-20  
**Spec:** `01_Platform_Tenancy_RBAC_and_Audit.md`

## Acceptance criteria

Venue/vendor/contractor links grant only named resources/actions, expire automatically, and cannot enumerate organization data.

## What shipped

### Schema

Migration `20260720184540_entity_grants_sec204.sql` — `entity_grants` + RLS + `logistics.sensitive` role defaults.

### Library

`lib/admin/entity-grants.ts` — delegatable capability allowlist, expiry/revoke evaluation, protected-class gate, enumeration denial, insert builder.

### API

`GET|POST|DELETE /api/admin/entity-grants` (`org.roles.manage`) — registered in `api-route-registry`.

### ADR

`docs/admin-feature-specs/adr/SEC-204-delegated-external-access.md`

## Tests

`__tests__/admin/entity-grants.test.ts`

## Follow-ups

- Wire grant loader into external venue/vendor session resolvers
- SEC-205 capability-aware UI for grant management
- SEC-604 access review lists entity grants
