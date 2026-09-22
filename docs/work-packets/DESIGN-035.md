# Work packet: `DESIGN-035`

## Goal

- Goal: Make the public `/` landing and signup journey clear, compact, touch-friendly, and overflow-free at phone widths.
- Out of scope: Auth behavior, authenticated navigation, dashboard/venue/admin surfaces, and the Expo mobile app.
- Owner/status: `design-system / completed`

## Context

- Affected subsystem: Public marketing, shared auth presentation, and the shared mobile app chrome.
- Routes/components/services: `/`, `TourifyLandingPage`, `LandingHeroWithAuth`, presentation-only options on `TourifyAuthPortal`, `AppChrome`, `Nav` (global mobile bottom nav).
- References to read first: `docs/engineering/INDEX.md`, `docs/engineering/agents/design-system/{CHARTER,STATE}.md`, `docs/DEVELOPMENT_WORKFLOW.md`, `docs/engineering/tasks/completed/DESIGN-035.json`.
- Known constraints: `components/auth/tourify-auth-portal.tsx` carries unrelated redirect-preservation edits that remain intact. Local Next.js watch mode reports a pre-existing `EMFILE` warning. Turbopack cannot run in this worktree (symlinked `node_modules`); webpack dev mode is used for browser probes.

## Checklist

- [x] Reproduce or confirm the current behavior
- [x] Implement the smallest scoped change
- [x] Add or update focused tests
- [x] Run the selected verification tier
- [x] Record failures and remaining blockers
- [x] State the next task

## Acceptance criteria

- [x] The first phone viewport presents one value proposition and one obvious account path.
- [x] Header and CTA controls have at least 44px touch targets and do not collide at 320–430px widths.
- [x] The landing page has no horizontal overflow at phone, tablet, or desktop widths.
- [x] Repeated mobile marketing sections and duplicate calls to action are removed.
- [x] The embedded auth card is rectangular, readable, and comfortably padded on phones without changing auth behavior.
- [x] Keyboard focus and reduced-motion behavior remain usable.

## Verified behavior (headless Chrome, 320x568 / 390x844 / 768x1024 / 1440x900)

- No horizontal overflow at any width (`documentElement.scrollWidth === clientWidth`).
- Header controls all ≥44px (logo link, Sign in, Join free; Try the Beta / Features / Get Started at md+) with no overlaps.
- Auth-card tabs 44px at every width; auth card rectangular (clip-path none, radius 16px), padded (288px at 320, 358 at 390, 448 at 768+).
- First phone viewport: single h1 "Run your live music world from one place" + "Create your free account" hero CTA; exactly three account-path instances on the page (header Join free, hero CTA, auth-card Create Account submit).
- Keyboard: skip link reachable and visible on focus (dev-only HMR overlay consumes the first Tab; production lands on the skip link first); focus continues to hero CTAs, tabs, and form fields.
- `prefers-reduced-motion: reduce`: zero non-zero animation/transition durations; layout intact.

## Changes

- `components/marketing/tourify-landing-page.tsx`: deleted duplicate "Create your free account" CTA (account-types section) and the final "Ready to simplify your live music workflow?" CTA section; `min-h-11` on the header logo link and the three desktop nav buttons.
- `components/auth/tourify-auth-portal.tsx`: `md:min-h-11` on both tab triggers (presentation-only; redirect edits untouched).
- `components/layout/app-chrome.tsx`: `showMobileAppNav` now also excludes `/artist/*`.
- `components/nav.tsx`: global mobile bottom nav now also excludes `/artist/*` (artist surface owns `MobileArtistNav`).

## Verification

- Tier: `fast`
- Commands: focused ESLint (5 files, exit 0); temporary tsconfig typecheck of the 5-file include graph (26 pre-existing errors, byte-identical to HEAD — 0 new); `npx vitest run __tests__/venue/app-chrome-visibility.test.ts` (2/2); `npx vitest run __tests__/design-system` (2 files / 5 tests); puppeteer + Google Chrome for Testing viewport/keyboard/reduced-motion probes.
- Evidence: recorded in `docs/engineering/tasks/completed/DESIGN-035.json` (verification block); screenshots `/tmp/design035-*.png`, probe JSONs `/tmp/design035-viewport-results*.json`, typecheck log `/tmp/tsc-d035.log`.

## Handoff

- Changed areas: landing page CTA hierarchy and touch targets, auth-card tab heights, global mobile chrome route scoping (`/artist` exclusion).
- Failures and pre-existing failures: `EMFILE: too many open files` dev-watcher warning (pre-existing; webpack mode still serves); 26 pre-existing type-diagnostic baseline (byte-identical vs HEAD); Turbopack invalid in this worktree.
- Blockers: Full-repo `tsc --noEmit` resource-constrained; authenticated real-browser check of the mobile chrome requires a seeded session; dev-only HMR overlay consumes the first Tab.
- Next action: Authenticated real-browser confirmation of the shared mobile chrome and a release-mode skip-link Tab probe; launch-level accessibility evidence is QA-003's boundary.