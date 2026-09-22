# PLAN-102 — Optimistic plan version

## Acceptance criteria

Every mutation returns new version; stale edits return `409 version_conflict` with safe diff; autosave never silently overwrites.

## Behavior

| Case | Result |
|---|---|
| Matching `expectedPlanVersion` | Write succeeds; response includes `plan` + `planVersion` (bumped) |
| Stale / race | `409` + `code=version_conflict` + `diff` + `plan` (server snapshot) |
| Autosave conflict | Builder adopts server plan, sets error status, does **not** retry overwrite |

## Safe diff

`lib/admin/tour-plan-diff.ts` compares name/dates/status/artist/notes and stop identity/fields only — no cross-org or protected payloads.

## Verify

`__tests__/admin/tour-plan-diff.test.ts`
