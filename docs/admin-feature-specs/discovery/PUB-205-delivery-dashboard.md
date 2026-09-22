# PUB-205 — Delivery dashboard

**Date:** 2026-07-20  
**Spec:** `04_Publication_Sharing_and_Work_Mode.md`

## Acceptance criteria

Managers see queued/delivered/opened/acknowledged/failed by channel/recipient, retry safe failures, and export authorized delivery evidence.

## Implementation

| Piece | Path |
|---|---|
| Aggregates + retry policy + CSV evidence | `lib/admin/publication-delivery-dashboard.ts` |
| Org-scoped list / retry / export | `lib/admin/publication-delivery-dashboard.service.ts` |
| APIs | `GET /api/admin/publication/deliveries`, `POST .../retry`, `GET .../export` |
| UI | `/admin/dashboard/publications/deliveries` + `PublicationDeliveryDashboard` |
| Nav | Sidebar → Network → Publication deliveries |

## Behavior

- Summary cards: failed, retryable, unopened, unacknowledged  
- Filters: status (including `attention`), channel, search  
- Safe retry: `status=failed` and `last_error_class` not `fatal`/`suppressed`; re-queues delivery and best-effort reopens linked outbox  
- Export: JSON/CSV with masked subject keys (no raw email/phone) + audit log  

## Upstream

Depends on PUB-102 schema and PUB-204 committed deliveries.
