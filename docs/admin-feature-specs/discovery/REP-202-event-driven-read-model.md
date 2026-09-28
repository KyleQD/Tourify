# REP-202 — Event-driven command-center read-model updates (implemented)

**Status:** Complete  
**Date:** 2026-07-20  
**Spec:** `docs/admin-feature-specs/13_Reporting_Exports_and_Analytics.md` — REP-202  
**Upstream:** REP-201 contract, PUB-101 outbox, TOUR-203 summary BFF

## Acceptance criteria

Domain/outbox events update idempotently; per-source watermarks, replay/rebuild, lag and reconciliation are available.

## Schema

Migration `20260720211534_tour_command_center_projection_rep202.sql`:

| Table | Role |
|-------|------|
| `tour_command_center_summary_projections` | Org/tour projection of REP-201 contract + revision |
| `tour_command_center_source_watermarks` | Per-source watermark_at / last outbox id |
| `tour_command_center_projection_applied_events` | Idempotency on `(org_id, outbox_id)` and idempotency_key |

RLS: org members SELECT; service_role ALL.

## Runtime

| Piece | Behavior |
|-------|----------|
| Outbox handlers | Tour/publication event types refresh projection via service-role apply |
| Cron | `admin-publication-outbox` imports projection service to register handlers |
| Apply | Skip already-applied / stale-vs-watermark; advance watermark; bump revision |
| Rebuild | `POST .../summary/projection` `{ action: "rebuild" }` from live BFF |
| Replay | `{ action: "replay", since?, limit? }` re-applies outbox rows idempotently |
| Health | `GET .../summary/projection` → watermarks, lag, live reconciliation |

## Pure helpers

`lib/admin/command-center-projection.ts` — source mapping, apply decision, watermark advance, lag, reconcile.

## Verify

`npx vitest run __tests__/admin/command-center-projection.test.ts`

## Follow-ups

- REP-203 protected aggregate policy on projected metrics
- TOUR-601 cache/materialize for summary BFF reads from projection when fresh
