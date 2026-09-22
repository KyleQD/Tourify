# SEC-204 — Delegated / external access model

**Status:** Accepted  
**Date:** 2026-07-20  
**Spec:** `01_Platform_Tenancy_RBAC_and_Audit.md`  
**Depends on:** ADR-002 ownership, SEC-203 protected classes

## Decision

### Grant model

`entity_grants` rows bind:

1. **Grantee** — `user` | `venue` | `vendor` | `contractor` | `external_email` (at least one identifier required)
2. **Named resource** — `tour` | `event` | `site_map` | `document` | `publication` + `resource_id`
3. **Named actions** — subset of `DELEGATABLE_CAPABILITIES` only (never `finance.pay`, `org.roles.manage`, `tour.delete`, etc.)
4. **Optional protected data classes** — SEC-203 classes explicitly listed (default empty = operational fields only)
5. **Required `expires_at`** — grants auto-expire; status may also be `revoked`

Venue collaboration does **not** transfer tour ownership (ADR-002).

### Enumeration ban

External / non-member principals:

- Must not call org catalog list endpoints successfully (`enumeration_denied`)
- May only resolve resources whose IDs appear in their active grants
- RLS: grantee can SELECT own grant rows; org members manage grants for their org

### Admin API

`/api/admin/entity-grants` — `org.roles.manage` — list / create / revoke within acting org.

### Effective capabilities

`resolveEffectiveAdminCapabilities` already accepts `grants[]` with expiry. Loaders should pass non-expired entity grant capabilities when resolving external sessions (future SEC-205 UI + SEC-604 review).

## Consequences

Share-token paths (maps/publications) remain separate; entity grants cover authenticated venue/vendor/contractor links. SEC-604 will surface grants in access review.
