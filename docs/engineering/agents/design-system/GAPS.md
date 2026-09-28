# Design System gaps

Reconciled: 2026-09-10 for DESIGN-001. Every item is triaged as **missing** (should
exist but does not), **incomplete** (exists but is partial), or **improve** (exists but
needs consistency or governance). Evidence is from the current source, generated maps,
completed DESIGN-002/DESIGN-003 records, and the named legacy/work-packet records.

## A. Governance

### G-A1 — No curated source-of-truth component registry *improve*

`docs/engineering/generated/components.md` inventories 1,939 files but is generated and
does not define canonical contracts, ownership, or authoring rules. The domain
`ARCHITECTURE.md` and `INTERFACES.md` define the boundary but not the registry.
**Location:** `docs/engineering/agents/design-system/{ARCHITECTURE,INTERFACES}.md`,
`docs/engineering/generated/components.md`.

### G-A2 — Design-system decision log is now only partially populated *incomplete*

The local `DECISIONS.md` has no token, a11y, i18n, or adoption decisions. The accepted
cross-domain decisions in `docs/engineering/DECISIONS.md:274-296` establish the hook,
shared-state, and venue-tree direction but do not replace a design-system-owned log.
**Location:** `docs/engineering/agents/design-system/DECISIONS.md`.

### G-A3 — Verification is focused, not yet a domain gate *incomplete*

The shared-state suite and the DESIGN-002/DESIGN-003 scoped checks are real evidence, but
`VERIFICATION.md` still has no runnable design-system command set, axe gate, token check,
or registry coverage. **Location:** `VERIFICATION.md`,
`__tests__/design-system/shared-state-primitives.test.tsx`.

## B. Tokens and theming

### G-B1 — Token authority is fragmented *improve*

CSS variables and utilities live in `app/globals.css`, Tailwind aliases in
`tailwind.config.ts`, a separate object exists in `lib/design-system/theme.ts`, and five
theme-provider implementations remain. No source owns the complete contract.
**Location:** those files and providers.

### G-B2 — Global CSS contains duplicated and surface-breaking styling *improve*

`app/globals.css` is 1497 lines, repeats `.glass`, `.hover-lift`, `.gradient-text`, and
animation definitions, hard-codes many colors, and applies dark input/textarea/select
overrides globally at lines 335-349. This can drift from shadcn tokens and break light or
domain-specific surfaces. **Location:** `app/globals.css`.

### G-B3 — Neon tokens are scoped more narrowly than their Tailwind aliases *incomplete*

`tailwind.config.ts` maps neon colors through `--neon-*-rgb`, but the variables are defined
inside `.staff-scheduling-prototype` in `app/globals.css:236-247`. Consumers outside that
scope have no guaranteed value. **Location:** `tailwind.config.ts:56-61`,
`app/globals.css:236-269`.

## C. Shared primitives and interaction consistency

### G-C1 — Empty-state adoption is incomplete *incomplete*

The canonical `components/ui/empty-state.tsx` now exists and is consumed by
`feature-unavailable.tsx`, but admin, hiring, venue, news, and messages still own local
empty-state implementations. Evidence includes
`app/admin/dashboard/components/admin-empty-state.tsx`,
`components/admin/ui/admin-empty-state.tsx`, `components/hiring/workforce-ui.tsx`,
`components/dashboard/venue-empty-state.tsx`, `app/news/news-page.tsx:310`, and
`app/messages/messages-page-client.tsx:1364`.

### G-C2 — Error-state adoption is incomplete *incomplete*

The canonical `components/ui/error-state.tsx` is used by shared `ErrorMessage` and
`NetworkError`, but domain error cards, boundaries, and page-level error surfaces remain
separate. **Location:** `components/ui/error-state.tsx`,
`components/ui/error-boundary.tsx`, `app/admin/dashboard/components/admin-error-card.tsx`,
`app/venue/components/error-boundary.tsx`, and domain `error.tsx` files.

### G-C3 — Loading/skeleton implementations still form a family of twins *improve*

`components/ui` has `loading.tsx`, `loading-screen.tsx`, `loading-spinner.tsx`,
`brand-loading-screen.tsx`, and `skeleton.tsx`; venue and admin have additional loaders
and skeletons. DESIGN-003 standardized the base `Skeleton` contract but not the domain
adoption or the higher-level loading API. **Location:** `components/ui/**`,
`components/venue/**`, `app/venue/components/**`, `app/admin/dashboard/components/**`.

### G-C4 — Responsive hook consolidation is only partial *incomplete*

DESIGN-002 removed the former shared twins and made `hooks/use-mobile.ts` canonical, but
the boolean-only copies remain at `hooks/venue/use-mobile.tsx`,
`app/admin/dashboard/components/hooks/use-mobile.tsx`, and
`components/venue/ui/use-mobile.tsx`. There are four definition sites total and different
return contracts remain. **Location:** those four files; callers include
`components/ui/sidebar.tsx` and mobile navigation components.

### G-C5 — Dead venue primitive tree remains *improve*

