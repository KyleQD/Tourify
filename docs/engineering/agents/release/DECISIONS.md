# Release decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## REL-001 — Diagnose, do not remediate, the PR #14 release-lane check failures

- Date: 2026-09-25
- Status: accepted
- Task: RELEASE-005, RELEASE-006, RELEASE-007
- Decision: The Wave 32 release lane is a **read-only diagnosis** of the `Vercel`,
  `Lint And Build`, and `CodeQL` check failures on PR #14. It changes no product
  code, no workflow, no `vercel.json`, no dependency manifest, no lockfile, and no
  hosted or branch-protection setting. Deliverable is evidence only, in
  `docs/audits/flow-notes/release-pr14-check-triage-2026-09-25.md` plus four
  handoffs.
- Evidence: each candidate fix was evaluated against measured evidence and rejected
  because the evidence does not support it.
  1. **No `timeout-minutes` on the `Lint And Build` job.** The job ran 70m40s and
     concluded `failure` at step 11 (`Typecheck`, 68m18s); nothing timed out, and
     the log contains zero OOM keywords. A green run must additionally pass 15 more
     steps plus a full `next build`, so no timeout value can be chosen from a
     *failing* run's timings without risking a false red on a green tree.
  2. **No change to the typecheck invocation or its `--max-old-space-size=8192`.**
     The setting is correct for a 4-core/16 GB `ubuntu-latest` runner, and the step
     completed normally rather than dying on heap exhaustion.
  3. **No change to the Vercel `NODE_OPTIONS` ceilings** (`vercel.json`
     `build.env` 4096, `build:vercel` 6144, `typecheck` 8192). The deployment API
     reports `BUILD_EXCEEDED_MAXIMUM_TIME`, a wall-clock kill, not an OOM. Raising an
     unproven heap cap on a 4-core/8 GB build machine can convert a clean timeout
     into a hard OOM kill, and there is no measured green-run build duration to size
     against.
  4. **No weakening of the typecheck gate.** `continue-on-error`, `if: always()` on
     the downstream steps, and tsconfig relaxation were all rejected: the 1,384
     diagnostics are a true upstream schema/type defect owned by `database`
     (`HF-RELEASE-DB-TYPECHECK`).
  5. **No change to the Vercel project binding or alias list.** The binding is
     demonstrably wrong — PR previews are building inside the production project
     `tourify-beta-k2` / `prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n`, whose production alias
     list still contains `demo.tourify.live` — but every corrective action is a
     hosted mutation and needs owner authorization (`HF-RELEASE-007-VERCEL-HOSTED`).
  6. **No change to branch protection.** The task record says the owner provisions it
     and the lane was dispatched read-only. Gaps are reported instead
     (`HF-RELEASE-005-REQUIRED-CHECKS`).
  7. **No deletion of the stale tracked `pnpm-lock.yaml`.** It is a real
     determinism defect (RELEASE-006), but it is a root dependency file with other
     lanes' worktrees in flight and is outside release file ownership.
- Consequences: PR #14's `mergeStateStatus: BLOCKED` is correct and should stay
  blocked. The 96 Advanced Security code-scanning alerts, including one critical
  SSRF, remain unrequired and therefore cannot block a merge — that is a governance
  gap for the owner, not something this lane can close. RELEASE-006 gains its first
  hosted build evidence: the hosted build environment is correctly provisioned, so
  the previously recorded local `build:vercel` blocker is local credential
  availability rather than a build-contract defect. A new hard constraint is
  recorded: the Vercel-hosted build path has a 45-minute ceiling, which the
  controlled `--prebuilt` promotion path does not.
