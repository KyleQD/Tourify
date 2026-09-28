# LOG-103 — Canonical logistics command service

**Date:** 2026-07-20  
**Spec:** `08_Equipment_Catering_Logistics_and_Site_Maps.md`

## Acceptance criteria

Per-action schemas, parent access, allowed transitions, idempotency, audit, and typed errors replace arbitrary record updates.

## What shipped

### Schemas

`lib/admin/logistics-command-schemas.ts` — strict actions:

- `create_task`, `update_task`, `transition_task_status`, `delete_task`, `bulk_transition_task_status`
- Status transition graph; same-status is idempotent
- Status cannot be smuggled through `update_task`

### Service

`lib/admin/logistics-command.service.ts` — `executeLogisticsCommand` with:

- Parent/org access via `assertAdminLogisticsTaskAccess` + org match
- Taxonomy checks (LOG-102)
- `logistics_activity` audit rows (`actor_id`, metadata.org_id)
- Typed `LogisticsCommandError` / transition errors

### HTTP

- Canonical: `POST /api/admin/logistics/commands` (`withOrgCommand`, `logistics.manage`, **requires Idempotency-Key**, security audit)
- Compat wires: items POST/PUT/DELETE, `[id]/status`, bulk → service (no arbitrary status patch on PUT)

### Registry

`/api/admin/logistics/commands` registered as capability_gated + idempotency + audit.

## Follow-ups

- `LOG-104` tour-first scope/navigation
- Durable idempotency store (SEC-111)
- Extend command surface to catering/equipment structured creates
