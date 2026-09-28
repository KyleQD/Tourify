# Work packet: `MUSIC-003`

## Goal

- Goal: Establish the CP-013/CP-026 Music↔Marketplace ownership split and publish the shared artist auth handoff.
- Out of scope: Route-handler edits under `app/api/**`, marketplace implementation under `lib/marketplace/**`, migrations, checkout/order logic, and artist dashboard changes.
- Owner/status: `music` / `active`

## Context

- Affected subsystem: `lib/music/` commerce boundary and auth adapter.
- Routes/components/services: Existing `/api/artist/music/**`, `/api/marketplace/checkout`, `/api/marketplace/orders`, and `/api/music-marketplace/**` are referenced for contract classification only.
- References to read first: `docs/engineering/INDEX.md`, `docs/engineering/agents/music/CHARTER.md`, `docs/engineering/agents/music/STATE.md`, `docs/engineering/tasks/active/MUSIC-003.json`, `docs/DEVELOPMENT_WORKFLOW.md`, `docs/engineering/agents/music/QUESTIONS.md`, `docs/engineering/DECISIONS.md`, and ARTIST-002's auth contract.
- Known constraints: Preserve unrelated dirty changes. Do not run migration resets or commit.

## Checklist

- [x] Confirm the current Music/Marketplace route and auth boundary
- [x] Implement the smallest scoped change
- [x] Add focused tests
- [x] Run the selected verification tier
- [x] Record failures and remaining blockers
- [x] State the next task

## Acceptance criteria

- [x] Music owns catalog, rights, and royalties in a typed boundary.
- [x] Marketplace owns checkout, orders, transfers, portfolios, and music-marketplace financial operations in a typed boundary.
- [x] Marketplace receives catalog and fulfillment references without Music taking ownership of money records.
- [x] Music exposes the shared ARTIST-002 artist-profile auth contract for route adoption.
- [ ] All existing route handlers adopt the boundary contracts; this requires a follow-up route batch outside this packet's allowed paths.

## Verification

- Tier: `fast`
- Commands: `npx vitest run lib/music/__tests__/music-commerce-boundary.test.ts`; `npx vitest run lib/music/__tests__`; `npx eslint lib/music/music-commerce-boundary.ts lib/music/music-commerce-auth.ts lib/music/__tests__/music-commerce-boundary.test.ts`; `npm run agents:validate`; `npx tsc --noEmit --pretty false --incremental false`
- Evidence: Boundary suite passed (9/9), including registry owner/auth integrity; all `lib/music` unit suites passed (5 files, 35 tests); changed-file ESLint clean; `agents:validate` reported 0 errors; project TypeScript check OOMed before diagnostics, with no MUSIC-003 file diagnostics emitted.

## Handoff

- Changed areas: `lib/music/music-commerce-boundary.ts`, `lib/music/music-commerce-auth.ts`, focused Music contract tests, Music interface documentation, and this packet.
- Failures and pre-existing failures: Project TypeScript OOM is pre-existing/resource-related and matches ARTIST-002 evidence; no focused test or lint failures.
- Blockers: Existing route adoption remains outside the explicit `lib/music/` write boundary; project-wide typecheck remains resource-blocked.
- Next action: Coordinate route-handler adoption with Marketplace/Artist lanes, using `requireArtistMusicUser` for `/api/artist/music/**` and marketplace account auth for financial routes.
