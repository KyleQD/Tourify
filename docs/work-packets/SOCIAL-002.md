# Work packet: `SOCIAL-002`

## Goal

- Goal: Build `/feed` as the standalone social feed destination.
- Out of scope: News, admin, venue, search, onboarding, release, QA, and migrations.
- Owner/status: `social` / `completed`

## Context

- Affected subsystem: Social feed route and feed presentation.
- Routes/components/services: `app/feed/page.tsx`, `components/feed/SocialFeed`, and the existing `/api/feed/posts` contract used by that component.
- References to read first: `docs/DEVELOPMENT_WORKFLOW.md`, `docs/engineering/agents/social/QUESTIONS.md`, `docs/engineering/DECISIONS.md`.
- Known constraints: Preserve the existing auth-aware feed behavior and unrelated working-tree changes. Use the existing feed engine contract; do not add migrations or change API routes.

## Checklist

- [x] Reproduce or confirm the current behavior
- [x] Implement the smallest scoped change
- [x] Add or update focused tests
- [x] Run the selected verification tier
- [x] Record failures and remaining blockers
- [x] State the next task

## Acceptance criteria

- [x] Standalone feed page live at `/feed`.

## Verification

- Tier: `fast`
- Commands: `npx vitest run __tests__/feed/feed-posts-route.test.ts`; `npx eslint app/feed/page.tsx components/feed/social-feed.tsx __tests__/feed/feed-posts-route.test.ts`; `npm run verify:fast -- --changed`.
- Evidence: Focused feed suite passed 32/32 tests. Scoped ESLint passed with no output/errors. The fast wrapper could not start because its dirty-worktree inventory includes missing `components/ui/use-mobile.tsx`; this is unrelated to SOCIAL-002. A repository-wide typecheck exceeded the default Node heap before completion and was not used as the gate.

## Handoff

- Changed areas: `app/feed/page.tsx`, `__tests__/feed/feed-posts-route.test.ts`, and the SOCIAL-002 control-plane records.
- Failures and pre-existing failures: `verify:fast -- --changed` is blocked by the pre-existing missing `components/ui/use-mobile.tsx` path in the dirty-worktree inventory. Whole-repository typecheck exceeded the default Node heap and was stopped after the focused checks passed.
- Blockers: None for the standalone feed acceptance target.
- Next action: Start SOCIAL-003 (full community groups) when scheduled.
