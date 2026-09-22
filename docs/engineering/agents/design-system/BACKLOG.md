# Design System backlog

The canonical work item is a task JSON. Launch priorities remain in
`docs/DEVELOPMENT_BACKLOG.md`.

## Active

- **DESIGN-004** — Design-system side of venue tree consolidation; remove or safely
  retire the dead `components/venue/ui/**` twin with venue coordination.

## Done

- **DESIGN-001** — Reconciled baseline, gaps, questions, state, and generated-map evidence.
- **DESIGN-002** — Established `hooks/use-mobile.ts` as the canonical shared contract and
  removed the former shared duplicates.
- **DESIGN-003** — Added shared EmptyState/ErrorState/Skeleton primitives, adopted them in
  shared callers, and added focused accessibility/interaction tests.

## Candidate follow-up work

1. **Q1 — Finish responsive-hook migration** (P1, G-C4): migrate or re-export the three
   remaining domain copies after owner confirmation.
2. **Q2 — Establish canonical token/theming authority** (P2, G-B1/G-B2/G-B3): reconcile
   CSS variables, Tailwind aliases, `lib/design-system/theme.ts`, and providers.
3. **Q3 — Shared-state adoption wave** (P2, G-C1/G-C2/G-C3): migrate representative
   admin, venue, and hiring surfaces through their owning agents.
4. **Q4 — Accessibility gate and reduced motion** (P2, G-D1/G-D2/G-D3/G-F2): add core
   flow axe/keyboard/focus evidence and global motion policy.
5. **Q5 — Web i18n foundation** (P2, G-E1/G-E2): choose framework, catalog, and top-20
   extraction sequence.
6. **Q6 — Registry and design-system verification** (P2/P3, G-A1/G-A2/G-A3/G-F1): curate
   canonical contracts and wire focused tests into `verify:fast`.
7. **Q7 — Consolidate theme/navigation/notification twins** (P3, G-C6): follow token
   authority and venue-tree cleanup.
8. **Q8 — Venue/design-system boundary interface** (P3, G-G1): document wrapper,
   exception, and shared-contract ownership rules.
9. **Q9 — `docs/implementation/` hygiene decision** (P3, G-G2): classify, archive, or
   remove copies without losing durable evidence.

## Production launch triage — 2026-09-16

- **DESIGN-033 / DESIGN-034 (P2)** — remain non-blocking unless QA-003 produces a direct core-journey accessibility, usability, or token-regression failure.
