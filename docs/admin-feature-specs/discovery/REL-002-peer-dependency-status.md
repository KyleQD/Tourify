# REL-002 — Dependency peer conflict status

**Status:** Complete  
**Revalidated:** 2026-07-21

## Resolved versions

- `@base-ui/react`: `^1.5.0` (peers `date-fns@^4`)
- `date-fns`: `^4.1.0` (resolved `4.4.0`)
- `react-day-picker`: `9.11.1` (native date-fns 4 compatibility)
- `react` / `react-dom`: resolved `18.3.1`

## Changes

- Removed both peer overrides; the supported packages now resolve their declared peers directly.
- Removed Vercel's `--legacy-peer-deps` install escape hatch.
- Migrated all three shared DayPicker wrappers from v8 class/component names to v9 names and the accessible `Chevron` component contract.
- Added `npm run check:peer-deps` to main CI after `npm ci`.
- A clean `npm ci --ignore-scripts` in a new disposable directory installed 1,855 packages without legacy peers, and the focused `npm ls` graph exited 0.

## Follow-up (non-blocking)

The clean install reported the repository's existing audit backlog (38 total advisories). Dependency-vulnerability remediation is tracked separately and was not hidden with an automatic breaking `npm audit fix`.

Repository-wide TypeScript validation still reports pre-existing errors in Admin routes/services and no DayPicker/calendar error. REL-003 owns the clean production-build baseline; this task's touched calendar files pass ESLint.
