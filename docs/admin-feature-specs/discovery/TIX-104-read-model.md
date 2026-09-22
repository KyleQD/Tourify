# TIX-104 — Feature-flag Admin ticketing read model

**Date:** 2026-07-20  
**Spec:** `09_Ticketing_Admissions_and_Guest_Lists.md`

## Acceptance criteria

Admin can compare legacy/new totals per organization/event; mismatch dashboard blocks cutover and exposes causes.

## What shipped

### Read model

`lib/admin/ticketing-read-model.ts`

- Flag key `admin_ticketing_canonical_v1` (cutover marker)
- Enable via `FEATURE_TICKETING_V2` or `FEATURE_ADMIN_TICKETING_READ_MODEL`
- Compares legacy (`ticket_types` sold/reserved + completed `ticket_sales`) vs canonical (issued `tickets`, active reservations, config capacity)
- `canCutover` false when any mismatch; `cutoverBlockedReasons` lists causes

### HTTP + UI

- `GET /api/admin/ticketing/read-model?event_id=`
- `TicketingReadModelPanel` on admin ticketing dashboard

### Tests

`__tests__/admin/ticketing-read-model.test.ts`

## Follow-ups

- `TIX-105` remove default capacities in event builder
- Org-scoped flag persistence for `admin_ticketing_canonical_v1` (TIX-601 cutover)
