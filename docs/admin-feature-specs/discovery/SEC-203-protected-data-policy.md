# SEC-203 — Field-level protected-data policy

**Date:** 2026-07-20  
**Spec:** `01_Platform_Tenancy_RBAC_and_Audit.md`

## Acceptance criteria

Traveler PII, accessibility/dietary data, financial details, contracts, credentials, and incidents expose only the minimum required fields by role/audience.

## What shipped

### ADR

`docs/admin-feature-specs/adr/SEC-203-protected-data-policy.md` — class matrix, retention notes, `logistics.sensitive`.

### Platform registry

`lib/admin/protected-data-policy.ts` — 10 protected classes with capability gates; credential/incident/contract helpers; field classifier.

### Traveler projection

`lib/admin/traveler-field-projection.ts` — contact / identity / dietary projection for travel + lodging + catering.

### Capability

`logistics.sensitive` added; defaulted to owner / admin / tour_manager (not viewer/production).

### Wired reads

| Surface | Projection |
|---|---|
| `/api/admin/travel-coordination` members/passengers/hotel | traveler (+ nested members) |
| `/api/admin/lodging` guest_assignments / payments / confirmation lookup | traveler + financial heuristics |
| `/api/admin/logistics/catering` GET | dietary summaries via catering projector |

Existing FIN-102 / VEND-103 / WORK-102 / CAL-102 projectors remain authoritative for their domains and are referenced by the registry.

## Tests

`__tests__/admin/protected-data-policy.test.ts`

## Follow-ups

- `SEC-204` delegated/external access must grant named classes only
- Stamp advancing export dietary behind `advance.manage` (export already gated)
- Persist capability catalog migration for orgs still on legacy permission rows
