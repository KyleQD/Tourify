# PUB-204 — Transactional publish

**Date:** 2026-07-20  
**Spec:** `04_Publication_Sharing_and_Work_Mode.md`

## Acceptance criteria

Snapshot, audience, deliveries, lifecycle transition, audit, and outbox commit together; duplicate idempotency key returns original publication.

## Implementation

| Piece | Path |
|---|---|
| Atomic RPC | `supabase/migrations/20260720200000_admin_publication_transactional_publish_pub204.sql` → `admin_publication_transactional_publish` |
| Pure assembly | `lib/admin/publication-transactional-publish.ts` |
| Server command | `lib/admin/publication-transactional-publish.service.ts` |
| Tour publish path | `AdminTourEventOperationsService.publishTour` → tour book commit + lifecycle |
| APIs | `POST /api/admin/tours/[id]/publish` (Idempotency-Key required), `POST /api/admin/publication/publish` |

## Commit order (single transaction)

1. Idempotency lookup on `admin_publication_snapshots (org_id, idempotency_key)` → return original when present  
2. Insert `admin_domain_transactions` (audit marker)  
3. Insert snapshot (`status=committed`) + sections + audience + recipients + queued deliveries  
4. Optional lifecycle: set tour `active`, Work Mode `tour_publish` fan-out (compat)  
5. Insert `admin_publication_outbox` (`publication.committed`) and link deliveries  

## Idempotency

- Header `Idempotency-Key` required on HTTP publish routes.  
- Duplicate key returns the same `snapshot_id` / sequence / checksum with `alreadyExisted: true` and does not mutate rows.  

## Upstream

Depends on PUB-101 (outbox), PUB-102 (schema), PUB-201 (readiness), PUB-202 (renderer), PUB-203 (audience preview).
