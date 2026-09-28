# Work packet: `MUSIC-001`

## Goal

- Goal: Reconcile the Music baseline, gaps, questions, and route/boundary evidence against the current working tree.
- Out of scope: Production code, Supabase migrations, deployment configuration, and production services.
- Owner/status: `music` / completed

## Context

- Affected subsystem: Music catalog, playback, rights, royalties, certification, ingestion, trust, provider, and worker flows.
- Routes/components/services: `app/music/**`, `app/api/music/**`, `app/api/artist/music/**`, `app/api/music-marketplace/**`, `components/music/**`, `lib/music/**`, `lib/playback/**`, `scripts/music-*.ts`.
- References to read first: `docs/engineering/INDEX.md`, `docs/engineering/agents/music/CHARTER.md`, `docs/engineering/agents/music/STATE.md`, `docs/engineering/tasks/active/MUSIC-001.json`, `docs/DEVELOPMENT_WORKFLOW.md`, `docs/engineering/PROJECT_STATE.md`, `docs/engineering/SYSTEM_MAP.md`, `docs/engineering/DEPENDENCY_MAP.md`, `docs/engineering/DECISIONS.md`, `docs/DEVELOPMENT_BACKLOG.md`.
- Scope expansion: `app/api/artist/music/**`, `app/api/music-marketplace/**`, the royalty webhook, focused Music tests, `supabase/migrations/**`, `supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/**`, and `vercel.json` were inspected because existing task evidence, route adoption, schema references, and worker scheduling directly affected the audit claims.
- Known constraints: Preserve the shared dirty worktree. Do not run migration resets or edit production code/migrations.

## Checklist

- [x] Read the engineering index, Music charter/state/task record, working set, and Supabase/Postgres guidance.
- [x] Build bounded task context with `npm run agents:context -- --task MUSIC-001`.
- [x] Refresh generated maps with `npm run agents:generate`.
- [x] Reconcile closed findings from MUSIC-002, MUSIC-003, MUSIC-005, and ARTIST-004.
- [x] Record current gaps, questions, state, backlog, and schema/scheduling evidence.
- [x] Run focused Music tests and the control-plane validator.
- [x] State remaining product/database/operations decisions.

## Acceptance criteria

- [x] Baseline, gaps, and product-owner questions reflect current verified paths and evidence.
- [x] Scope expansions and reasons are recorded.
- [x] No production code or migration file was changed by this audit.
- [x] Generated topology maps were refreshed.
- [x] Validation passes with no errors.

## Verification

- Tier: `fast`
- Commands: `npm run agents:context -- --task MUSIC-001`; `npm run agents:generate`; `npx vitest run __tests__/artist/music __tests__/music-commerce lib/music/__tests__ app/api/webhooks/music-royalty-payouts/__tests__`; `npx vitest run __tests__/feed/music-post-preview.test.ts`; `npm run agents:validate`.
- Evidence: Generated maps report 939 API routes, 1,939 components, 693 database objects, 1,287 policies, and 9 integrations. Focused Music suites passed: 8 files / 48 tests. Focused music-post-preview passed: 1 file / 8 tests. Artist route inspection found 33/33 `requireArtistMusicUser` handlers; Marketplace found 13/13 `requireMarketplaceAccount` handlers; both legacy-auth scans returned zero matches. No Music worker is registered in `vercel.json`. Rights/royalty/trust DDL is archived local-only rather than in the active migration chain.

## Handoff

- Changed areas: `docs/engineering/agents/music/BASELINE.md`, `GAPS.md`, `QUESTIONS.md`, `STATE.md`, `BACKLOG.md`, `docs/engineering/generated/`, this packet, and the MUSIC-001 task record.
- Failures and pre-existing failures: No focused Music test failed. The backlog's global Vitest failure count was not used as current evidence because the focused music-post-preview test passes locally; a fresh global inventory remains external follow-up work. Project-wide TypeScript was not used as audit evidence.
- Blockers: Closing the audit is not blocked. Implementation is blocked on the product/DB decisions in Q1–Q4, especially active-chain schema reconciliation and worker launch scope.
- Next action: Continue with MUSIC-004 only after the DB owner records the schema decision and product answers Q1/Q2.
