# Design System baseline

Reconciled: 2026-09-10 for DESIGN-001 against the current working tree and the
completed DESIGN-002/DESIGN-003 records.

## Scope and method

The default design-system working set is declared in
`docs/engineering/agents/design-system/WORKING_SET.json`:
`app/globals.css`, `components/ui/**`, `components/layout/**`,
`components/surface/**`, `tailwind.config.ts`, and `components.json`.

The audit started with `npm run agents:context -- --task DESIGN-001`, then refreshed
the generated maps with `npm run agents:generate`. The source review expanded only where
the working-set evidence required a caller or dependency check: `hooks/`,
`components/venue/`, `app/admin/dashboard/components/hooks/`, `lib/design-system/`,
`__tests__/design-system/`, the named `.agents/` ledgers, and related work packets.
No production code or migration was changed.

## Current inventory

### Shared primitives

`components/ui/` contains **74 files**. The library is a shadcn/Radix-style set covering
forms (`button.tsx`, `input.tsx`, `select.tsx`, `form.tsx`), overlays and feedback
(`dialog.tsx`, `sheet.tsx`, `popover.tsx`, `alert-dialog.tsx`, `toast.tsx`), data/layout
(`card.tsx`, `table.tsx`, `tabs.tsx`, `sidebar.tsx`, `pagination.tsx`), media and
pickers (`calendar.tsx`, `date-picker.tsx`, `media-upload.tsx`, `chart.tsx`), and
state/status (`loading.tsx`, `loading-screen.tsx`, `loading-spinner.tsx`,
`skeleton.tsx`, `error-boundary.tsx`, `feature-unavailable.tsx`). The generated inventory
is `docs/engineering/generated/components.md`.

The shared state slice changed since the first audit:

- `components/ui/empty-state.tsx` provides labelled semantic empty content and an action
  slot.
- `components/ui/error-state.tsx` provides labelled `role="alert"` content with live
  error semantics and an action slot.
- `components/ui/skeleton.tsx` is decorative by default (`aria-hidden="true"`).
- `components/ui/feature-unavailable.tsx` consumes `EmptyState`.
- `components/ui/error-boundary.tsx` consumes `ErrorState` for its reusable error message.
- `components/ui/loading-screen.tsx` consumes `Skeleton` through `LoadingSkeleton`.

DESIGN-003 verifies these contracts in
`__tests__/design-system/shared-state-primitives.test.tsx` (3 tests). Domain-owned
duplicates remain in admin, hiring, venue, news, and messages surfaces; this is adoption
debt, not absence of the shared primitives.

### Layout and surfaces

`components/layout/` contains 9 files: `app-layout.tsx`, `app-chrome.tsx`,
`enhanced-app-layout.tsx`, `top-bar.tsx`, `navigation-sidebar.tsx`,
`mobile-navigation.tsx`, `quick-actions.tsx`, `connection-status-indicator.tsx`, and
`demo-banner-wrapper.tsx`. These provide a reusable shell, but route-specific shells and
navigation families also exist under `app/` and `components/`.

`components/surface/surface-primitives.tsx` contains `SurfaceHero`, `SurfaceCard`,
`SurfaceTabsList`, and `SurfaceInput`. Their `.surface-*` styling is in
`app/globals.css:275-294` and is a dark/glass layer over the base shadcn tokens.

### Tokens and theming

There is no authoritative token source. The current competing sources are:

1. `app/globals.css` (1497 lines): root variables, dashboard/staff scoped variables,
   surface classes, hard-coded gradients, animations, and global input overrides at
   `app/globals.css:335-349`.
2. `tailwind.config.ts:22-211`: shadcn aliases, neon colors, radius, shadows, and
   utility extensions.
3. `lib/design-system/theme.ts`: a large JavaScript theme object and helper functions
   used by the shared layout and demo, but not wired as the CSS/Tailwind authority.
4. Theme providers at `components/theme-provider.tsx`,
   `app/venue/components/theme-provider.tsx`, `components/venue/theme-provider.tsx`,
   `app/admin/dashboard/components/theme-provider.tsx`, and the separate
   `components/dashboard/dashboard-theme-provider.tsx`.

`app/globals.css` still contains repeated `.glass`, `.hover-lift`, `@keyframes blob`,
`@keyframes float`, and `.gradient-text` definitions plus many hex literals. Neon RGB
variables are scoped under `.staff-scheduling-prototype` at lines 236-247 while Tailwind
maps them globally. These are the primary visual-consistency risks.

### Responsive and interaction consistency

