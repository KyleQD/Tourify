# ADM-B01 focused verification

Captured from the working tree on 2026-09-07. This is local evidence only; it does not satisfy the CI, staging, or immutable-commit requirements for ADM-B01.

| Check | Result | Raw artifact | SHA-256 |
| --- | --- | --- | --- |
| `npm run check:migration-validation` | pass | `audit-artifacts/admin-execution/ADM-B01/01.log` | `d04e42b13072944800ab7f02c89e1c1da5cc9eda49d503c08f76866efbda6431` |
| `node scripts/ci/check-active-migration-chain.mjs` | pass | `audit-artifacts/admin-execution/ADM-B01/02.log` | `f2fd62152382ed80d487336287bfc21cc324ecd2e695c95625e54a387cec3493` |
| `npm run check:admin-route-registry` | pass | `audit-artifacts/admin-execution/ADM-B01/03.log` | `bd6b69777fb8e13542753546cfe846a88f97545f2120f5aaa1b01a0afbcbe252` |
| `npm run check:service-role-allowlist` | pass | `audit-artifacts/admin-execution/ADM-B01/04.log` | `eff35b59853b8d464a550bc8ee239fa0188af5c1a0149973b0619c235b0ad1bb` |
| `npx vitest run __tests__/admin --reporter=dot` | pass | `audit-artifacts/admin-execution/ADM-B01/05.log` | `aaf5b94693ea65021e2afb728ed8e5a647832ac48cddd201e8dd80de1a503cf0` |

The migration-chain check covers 273 active migration files and found no duplicate top-level policy creations. The Admin suite completed with 239 passing files and 3,289 passing tests; one live-RLS file (two tests) remains intentionally skipped. The focused checks do not prove fresh-database application, legacy upgrade, type-check, build, or live two-organization RLS behavior.
