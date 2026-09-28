# Project state

## Bootstrap snapshot

- Baseline Git SHA: `a7193116c5a677b1c2939aa4a66e9415dac6eed1`
- Branch: `codex/admin-master-remediation`
- Snapshot date: 2026-09-08
- Working tree at bootstrap: dirty (225 modified, 161 untracked)
- Confidence: repository topology verified locally; product completeness is not implied

The pre-existing working set belongs to ongoing Tourify work. Preserve unrelated changes and use task manifests to avoid overlap.

## Current known shape

- Next.js App Router web application plus Expo mobile client.
- Supabase Auth, Postgres, Storage, and Realtime with migrations as source of truth.
- Existing workflow, backlog, audit evidence, work packets, and specialist records are active inputs.
- Verification tiers already exist through `scripts/verify.mjs`.

## Immediate bootstrap queue

1. Generate maps and validate the control plane.
2. Create task records only for current priority work; do not bulk-import stale plans.
3. Assign one owner and explicit working set per task.
4. Resolve dirty-worktree ownership before broad refactors or release work.

## Production-readiness audit — 2026-09-16

- Audited SHA: `7cf660ad8422dbd3adbdb77369d94638cdc2231b` on `codex/admin-master-remediation`; the workspace contained 758 modified or untracked entries.
- Launch status: **NO-GO** until the P0 graph in `docs/engineering/tasks/TASK_INDEX.json` is complete and RELEASE-005 records an approved go decision.
- Target topology: `tourify.live` and `www.tourify.live` are production; `demo.tourify.live` is isolated staging. Vercel, Supabase, credentials, migrations, and deployment evidence must be environment-specific.
- Initial scope: core web authentication, profiles, discovery, events, ticketing, marketplace, messaging, notifications, and role dashboards. Mobile and advanced music/governance are deferred and must remain disabled.
- ORCH-002 owns preservation and curation of the current workspace into a clean production-readiness branch; no dirty-tree deployment is permitted.

## Reconciled workspace operating model — 2026-09-22

Durable operating procedure per CP-056. All agent work happens ONLY in this repo on
`release/clean-snapshot` (the master workspace). The adjacent folders under
`/Users/kyledaley/Developer` are NOT operating workspaces:

- `Tourify-design034-wave28-20260920`, `Tourify-intg007-wave28-20260920`,
  `Tourify-mkt002-wave28-20260920` — wave snapshot clones; fully reconciled into master history.
- `myproject/tourify-work-impl`, `myproject/tourify-beta-K2`, `tourify-beta-K2.zip` — legacy
  scratch/build copies and the beta working clone; archival/deletion candidates.

Preserved divergent lineages (safe on origin, never blanket-merge — additive island port only):

- `origin/codex/admin-workflow-completion` (`521a206d`): venue feature family, admin-workflow/lib-admin,
  music-trust docs/features. Salvaged 2026-09-22 (was local-only). Port targets: venue (venue-pages-builder),
  admin (admin-dashboard-builder).
- `origin/feature/world-of-music` (`00d9f173`, merge-base `81448509`): world-geography fork, 309 unique files.
  Port target: discover (world data).
- `origin/main`: fully contained in `release/clean-snapshot` (153 ahead, 0 behind).

Operating rules: keep work in the master repo; reconcile by cherry-picking/vendoring a bounded island
behind its owning domain and running that domain's verification; preserve unrelated in-progress work in the
master worktree (e.g. ADMVIEW-001 admin work); CP-051 manual migration application is unchanged.
