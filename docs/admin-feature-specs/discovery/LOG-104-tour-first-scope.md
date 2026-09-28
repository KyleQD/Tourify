# LOG-104 — Tour-first scope/navigation

**Date:** 2026-07-20  
**Spec:** `08_Equipment_Catering_Logistics_and_Site_Maps.md`

## Acceptance criteria

Logistics page supports organization → tour → stop/event/leg filters, preserves scope in URLs, and never defaults to a different org/tour silently.

## What shipped

### URL contract

`lib/admin/logistics-scope.ts` — parse/build `orgId`, `tourId`, `eventId`, `legId`, `tab`; clear stop/leg when tour cleared; refuse URL org ≠ acting org.

### UI

`components/admin/logistics/logistics-scope-bar.tsx` — org chip (read-only) + tour + stop/event + leg selects. Tours load from acting-org `/api/admin/tours`; stops from `/api/admin/tours/[id]/events`. No auto-select when URL empty.

### Page wire

`logistics-page-client.tsx` uses scope bar; stamps acting `orgId` into URL; on org mismatch clears foreign tour/event/leg instead of silently switching.

## Follow-ups

- `MAP-101` map org inheritance
- Optional standalone event picker when no tour (deep-link only today via `eventId`)
