# Design System questions

Reconciled: 2026-09-10 for DESIGN-001. Questions are ordered by the decision they unblock.
Resolved items from DESIGN-002/DESIGN-003 are retained for traceability but are not
owner blockers.

## Resolved direction

### R1. Canonical responsive hook — resolved by DESIGN-002

`hooks/use-mobile.ts` is the canonical object-returning contract. The shared duplicate
files were removed. Follow-up work only needs to decide whether the venue and admin
boolean-only copies are compatibility shims or should be migrated and dropped.
Evidence: `docs/engineering/tasks/completed/DESIGN-002.json`,
`docs/engineering/DECISIONS.md:274-280`.

### R2. Shared state primitives — resolved by DESIGN-003

`components/ui/empty-state.tsx`, `error-state.tsx`, and `skeleton.tsx` are canonical.
The remaining decision is adoption sequencing for domain-owned copies, not whether the
shared contracts should exist. Evidence: `docs/engineering/tasks/completed/DESIGN-003.json`,
`__tests__/design-system/shared-state-primitives.test.tsx`.

## P1 — answer before consistency-affecting work

### Q1. Should the remaining domain `use-mobile` copies be removed or re-exported?

**Gap:** G-C4. **Recommendation:** fix by migrating callers to the canonical object
contract, then remove or re-export `hooks/venue/use-mobile.tsx`,
`app/admin/dashboard/components/hooks/use-mobile.tsx`, and
`components/venue/ui/use-mobile.tsx`. Keep a compatibility export only if an owning
surface has an explicit migration constraint.

**Owner answer needed:** Are venue and admin allowed to consume
`hooks/use-mobile.ts` directly, and should boolean callers adapt locally or should the
canonical hook expose a boolean helper?

### Q2. Which token source is authoritative?

**Gap:** G-B1/G-B2/G-B3. **Recommendation:** fix by selecting CSS variables as the
runtime authority, making Tailwind aliases a projection, and either retiring or strictly
scoping `lib/design-system/theme.ts`. Remove global dark-only form overrides and resolve
the neon variable scope.

**Owner answer needed:** Must light mode and independent surface themes remain supported,
or is one product-wide dark-purple theme acceptable? This determines whether scoped theme
blocks are supported contracts or debt.

## P2 — product completion and quality

### Q3. What is the first shared-state adoption wave?

**Gap:** G-C1/G-C2/G-C3. **Recommendation:** migrate one representative admin, venue,
and hiring surface to the shared EmptyState/ErrorState/Skeleton contracts, preserve domain
actions through slots, then expand by owner. Keep domain wrappers only when they add real
domain semantics.

**Owner answer needed:** Which three surfaces are the acceptance set, and may the owning
admin/venue agents update their wrappers in coordinated follow-up tasks?

### Q4. What is the core-flow accessibility gate?

**Gap:** G-D1/G-D2/G-D3/G-F2. **Recommendation:** build an axe/Playwright gate for auth,
feed, ticket purchase, and messaging as named by WS-2.6; review the custom primitives;
make reduced-motion behavior global and testable.

**Owner answer needed:** Are those four flows the complete launch gate, and is a zero
critical-violation result plus keyboard/focus smoke coverage a hard acceptance criterion?

### Q5. Which web i18n framework and source-of-truth should be used?

**Gap:** G-E1/G-E2. **Recommendation:** build an App Router-compatible framework,
extract the top 20 web surfaces, and decide whether web/mobile share catalogs or only
share locale names and review requirements.

**Owner answer needed:** Confirm framework choice, top-20 surface order, and whether the
mobile locale wishlist (`en`, `pt-BR`, `ja`, `de`, `fr`) is a launch requirement.

### Q6. What is the minimum design-system test/registry contract?

**Gap:** G-A1/G-A2/G-A3/G-F1. **Recommendation:** build a curated registry of canonical
primitives and a focused test harness covering public contracts, keyboard/focus behavior,
tokens, and layout invariants; wire it into the fast verification tier.

**Owner answer needed:** Should the registry be a human-maintained Markdown/JSON contract,
and which primitive families must have tests before new domain adoption is accepted?

## P3 — scale and hygiene

### Q7. Which UI twin families should be consolidated next?

**Gap:** G-C3/G-C5/G-C6. **Recommendation:** finish active DESIGN-004 for the dead venue
primitive tree, then consolidate ThemeProvider, navigation, and notification families in
that order after Q2 settles token authority.

**Owner answer needed:** Confirm that active DESIGN-004 owns deletion/re-export decisions
for `components/venue/ui/**`, and choose the next family after venue cleanup.

### Q8. What is the venue/design-system ownership boundary?

**Gap:** G-G1. **Recommendation:** publish a short interface stating when a venue surface
reuses a shared primitive, when it may wrap one, and where shared contracts belong. Link it
from the venue task before further tree or contract consolidation.

**Owner answer needed:** Should domain wrappers be allowed to add visual treatment only, or
may they fork interaction/state behavior? Who approves exceptions?

### Q9. What should happen to `docs/implementation/` copies?

**Gap:** G-G2. **Recommendation:** verify each copy is either durable documentation,
generated evidence, or dead implementation material; archive or remove only the last class.

**Owner answer needed:** Is a documentation archive acceptable, and which team owns the
final retention decision?

## Sequencing

1. DESIGN-004 and Q1 can proceed as bounded cleanup with venue/admin coordination.
2. Answer Q2 before major visual/token work.
3. Start Q3 and Q6 together so adoption is measured rather than purely mechanical.
4. Settle Q4 and Q5 for the WS-2.6 milestone.
5. Use Q8/Q9 to close cross-domain ownership and hygiene debt.

This audit is not blocked by unanswered questions. Each answer becomes a follow-up task
record owned by the design-system agent or the named domain owner.

## Owner decisions — 2026-09-10

- Q1: preserve intentional responsive-hook differences while migrating callers
  toward the canonical contract; retain compatibility only with consumer evidence.
- Q2: target a centralized token registry with CSS variables as runtime truth
  and Tailwind as a projection, delivered in stages.
- Q4: require automated checks, keyboard/focus coverage, and governed
  VoiceOver/TalkBack review now; target WCAG AA for designated core flows.
- Q8: venue wrappers may add domain presentation but must not fork shared
  interaction/state contracts.
