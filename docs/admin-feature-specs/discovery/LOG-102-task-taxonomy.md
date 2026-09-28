# LOG-102 — Define task taxonomy and authority

**Date:** 2026-07-20  
**Spec:** `08_Equipment_Catering_Logistics_and_Site_Maps.md`

## Acceptance criteria

Domain/category values are non-overlapping; generic task versus structured entity responsibility is documented and enforced.

## What shipped

### Contract

`lib/admin/logistics-task-taxonomy.ts`

- **Domains** (non-overlapping): transportation, equipment, lodging, catering, communication, backline, rental
- **Categories** per domain (non-overlapping work labels)
- **Authority matrix**: structured tables own inventory/capacity/booking/meal/map state; `logistics_tasks` are `work_tracking_only`
- `assertLogisticsTaskTaxonomy` validates type/category/source link and rejects `is_authoritative`

### Enforcement

`POST /api/admin/logistics/items` requires taxonomy validation; stores `source_type`/`source_id` and `category:` tag when provided.

Metrics iterate `LOGISTICS_TASK_DOMAINS` only (travel coordination remains a separate structured outcome, not a duplicate task bucket).

## Follow-ups

- `LOG-103` canonical command service (transitions, idempotency, audit)
