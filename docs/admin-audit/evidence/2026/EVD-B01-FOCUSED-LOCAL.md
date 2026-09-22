# ADM-B01 focused verification

Captured from the working tree on 2026-09-05. This is local evidence only; it does not satisfy the CI, staging, or immutable-commit requirements for ADM-B01.

| Check | Result | Raw artifact | SHA-256 |
| --- | --- | --- | --- |
| `npm run check:migration-validation` | pass | `audit-artifacts/admin-execution/ADM-B01/01.log` | `967fde89a1366b1f47c0c09689baa4b098c0d29fd33c864a2945247944e6995f` |
| `node scripts/ci/check-active-migration-chain.mjs` | pass | `audit-artifacts/admin-execution/ADM-B01/02.log` | `8d65e89451c605b4af67631a6894fb041347d7838915394c3168920279d50b9e` |
| `npm run check:admin-route-registry` | pass | `audit-artifacts/admin-execution/ADM-B01/03.log` | `9198d088c6f82f0b92d620e1c1899051da2ac7df569fb3c7a52a51ab35a03246` |
| `npm run check:service-role-allowlist` | pass | `audit-artifacts/admin-execution/ADM-B01/04.log` | `3563d5471ce452ffb204442d0ddd41392d1ea4c3587825b9ef7337cae911a10c` |
| `npx vitest run __tests__/admin --reporter=dot` | pass | `audit-artifacts/admin-execution/ADM-B01/05.log` | `4413dea53cbc7b8acb4a88bce8b7eb6a7643c1ef10a4077912dadcdd1227e8f4` |

The migration-chain check covers 194 active migration files and found no duplicate top-level policy creations. The Admin suite completed with 236 passing files and 3,269 passing tests; one live-RLS file (two tests) remains intentionally skipped. The focused checks do not prove fresh-database application, legacy upgrade, type-check, build, or live two-organization RLS behavior.
