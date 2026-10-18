# Node 24 runtime alignment — review and release gate

**Status:** Draft isolated CI/deployment compatibility PR. No production deployment.

## Scope of changes

- Root `package.json` engine changes from `20.x` to `24.x`, per current Vercel rejection.
- Root `.nvmrc` specifies `24`.
- GitHub Actions that explicitly select Node 20 are aligned to Node 24, including web CI, E2E, demo/production deploy workflows and mobile checks.

The `package-lock.json` dependency graph is unchanged because this patch does not change dependency names or versions.

## What this solves

A recent Vercel preview failed with `BUILD_UTILS_NODE_VERSION_DISCONTINUED` due to the root project's `engines.node = 20.x`.

This change lets Vercel and GitHub Actions select a supported Node 24 runtime once it is merged.

## What it does NOT solve

Existing `npm ci` fails to resolve a peer dependency conflict:
- `@base-ui/react@1.5.0`: optional peer `date-fns@^4.0.0`.
- Root `date-fns@^3.6.0`.
- `react-day-picker@8.10.1`: peer `date-fns@^2.28.0 || ^3.0.0`.

Do not silently use `npm --force` or `--legacy-peer-deps` as a permanent bypass. Create a separate tested dependency reconciliation PR after auditing the actual Base UI and DayPicker usage. DayPicker v9 introduces changed components and styles; updating the dependency version alone is not guaranteed safe.

Reference: https://daypicker.dev/v9/upgrading

## Before merge

1. Confirm the intended Vercel project(s), including `tourify-beta-k2`, use Node 24 on preview.
2. Resolve `npm ci` conflicts with a validated lockfile in a separately reviewed dependency PR, or stage compatibility testing first.
3. Run root lint, typecheck, unit tests and build in Node 24.
4. Run mobile lint, typecheck, unit tests, Android and iOS release preflight smoke tests in Node 24.
5. Validate that Expo, native release scripts, Prisma generation and deployment tooling support Node 24.
6. Check preview URL/authentication, private routes, and `/news` with the public feature switch disabled.
7. Release via approved deployment workflow only after all required checks pass; rollback using the last known-good deployment if needed.

The Node runtime alignment is not an authorization to deploy or merge News PRs #18, #19 or #21.
