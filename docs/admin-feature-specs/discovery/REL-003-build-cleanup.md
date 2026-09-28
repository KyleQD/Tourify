# REL-003 — Production build cleanup failure

**Status:** Blocked on current source type errors  
**Revalidated:** 2026-07-21

## Strict finding

The previous artifact claimed `npm run build` exited 0, but that result no longer describes the current integrated worktree. On the supported Node 20 toolchain, the repository-wide TypeScript phase fails before a production build can complete. No `.next/export` `ENOTEMPTY` cleanup error appeared during the current checks.

The current failures include invalid Next route exports/return types, Admin publication payload typing, finance/ticketing discriminated-command narrowing, dashboard response types, and tour/logistics unknown-value projections. The DayPicker/peer-set changes from REL-002 introduce no type error.

## Environment-specific cleanup conclusion

- The historical `ENOTEMPTY` failure occurred on a prior audit filesystem and has not reproduced on the current native supported filesystem or clean CI checkout.
- The repository must not hide cleanup races by disabling TypeScript/build errors or deleting arbitrary directories.
- `.next` is disposable build output, but local cleanup is not evidence of a clean checkout. CI checkout plus `npm ci` plus `npm run build:vercel` is the regression gate.
- If `ENOTEMPTY` recurs, retain the complete build log, runner OS/filesystem, Node/npm/Next versions, concurrent process list, and the exact `.next/export` path. Confirm no second build/dev process owns the directory before retrying once on a fresh CI workspace.

## Acceptance gate

REL-003 becomes complete only when the current source errors are resolved and `npm run build:vercel` exits 0 from a clean checkout on Node 20 in CI/native supported storage. The existing main CI build step is the permanent regression guard. A local or hosted build that skips type errors does not satisfy the task.

## Current evidence

- Node v20.19.0 / npm 11.5.2 toolchain check: pass.
- Clean disposable `npm ci` without legacy peers: pass.
- Focused peer graph and touched calendar ESLint: pass.
- Repository `npm run typecheck`: fail on existing non-calendar Admin/API/service errors.
- Production build exit 0: not yet proven for this worktree.
