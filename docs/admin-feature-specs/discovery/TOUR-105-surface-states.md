# TOUR-105 — Explicit error / degraded states

## Acceptance criteria

Portfolio and command-center tabs distinguish permission, unavailable dependency, stale snapshot, no records, and system error with retry/correlation support.

## Model

`lib/admin/tour-surface-state.ts` → `TourSurfaceKind`:

| Kind | Trigger |
|---|---|
| `permission` | 401/403 / capability codes |
| `unavailable_dependency` | 502/503 / PostgREST missing-relation codes |
| `stale_snapshot` | ok + `isStale` (or partial tab/logistics failure) |
| `empty` | ok + zero records |
| `system_error` | other failures; `canRetry` + correlation id |
| `ready` / `loading` | happy path |

Correlation IDs are read from `x-correlation-id` / `x-request-id`.

## UI

- `AdminTourSurfaceState` — kind-specific chrome + correlation + retry
- Portfolio: `tours-page-client.tsx`
- Command center: `tours/[id]/page.tsx`

## Verify

`__tests__/admin/tour-surface-state.test.ts`
