# Tourify Workspace Cleanup Plan

Last updated: 2026-08-11

## Safety Snapshot

This cleanup run was non-destructive. No files were deleted, reset, stashed, or
checked out.

- Working branch at cleanup time: `feature/event-discovery-integrations-wip`
- Backup branch created from current `HEAD`: `backup/workspace-cleanup-20260811-133657`
- Tracked diff backup: `/private/tmp/tourify-worktree-diff-backup-20260811-133657.patch`
- Untracked file backup: `/private/tmp/tourify-untracked-backup-20260811-133657.tgz`

Important note: the backup branch protects the committed base. The patch and
archive protect the uncommitted local work.

## Current State

The workspace contains a large mixed working set:

- 122 modified tracked files before this cleanup pass
- 26 untracked paths before generated files were ignored
- Several feature areas are interleaved in the same working tree
- Generated local files were present and have now been ignored

Generated local files now ignored by `.gitignore`:

- `build.log`
- `dev.log`
- `typecheck.log`
- `screenshot-logistics.png`

These files still exist locally, but they no longer pollute normal Git status.
Delete them only after confirming the backup archive is sufficient.

## Access Readiness

### GitHub

- Remote is configured at `https://github.com/KyleQD/Tourify.git`
- Remote access works through Git
- The GitHub CLI is not installed locally

Recommended cleanup:

1. Install or enable a GitHub workflow for PR creation.
2. Use small topic branches instead of continuing to pile work onto the current
   mixed branch.
3. Keep `main` as the comparison base unless a release branch is intentionally
   chosen.

### Vercel

- Vercel CLI is installed at `/opt/homebrew/bin/vercel`
- CLI account is authenticated as `kyleqdaley-4994`
- Local project link exists:
  - Project name: `tourify-beta-k2`
  - Project id: `prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n`
  - Org/team id: `team_DHkLPEuhWPBBc0CsKQT9za1c`

Recommended cleanup:

1. Keep `.vercel/project.json` local-only unless the team intentionally tracks
   Vercel project metadata.
2. Use Vercel checks after each focused PR, not after a giant mixed branch.
3. Pull environment variables only when needed, and never commit `.env*` files.

### Supabase

- Supabase CLI is installed: `2.22.6`
- Local Supabase now starts successfully after migration replay hygiene fixes.
- Verified on 2026-08-11 with `supabase start`.
- Verified local migration history with `supabase migration list --local`.
- Local URLs exposed by the successful start:
  - API: `http://127.0.0.1:54321`
  - Studio: `http://127.0.0.1:54323`
- CLI also reported local service image versions differ from the linked project.

Recommended cleanup:

1. Isolate the migration replay fixes in a dedicated migration-hygiene branch.
2. Do not reset or drop production tables.
3. Compare renamed duplicate migration timestamps against remote migration
   history before pushing or applying anything remote.
4. Align local Supabase service images with the linked project when convenient.
5. Use the now-working local stack for RLS and feature validation.

## Work Buckets To Split

The current dirty tree should be split into separate reviewable branches or
commits. Suggested order:

1. Workspace hygiene
   - `.gitignore`
   - this cleanup document
   - no product behavior changes

2. Supabase migration hygiene
   - fix old migration replay blocker
   - verify local Supabase starts
   - document service version mismatch

3. Admin owner/org scope repair
   - `lib/auth/admin-context.ts`
   - `lib/auth/admin.ts`
   - `lib/admin/resolve-authorized-org.ts`
   - `lib/admin/org-scoped-mutation.ts`
   - related admin auth tests
   - migration `20260811182035_admin_owner_org_scope_repair.sql`

4. Logistics plan workspace
   - `app/admin/dashboard/logistics/plans/`
   - `app/api/admin/logistics/plans/`
   - `components/admin/logistics/workspace/`
   - `lib/logistics/plans.ts`
   - migration `20260809005744_admin_logistics_plan_workspace_v1.sql`
   - related logistics tests

5. Communications command center
   - `docs/communications-command-center/`
   - `app/api/admin/logistics/communications-command-center/route.ts`
   - `components/admin/logistics/communications-command-center.tsx`
   - `app/admin/dashboard/logistics/logistics-page-client.tsx`
   - migration `20260811201816_communications_command_center_foundation.sql`

6. Event portfolio and export work
   - `lib/admin/event-portfolio-query.ts`
   - `app/api/admin/events/export/route.ts`
   - related tests

7. Broad UI and lint cleanup
   - marketplace pages
   - artist/public pages
   - venue pages
   - message attachment UI
   - `eslint.config.mjs`

## Recommended Operating Process

Use this loop for the rest of the project:

1. Start every session with a status inventory.
2. Confirm the current branch and safety backup.
3. Pick exactly one work bucket.
4. Keep migrations, UI, and unrelated cleanups in separate commits.
5. Run the smallest meaningful checks first.
6. Run broader checks only after the focused checks pass.
7. Update implementation progress documents as soon as each task is verified.
8. Open draft PRs early so Vercel and GitHub checks do useful background work.
9. Merge only branches that have a clear scope and passing checks.

## Immediate Next Actions

1. Commit workspace hygiene separately.
2. Remove ignored generated files from the local working tree after confirmation.
3. Split and review the Supabase migration-hygiene changes.
4. Keep local Supabase running for focused RLS and API checks.
5. Split the mixed feature work into the buckets above.
6. Resume Communications Command Center implementation from a cleaner branch.
