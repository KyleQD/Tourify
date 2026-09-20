# Work packet: `DESIGN-035`

## Goal

- Goal: Make the public `/` landing and signup journey clear, compact, touch-friendly, and overflow-free at phone widths.
- Out of scope: Auth behavior, authenticated navigation, dashboard/venue/admin surfaces, and the Expo mobile app.
- Owner/status: `design-system / active`

## Context

- Affected subsystem: Public marketing and shared auth presentation.
- Routes/components/services: `/`, `TourifyLandingPage`, `LandingHeroWithAuth`, presentation-only options on `TourifyAuthPortal`.
- References to read first: `docs/engineering/INDEX.md`, `docs/engineering/agents/design-system/{CHARTER,STATE}.md`, `docs/DEVELOPMENT_WORKFLOW.md`.
- Known constraints: The worktree contains extensive unrelated work. `components/auth/tourify-auth-portal.tsx` already has unrelated redirect-preservation edits that must remain intact. Local Next.js watch mode reports a pre-existing `EMFILE` warning.

## Checklist

- [x] Reproduce or confirm the current behavior
- [ ] Implement the smallest scoped change
- [ ] Add or update focused tests
- [ ] Run the selected verification tier
- [ ] Record failures and remaining blockers
- [ ] State the next task

## Acceptance criteria

- [ ] The first phone viewport presents one value proposition and one obvious account path.
- [ ] Header and CTA controls have at least 44px touch targets and do not collide at 320–430px widths.
- [ ] The landing page has no horizontal overflow at phone, tablet, or desktop widths.
- [ ] Repeated mobile marketing sections and duplicate calls to action are removed.
- [ ] The embedded auth card is rectangular, readable, and comfortably padded on phones without changing auth behavior.
- [ ] Keyboard focus and reduced-motion behavior remain usable.

## Verification

- Tier: `fast`
- Commands: focused ESLint; focused TypeScript compile where practical; browser screenshots and overflow checks at 320x568, 390x844, 768x1024, and desktop; browser accessibility audit.
- Evidence: Pending implementation.

## Handoff

- Changed areas: Pending.
- Failures and pre-existing failures: Local dev watcher reports `EMFILE: too many open files`; runtime still serves the route under webpack dev mode.
- Blockers: None.
- Next action: Simplify landing hierarchy and harden auth presentation at phone widths.