`components/venue/ui/` contains 50 files and no live application imports. The old
`app/venue/components/ui/` tree is already absent. Deletion is tracked by active
DESIGN-004 and must respect venue compatibility ownership. **Location:**
`components/venue/ui/`, `docs/engineering/tasks/active/DESIGN-004.json`,
`docs/work-packets/VENUE-002.md`.

### G-C6 — Theme, navigation, and notification families remain duplicated *improve*

Five `ThemeProvider` implementations, several navigation families, and multiple venue/
social notification centers remain. **Location:**
`components/theme-provider.tsx`, `components/venue/theme-provider.tsx`,
`app/venue/components/theme-provider.tsx`, `app/admin/dashboard/components/theme-provider.tsx`,
`components/dashboard/dashboard-theme-provider.tsx`, and the navigation/notification
paths listed in `BASELINE.md`.

## D. Accessibility

### G-D1 — No automated a11y gate *missing*

There is no axe/Playwright accessibility suite, a11y lint gate, or focus-management audit
for core flows. The only focused evidence is the shared-state test file.
**Location:** `__tests__/design-system/`, verification configuration, WS-2.6 at
`docs/DEVELOPMENT_BACKLOG.md:162-165`.

### G-D2 — Custom primitive review is incomplete *incomplete*

19 of 74 shared UI files contain an explicit `aria-*`, `role=`, or `onKeyDown` marker,
while custom controls such as `color-picker.tsx`, `date-time-picker.tsx`,
`media-preview.tsx`, `chart.tsx`, and `drag-drop-indicator.tsx` still need a systematic
keyboard/focus/ARIA review. Radix defaults are useful but do not prove application-level
semantics.

### G-D3 — Reduced-motion coverage is incomplete *incomplete*

`app/globals.css:1437-1448` has a `prefers-reduced-motion` block scoped to mobile helper
classes. Custom animations elsewhere are not globally reduced or covered by a test.

## E. Internationalization

### G-E1 — Web i18n framework and catalog are missing *missing*

No web i18n framework, locale catalog, or translation hook exists under `app/`,
`components/`, `lib/`, or `apps/`. All current UI text remains authored inline.
**Location:** WS-2.6 and the application source tree.

### G-E2 — Web/mobile locale parity pipeline is missing *missing*

There is no shared extraction or codegen path connecting web strings to the mobile locale
wishlist (`en`, `pt-BR`, `ja`, `de`, `fr`). **Location:** `apps/mobile/` and the absence
of a shared localization package.

## F. Test coverage

### G-F1 — Primitive/layout test coverage is still narrow *incomplete*

The repository has 436 named tests, but only
`__tests__/design-system/shared-state-primitives.test.tsx` is design-system-specific,
with 3 tests. There are no tests for tokens, layout, custom primitive keyboard behavior,
or cross-surface contracts. **Location:** `__tests__/design-system/`,
`components/ui/`, `components/layout/`, `components/surface/`.

### G-F2 — No dedicated accessibility test suite *missing*

The focused state test checks semantic attributes but is not an axe or browser-level
accessibility suite. **Location:** `__tests__/design-system/shared-state-primitives.test.tsx`
and the missing a11y configuration.

## G. Cross-domain coordination and hygiene

### G-G1 — Venue/design-system boundary is not explicit *improve*

Venue records identify the split between `app/venue/components/` and `components/venue/`
and list design-system as a dependency for shared contracts. There is no compact interface
stating when venue owns a domain surface versus reuses a shared primitive.
**Location:** `docs/engineering/agents/venue/QUESTIONS.md:33-106`,
`docs/work-packets/VENUE-002.md`, and `docs/engineering/agents/venue/INTERFACES.md`.

### G-G2 — Documentation/component copies still need a hygiene decision *incomplete*

The dead `app/venue/components/ui/` path named by Phase 4 is resolved, but
`docs/implementation/` still contains 201 files, including 130 TS/TSX/CSS artifacts.
Those copies need a verified archival/removal decision without deleting the only source of
durable product documentation. **Location:** `docs/implementation/`,
`docs/DEVELOPMENT_BACKLOG.md:195`.

## Triage summary

| Triage | Items |
|---|---|
| Missing | G-D1, G-E1, G-E2, G-F2 |
| Incomplete | G-A2, G-A3, G-B3, G-C1, G-C2, G-C4, G-D2, G-D3, G-F1, G-G2 |
| Improve | G-A1, G-B1, G-B2, G-C3, G-C5, G-C6, G-G1 |

## Priority order

1. **P1 correctness/consistency:** finish the remaining `use-mobile` caller decision and
   remove or re-export domain copies; avoid new token or responsive surface work before
   the contract is explicit.
2. **P2 product quality:** choose token authority, migrate high-value empty/error/loading
   surfaces, establish a11y/reduced-motion coverage, and select the web i18n approach.
3. **P3 scale/hygiene:** curate the component registry and decision log, consolidate theme/
   navigation/notification families, and settle the venue/documentation twin trees.