DESIGN-002 established `hooks/use-mobile.ts` as the canonical object-returning hook and
removed the former shared duplicates `hooks/use-mobile.tsx` and
`components/ui/use-mobile.tsx`. Current source still contains three domain copies:
`hooks/venue/use-mobile.tsx`, `app/admin/dashboard/components/hooks/use-mobile.tsx`,
and `components/venue/ui/use-mobile.tsx`; together with the canonical hook there are
four definition sites. Shared callers such as `components/ui/sidebar.tsx` use the
canonical hook, while the venue and admin copies still carry the boolean-only contract.

The shared layout contains reusable navigation, but additional navigation and notification
families remain under `app/components/`, `app/admin/dashboard/components/`,
`components/mobile/`, `components/venue/navigation/`, and venue notification folders.
The Phase 4 twin inventory in `docs/DEVELOPMENT_BACKLOG.md:195-196` remains applicable.

`components/venue/ui/` is a 50-file dead twin tree. A source-only import check found no
live application import; references found were documentation, the generated map, and
the active venue/design-system work packet. `app/venue/components/ui/` no longer exists.
Deletion and any compatibility decision are tracked by active DESIGN-004 and venue
coordination records, not this audit.

### Accessibility and internationalization

The Radix wrappers provide a useful baseline, but explicit interaction semantics are
uneven: 19 of the 74 shared UI files contain an `aria-*`, `role=`, or `onKeyDown` marker
(`components/ui/**`). The custom components requiring a broader review include
`color-picker.tsx`, `date-time-picker.tsx`, `media-preview.tsx`, `chart.tsx`, and
`drag-drop-indicator.tsx`.

The new focused primitive tests cover labels, live alert semantics, action behavior, and
decorative skeletons. There is still no axe/Playwright accessibility gate, no focus audit,
and only a mobile-scoped `prefers-reduced-motion` block in `app/globals.css:1437-1448`.

No web i18n framework, locale catalog, or translation hook was found under `app/`,
`components/`, `lib/`, or `apps/`. This remains the unstarted WS-2.6 i18n work.

## Surrounding system surface and ownership boundary

The design-system area does not own route handlers, database objects, or domain services.
The refreshed generated maps provide the current dependency context:

- `docs/engineering/generated/routes.md`: 369 web page routes and 24 mobile routes.
- `docs/engineering/generated/api-routes.md`: 939 API route handlers.
- `docs/engineering/generated/components.md`: 1,939 TSX/JSX files, including the shared
  primitives and the domain duplicates listed above.
- `docs/engineering/generated/database-schema.md`: 422 migrations, 693 detected objects,
  and 1,287 detected policies; `database-objects.md` contains the per-object evidence.
- `docs/engineering/generated/integrations.md`: 9 provider/integration families.
- `lib/services/`: 90 service files; no design-system-owned service was found. The
  design-system-specific runtime module is `lib/design-system/theme.ts`.

These maps are navigation aids, not proof of behavior. Authorization, API, and database
claims remain with their owning agents and must be verified in source, migrations, tests,
or runtime evidence.

## Tests and verification evidence

The repository contains 436 named test files under `__tests__/`, but the design-system
working-set directories themselves contain no colocated test files. The dedicated suite
outside that working set is `__tests__/design-system/shared-state-primitives.test.tsx`
with 3 focused tests. DESIGN-002 records scoped TypeScript, ESLint, and diff checks for
the hook consolidation; DESIGN-003 records focused Vitest, ESLint, scoped TypeScript,
and diff checks for the shared state slice. Full repository typecheck remains resource-
constrained in the dirty worktree, as recorded in DESIGN-003.

## Intended direction

The product direction is explicit in:

1. WS-2.6, `docs/DEVELOPMENT_BACKLOG.md:162-165`: choose web i18n, extract top-20
   surfaces, reach mobile locale parity, perform a core-flow a11y pass, adopt shared
   state primitives, and require an axe gate.
2. Phase 4, `docs/DEVELOPMENT_BACKLOG.md:193-196`: remove verified dead code and unify
   venue trees, navigation, notification centers, `use-mobile`, and loading/error twins.
3. `docs/engineering/DECISIONS.md:274-296`: accepted use-mobile, shared primitive, and
   venue-tree decisions.
4. `docs/engineering/agents/design-system/BACKLOG.md`: current candidate sequence after
   DESIGN-002/DESIGN-003, with DESIGN-004 active for the venue twin boundary.
5. `docs/work-packets/VENUE-002.md` and the venue agent records: preserve compatibility
   while consolidating the domain tree; venue-owned adoption must be coordinated.

## Net shape

Tourify has a substantial Radix/shadcn primitive library and now has canonical shared
empty, error, and skeleton contracts with focused coverage. It is still a partial,
ungoverned design system: token authority is fragmented, domain state adoption and twin
cleanup are incomplete, responsive hooks still have domain copies, and broad accessibility,
i18n, registry, and test gates are missing. No unresolved owner question blocks this audit;
the remaining decisions become bounded follow-up tasks.
