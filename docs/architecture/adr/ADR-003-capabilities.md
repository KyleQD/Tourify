# ADR-003 — Capability catalog and default roles

**Status:** Accepted  
**Date:** 2026-07-20  
**Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md`, `01_Platform_Tenancy_RBAC_and_Audit.md`  
**Code baseline:** [`lib/auth/admin-capabilities.ts`](../../../lib/auth/admin-capabilities.ts)

## Context

Admin authorization must move from “is Admin” to capability checks. A catalog and default role map already exist in code; this ADR locks them as the product contract.

## Decision

### Capability namespaces (canonical)

Use the `ADMIN_CAPABILITIES` list in `lib/auth/admin-capabilities.ts` as the source of truth, including:

- `org.*`, `audit.view`
- `tour.*`, `event.*`, `routing.manage`, `advance.manage`, `logistics.*`
- `workforce.*`, `hiring.manage`
- `ticketing.*`, `finance.*`
- `vendor.*`, `contract.*`
- `site_map.*`, `communications.*`, `content.*`

New capabilities require an additive code + migration change; undocumented string permissions are rejected.

### Default roles

| Role | Intent |
|------|--------|
| `owner` | Full catalog; creator/master invariant |
| `admin` | Near-full; excludes `finance.pay` and `contract.sign` by default |
| `tour_manager` | Planning, publish, logistics, workforce, advancing |
| `production` / `production_manager` | Event/live ops without tour archive/publish/hiring |
| `finance` / `finance_manager` | Finance + limited operational view |
| `ticketing` / `ticketing_manager` | Ticketing + related communications |
| `viewer` | Read-only operational views |
| `worker` | No Admin navigation; Work Mode / published projections only |
| `department_manager` | Read-only operations plus workforce manage/publish, communications send, and audit; broader production writes require explicit scoped grants |

### Custom roles

- Custom roles aggregate capabilities from the catalog only.
- Cannot override owner/master invariants or grant platform/support scope.
- Stored in `organization_roles` / `organization_role_capabilities` (SEC schema).

### Emergency support access

- Not a normal role. If enabled: short-lived grant, visible banner, reason required, append-only audit, auto-expiry. Default: **disabled**.

### Inheritance

- Effective capabilities = role defaults ∪ custom role caps ∪ non-expired `entity_grants`, minus revoked membership.
- Owner always resolves to the full catalog regardless of stale permission rows.

## Consequences

- `SEC-003` produces the nav/API → capability matrix from this catalog.
- `SEC-102` implements resolution; UI reflects capabilities but never replaces server checks.
