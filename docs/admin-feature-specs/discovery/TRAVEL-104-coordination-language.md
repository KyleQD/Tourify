# TRAVEL-104 — Correct coordination language/state

**Date:** 2026-07-20  
**Spec:** `07_Travel_Transport_and_Lodging.md`

## Acceptance criteria

UI distinguishes suggestion/review/request/hold/confirmed; existing “auto-coordinate” action truthfully reports only records/tasks actually created.

## What shipped

### Lifecycle contract

`lib/admin/travel-coordination-lifecycle.ts` — maps stored `coordination_status` (legacy + new) to suggestion/review/request/hold/confirmed; formats honest auto-coordinate messages; segment presence labels do not say “booked” unless confirmed.

### Schema

Migration `20260720177000_travel_coordination_lifecycle_travel104.sql` expands CHECK to include lifecycle values while keeping legacy enums.

### API

`auto_coordinate_group` sets `coordination_status: review` and returns `drafts_created` / `drafts` / truthful `message` — never claims flights/hotels arranged.

### UI / hook

- Hub badges show lifecycle vocabulary
- Button renamed **Open review** with honest tooltip
- Progress counts use “on file / confirmed” language
- Duplicate false success toast removed; hook toasts API summary

## Follow-ups

- Phase 3 TRAVEL-302+ segment commands for request/hold/confirm with evidence
