# CI, Testing, Dependency, and Build Quality

## Current state

| Gate | Audited result |
|---|---|
| TypeScript | Passed after normal Prisma client generation |
| ESLint | Passed with 698 warnings |
| Jest | 335 passed, 2 failed |
| Vitest | 698 passed, 12 failed |
| Production debug scan | Failed on two feed files |
| Production build | Compiled, checked, and generated 582 pages; cleanup did not exit cleanly |
| GitHub Actions evidence | No workflow runs were verified for the audited `main` commit |

The repository has both `package-lock.json` and `pnpm-lock.yaml`. CI and deployment currently use npm, with deployment using `--legacy-peer-deps`. That makes dependency resolution less reproducible.

## Canonical dependency workflow

Adopt npm as the current canonical root package manager because it already drives CI and deployment, unless the team approves a documented exception.

### Sequence

1. Record the package-manager decision.
2. Verify `npm ci` plus Prisma generation from a clean checkout.
3. Resolve or explicitly approve every need for `--legacy-peer-deps`.
4. Add a lockfile policy check.
5. Mark the pnpm root lockfile non-authoritative.
6. Remove the noncanonical lockfile only after equivalent install/test/build verification.

Do not delete a lockfile as the first step.

## Test contract repair

### Jest

- Retain the stricter cron behavior that rejects requests when `CRON_SECRET` is missing unless a separate signed-platform contract is approved.
- Update the stale cron test only after documenting the intended authorization contract.
- Standardize `server-only` mocking/module mapping so guarded marketplace routes can be imported safely in the test environment.

### Vitest

Create a decision sheet before editing the 12 failures:

- Feed music preview.
- Event sharing.
- Artist slugs.
- Public-profile parity.
- Public-profile empty states.
- Author feeds.
- Poll eligibility.
- Follow/friend wiring.
- Server-only onboarding import.

For each failure, record:

| Field | Required value |
|---|---|
| User-visible contract | What must happen |
| Current implementation | Observed behavior |
| Current test | What it asserts |
| Decision | Fix source, fix test, or retire capability |
| Product approver | Named person |
| Replacement test | Behavior/contract test location |

Avoid preserving fragile source-text assertions when a behavior, API, component, or integration test can express the real contract.

## Required CI jobs

Use separate names so branch protection can require each one:

1. Dependency install and lockfile policy.
2. Production debug/security artifact scan.
3. TypeScript.
4. ESLint warning budget.
5. Jest.
6. Vitest.
7. Disposable database migration replay.
8. Schema/code contract comparison.
9. Generated database type drift.
10. Function grant assertions.
11. RLS persona tests.
12. Supabase security/performance advisor budget.
13. Production build.
14. Selected Playwright critical-journey smoke tests.

Production database deployment must be a separate manual workflow with target verification and named approval.

## Branch protection

`main` should require:

- Pull request review.
- All named CI jobs.
- Up-to-date branch or merge queue.
- No direct unverified push.
- CODEOWNERS review for migrations, policies, auth, storage, workflows, and service-role code.
- Environment approval for production deployment.

## Production debug prevention

Remove the localhost feed ingest calls and expand the scanner to reject:

- Loopback/local ingest URLs.
- Hard-coded session or run IDs.
- Agent/hypothesis markers.
- Debug-only headers.
- Known debug endpoint variants.
- Temporary bypass flags in production source.

Include positive and negative scanner fixtures so the gate itself cannot silently regress.

## Lint warning program

Start with a no-new-warnings baseline, then reduce by risk:

1. React hook dependencies and correctness.
2. Accessibility and interaction semantics.
3. Image loading/optimization.
4. Escaping and content rendering.
5. Low-risk style warnings.

Track by rule, path, domain, and owner. Do not spend the security/schema recovery window on cosmetic warning cleanup while correctness warnings remain.

## Build verification

The local audit did not prove a source compilation failure. It proved the final packaging step did not exit cleanly.

### Required reproduction

1. Use a clean CI workspace.
2. Use deployment-equivalent, nonsecret configuration.
3. Run canonical install and generation steps.
4. Produce the full build artifact.
5. Retain the build log and artifact metadata.
6. If `ENOTEMPTY` repeats, identify concurrent `.next` writers or cleanup races and isolate the output directory.

Missing deployment variables in a clean audit checkout should be classified as an environment limitation, not a code failure, unless the real deployment is missing them too.

## Coverage priorities

Set explicit coverage expectations for:

- Authentication and cron guards.
- Service-role routes.
- Parent/child visibility.
- Migration/schema contract tooling.
- Privileged functions and RLS helpers.
- Marketplace idempotency and payment event handling.
- Backfill guards/checkpointing.
- Feature-gated routes.

Coverage percentage is secondary to proving security and data contracts.

## Completion gate

- Both maintained test suites are green.
- CI jobs actually run on test pull requests.
- Branch protection requires the jobs.
- Production debug scanning blocks recurrence.
- Clean database replay and contract checks are blocking.
- Build exits successfully in the deployment-equivalent environment.
- No new lint warnings can be introduced.

## Related tracker prefixes

`CI-*`, `TST-*`, `QLT-*`, `BLD-*`, `OBS-001`–`OBS-003`
