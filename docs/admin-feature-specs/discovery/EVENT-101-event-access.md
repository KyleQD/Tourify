# EVENT-101 — Converge event access and APIs

**Date:** 2026-07-20  
**Spec:** `05_Event_Advancing_Day_Sheets_and_Live_Ops.md`

## Acceptance criteria

Builder, command center, advance, check-in, files, and live operations use the same org/event capability service and child-record checks.

## What shipped

| Piece | Location |
|---|---|
| Canonical service | `lib/admin/event-access.service.ts` |
| Relations | `org_member` \| `tour_collaborator` (via `tour_events`) \| `legacy_owner` |
| Child gate | `requireEventChildAccess` → `assertChildParentOrgChain` |
| `getEvent` | Delegates to `requireEventAccess` (EVENT-101) |
| Thin exports | `assertEventAuthority` in `admin-tour-event-access.ts` |

## Wired routes (high traffic)

| Route | Capability | Notes |
|---|---|---|
| `GET/POST/PATCH .../advancing` | `event.view` / `advance.manage` | Acting `orgId`; child check on PATCH by id |
| `GET/POST .../day-sheet` | `event.view` / `event.manage` | Org stamped from access record |
| `GET/POST/PATCH/DELETE .../documents` | `event.view` / `event.manage` | Child chain on mutate/delete |
| `[id]` CRUD / publish / provision | already capability-gated | Now share access via `getEvent` |

## Follow-ups

- Remaining live-ops routes (group-chats, communications, secure-uploads) still use weaker gates — migrate in EVENT-102+ / LIVE tasks.
- Ticketing check-in stays on scanner permissions until LIVE-409; can optionally call `requireEventCapability(..., "event.live_ops")` beside existing auth.
