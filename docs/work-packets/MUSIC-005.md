# Work packet: MUSIC-005

## Goal

- Goal: Adopt the verified Marketplace account/acting-context contract in the owning music-commerce API handlers.
- Out of scope: Artist Music route adoption, migrations, production deployment, Marketplace UI, and unrelated API surfaces.
- Owner/status: `music` / `completed`

## Context

- Affected subsystem: Marketplace-owned music commerce API authorization.
- Routes: all 13 handlers under `app/api/music-marketplace/`, `app/api/marketplace/orders/route.ts`, and the preserved guest-capable `app/api/marketplace/checkout/route.ts` contract.
- References to read first: `docs/engineering/agents/music/INTERFACES.md`, `docs/engineering/agents/marketplace/INTERFACES.md`, `docs/engineering/agents/music/DECISIONS.md`, `docs/engineering/agents/marketplace/DECISIONS.md`.
- Known constraints: keep server-side identity and row ownership checks; Marketplace owns financial operations; native checkout retains optional guest auth.

## Checklist

- [x] Confirm current route gates and ownership predicates
- [x] Implement the smallest scoped change
- [x] Add focused route-adoption regression tests
- [x] Run the selected verification tier
- [x] Record failures and remaining blockers
- [x] State the next task

## Acceptance criteria

- [x] Owning music-commerce API handlers use the verified auth and ownership contracts.
- [x] Focused route regression tests pass.

## Verification

- Tier: `fast`
- Commands:
  - `npx vitest run __tests__/music-commerce`
  - `npx vitest run lib/marketplace/__tests__/music-commerce-boundary.test.ts`
  - `npx eslint app/api/music-marketplace app/api/marketplace`
  - `npx jest app/api/marketplace/checkout/__tests__/route.test.ts --runInBand`
  - `npm run agents:validate`
- Evidence:
  - Adoption suite: 3 files, 20 tests passed.
  - Marketplace boundary suite: 1 file, 8 tests passed.
  - Checkout regression suite: 1 suite, 4 tests passed.
  - Scoped ESLint clean.
  - `agents:validate`: 0 errors and 1 pre-existing RELEASE-001 warning.
  - Repository-wide TypeScript check was stopped after remaining resource-blocked with no diagnostics; not used as completion evidence.

## Handoff

- Changed areas: Marketplace account auth adoption in the 13 music-marketplace handlers and native Marketplace order reads; focused route adoption test; Music task/state evidence.
- Failures and pre-existing failures: repository-wide TypeScript resource limitation; unrelated existing diff whitespace is outside the task.
- Blockers: Artist Music route adoption remains outside this task’s explicit write scope.
- Next action: adopt `requireArtistMusicUser` in the separate Artist Music catalog, rights, and royalty route batch, then refresh the auth inventory.
