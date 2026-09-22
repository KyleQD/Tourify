# Tourify Token Authority Inventory — Stage 1 baseline (DESIGN-030)

Owner: design-system agent. Basis: owner-approved Design Q2 direction
(`docs/engineering/OWNER_DECISIONS_2026-09-10.md`): a centralized token registry
is the target authority, CSS variables are the runtime truth, and Tailwind is a
projection of that truth, migrated in stages.

Scope: **Stage 1 only** — survey + reconcile + runtime-truth baseline. Stage 1
makes **zero source-code changes**; every stage-1 assertion is a read-only
identity audit with command evidence. Phase 2+ stages are design-only (see
[Phase roadmap](#phase-roadmap) at the end). No token was renamed, deleted, or
restructured; no ThemeProvider was deleted; zero component class strings change.

Evidence style follows the companion registers in this directory
(`CANONICAL_COMPONENT_REGISTER.csv`, `MASTER_RECONCILIATION_LEDGER.csv`):
token -> value/role -> alias -> defining file(s), with duplicate groups,
conflicts, dispositions, and decision basis recorded per row.

Survey SHA (base, dirty tree): `7cf660ad8422dbd3adbdb77369d94638cdc2231b`
Surveyed at: 2026-09-11 (DESIGN-030 stage 1).
Phase-4 update: 2026-09-13 (DESIGN-030 Phase 4 — neon + dashboard/admin var
scope decisions + C-11 correction recorded; zero source-code changes; see
conflicts register rows C-02/C-03/C-11, §5 neon scope, and the Phase roadmap).
Phase-5 update: 2026-09-13 (DESIGN-030 Phase 5 — final execution batch: four
dead CSS roots REMOVED (C-10, §1) with authored light provenance preserved in
TOKEN_REGISTRY.md §5b; `--neon-*` composite retirement EXECUTED (§5); D-02
dead duplicate removed with its root while the LIVE form override stays
behind a scoped remediation gate (§6); `--admin-*` latent-palette decision
request recorded for the admin-surface owner (option A adopt / option B
retire — pending handoff HF-DESIGN-030-ADMIN). C-03 `--radius` gate NOT
applied. Phase roadmap finalized below.)
DESIGN-033 update: 2026-09-13 (**C-03 APPLIED** — owner approved the app-wide
`0 → 8/6/4px` corner delta; `--radius: 0.5rem` established at `app/globals.css
:root`; `tailwind.config.ts` borderRadius formulas verified 1:1 (no config
change); Table C/K rows flipped live in TOKEN_REGISTRY.md; QA visual check
of critical surfaces is the final gate — handoff HF-DESIGN-033-QA. See
conflicts register row C-03, §1, §8, and the Phase roadmap.)

---

## 1. Runtime CSS truth

Only three CSS files are actually imported anywhere (verified with
`rg -n "globals\.css|\.css'" app --glob '*.{ts,tsx}'`):

| CSS file | Imported by | Description |
| --- | --- | --- |
| `app/globals.css` | `app/layout.tsx` (root) | Main runtime truth; every route inherits it |
| `app/admin/globals.css` | `app/admin/layout.tsx` | Admin-route additions (`--admin-*`) |
| `app/artist/globals.css` | `app/artist/layout.tsx` | Artist-route additions (**0 token variables**, animation/effect classes only) |

Everything else was **declared but never loaded** (zero importers, verified with
`rg -n "styles/(venue/)?globals\.css"` and the app CSS-import sweep) and is
**REMOVED by Phase 5 (DESIGN-030, 2026-09-13, C-10 executed)** — per-root
zero-use registers, authored light provenance, and zero-delta compare points in
`TOKEN_REGISTRY.md` §5a–5c:

| Dead CSS root (removed) | Token content (unused at removal) | Zero-importer evidence |
| --- | --- | --- |
| `app/venue/globals.css` | Light-first shadcn `:root` + `.dark` remap, `--radius: 0.5rem`, typing/scrollbar/scan helper classes (all duplicated live) | rg: zero importers (exact path, `venue/globals.css`, alias/relative spellings); only live globals imports are app / admin / artist layouts |
| `app/admin/dashboard/components/styles/globals.css` | shadcn + `--chart-*`, `--sidebar-*`, `--radius: 0.5rem` (create-next-app residue) | idem |
| `styles/globals.css` | Dark shadcn + `--chart-*`, `--sidebar-*`, duplicate global input override (D-02), glow/card helpers (duplicated live) | idem |
| `styles/venue/globals.css` | Light/dark shadcn + `--chart-*`, `--sidebar-*` | idem |

### 1.1 `app/globals.css` scopes and variable counts

| Scope | Selector / class | Var family | Count |
| --- | --- | --- | --- |
| `:root` (global) | `:root` | Legacy rgb triplets `--foreground-rgb`, `--background-start-rgb`, `--background-end-rgb` | 3 |
| `:root` (global) | `:root` | Semantic HSL tokens `--background … --ring` | 19 |
| media dark | `@media (prefers-color-scheme: dark) { :root }` | Overrides only the 3 rgb triplets; **no `.dark` class selector exists** | 3 |
| Dashboard shell | `.dashboard-theme-shell` | `--dashboard-*` (primary/secondary/accent/bg/glow/cta/text/foreground/muted) | 15 |
| Dashboard light | `.dashboard-theme-shell[data-dashboard-theme-light='true']` | `--dashboard-surface`, `--dashboard-surface-muted`, `--dashboard-border`, `--dashboard-border-strong` | 4 |
| Neon / staff scope | `.staff-scheduling-prototype` | Semantic HSL remap (18) + `--radius` (1) + `--neon-*-rgb` triplets (6) + `--neon-*` composites (6) + `--color-*` v4-style map (23) | 54 |
| **Total** | | | **~98 declarations** |

Evidence counts: `sed -n '18,41p' app/globals.css | rg -o '^\s*--[a-z0-9-]+' | wc -l` = 22
(root), `sed -n '52,77p'` = 19 (dashboard shell incl. light overrides),
`sed -n '215,273p'` = 54 (staff scope).

### 1.2 Admin route-local tokens (`app/admin/globals.css`)

14 `--admin-*` tokens (all on `:root`, space-separated RGB triplets, verified
`rg -o -- '--admin-[a-z0-9-]+' app/admin/globals.css | sort -u | wc -l` = 14):

`--admin-primary` (139 92 246 = **#8b5cf6** violet-500), `--admin-primary-light`
(167 139 250), `--admin-primary-dark` (107 33 168), `--admin-secondary`
(59 130 246), `--admin-secondary-light` (96 165 250), `--admin-secondary-dark`
(37 99 235), `--admin-accent` (6 182 212), `--admin-accent-light`,
`--admin-accent-dark`, `--admin-success`, `--admin-warning`, `--admin-error`,
`--admin-info`, `--admin-transition-normal`.

**Phase-4 verification (2026-09-13):** zero `var()`/`rgb(var())` consumers of
any `--admin-*` token in code (negative rg across app/components/lib/hooks);
`--admin-transition-normal` is consumed only by `app/admin/globals.css` itself
(`.admin-metric-card`, `.admin-btn-futuristic`). The 13 color tokens are a
**latent route-scoped palette** (defined + loaded at `/admin/**`, currently
unreferenced) — kept as a scoped runtime surface per the Phase-4 scope
decision; adoption vs retirement is a Phase-5 + admin-surface-owner decision
(D-01 overlap language).

---

## 2. Tailwind projection (`tailwind.config.ts`)

The single runtime Tailwind config is `tailwind.config.ts`
(`app/admin/dashboard/components/tailwind.config.js` is dead — no importer,
create-next-app residue; the repo's only other config).

### 2.1 Color alias registry (colors block, 27 alias keys)

| Tailwind alias | Projection | CSS var | Defined in runtime truth? |
| --- | --- | --- | --- |
| `border` | `hsl(var(--border))` | `--border` | yes — `:root` (also remapped in staff scope) |
| `input` | `hsl(var(--input))` | `--input` | yes — `:root` |
| `ring` | `hsl(var(--ring))` | `--ring` | yes — `:root` (also dashboard provider inline override) |
| `background` | `hsl(var(--background))` | `--background` | yes — `:root` |
| `foreground` | `hsl(var(--foreground))` | `--foreground` | yes — `:root` |
| `primary` / `primary-foreground` | `hsl(var(--primary))` / `hsl(var(--primary-foreground))` | `--primary` / `--primary-foreground` | yes — `:root` (dashboard provider inline override) |
| `secondary` / `-foreground` | `hsl(var(--secondary[-foreground]))` | idem | yes — `:root` |
| `destructive` / `-foreground` | `hsl(var(--destructive[-foreground]))` | idem | yes — `:root` (staff scope remaps only `--destructive-foreground`) |
| `muted` / `-foreground` | `hsl(var(--muted[-foreground]))` | idem | yes — `:root` |
| `accent` / `-foreground` | `hsl(var(--accent[-foreground]))` | idem | yes — `:root` |
| `popover` / `-foreground` | `hsl(var(--popover[-foreground]))` | idem | yes — `:root` |
| `card` / `-foreground` | `hsl(var(--card[-foreground]))` | idem | yes — `:root` |
| `neon-purple` | `rgb(var(--neon-purple-rgb) / <alpha-value>)` | `--neon-purple-rgb` | **only** inside `.staff-scheduling-prototype` — **absent at `:root`** |
| `neon-pink` | `rgb(var(--neon-pink-rgb) / <alpha-value>)` | `--neon-pink-rgb` | only inside staff scope |
| `neon-cyan` | `rgb(var(--neon-cyan-rgb) / <alpha-value>)` | `--neon-cyan-rgb` | only inside staff scope |
| `neon-amber` | `rgb(var(--neon-amber-rgb) / <alpha-value>)` | `--neon-amber-rgb` | only inside staff scope |
| `neon-green` | `rgb(var(--neon-green-rgb) / <alpha-value>)` | `--neon-green-rgb` | only inside staff scope |
| `neon-red` | `rgb(var(--neon-red-rgb) / <alpha-value>)` | `--neon-red-rgb` | only inside staff scope |

### 2.2 Radius alias registry

| Tailwind alias | Projection | CSS var | Defined in runtime truth? |
| --- | --- | --- | --- |
| `rounded-lg` | `var(--radius)` | `--radius` | **YES at `:root` (DESIGN-033, 2026-09-13): `0.5rem` (8px)**; staff scope keeps its own `0.625rem` (10px, wins by cascade) |
| `rounded-md` | `calc(var(--radius) - 2px)` | `--radius` | YES at `:root` → `calc(0.5rem - 2px)` = `0.375rem` (6px); staff scope `0.5rem` |
| `rounded-sm` | `calc(var(--radius) - 4px)` | `--radius` | YES at `:root` → `calc(0.5rem - 4px)` = `0.25rem` (4px); staff scope `0.375rem` |

Formerly: `--radius` was defined only inside `.staff-scheduling-prototype`
(`0.625rem`) and in the four dead roots (each `0.5rem`, never loaded), so
outside the staff scope `border-radius` computed to **0 (square corners)**.
**C-03 APPLIED (DESIGN-033):** owner approved the `0 → 8/6/4px` app-wide delta;
`--radius: 0.5rem` now holds `:root` truth and the aliases resolve to the
accepted values. QA visual check of critical surfaces is the final gate
(handoff HF-DESIGN-033-QA). The dead roots were removed in Phase 5 (§1).

### 2.3 Other projection blocks (non-color)

`boxShadow` glow aliases (`glow-purple/indigo/pink/blue/green/red`, hex literals),
`backgroundImage`, `backdropBlur`, `fontSize` (`10xl–12xl`), `spacing`
(`128`, `144`), `transitionDuration`/`delay`. These are literal-value projections
not yet bound to CSS variables — noted for Phase 2 registration, out of stage-1
change scope.

---

## 3. `lib/design-system/theme.ts` (TS palette object — not a runtime CSS source)

`tourifyTheme` is a typed JS object, imported by exactly one module
(`components/layout/app-layout.tsx`) **and never dereferenced there** (verified
`rg -n "tourifyTheme"` — only the import line). The object's palette is a
**conflicting parallel color language**, not a projection of the CSS variables:

| theme.ts group | Value (flagship) | CSS-variable counterpart | Conflict |
| --- | --- | --- | --- |
| `colors.primary` | `#0ea5e9` sky-blue-500 | `--primary` = hsl(262.1 83.3% 57.8%) = **#7c3aed** violet | **C-01** divergent "primary" |
| `colors.secondary` | `#d946ef` fuchsia-500 | `--secondary` = hsl(217.2 32.6% 17.5%) slate | **C-01** divergent "secondary" |
| `colors.success` | `#22c55e` | `--admin-success` = 34 197 94 (same) | matches admin route token |
| `colors.error/warning/neutral` | tailwind-palette scales | none | parallel language |
| `colors.dark` | slate-900..600 hex | `--background` etc. HSL | parallel language |
| `colors.roles` (9) | role hexes | none | parallel language; consumed only by dead `getRoleColor` |

Live consumers of `lib/design-system/theme.ts` (verified by rg):
- `themeUtils.getRoleClasses()` — live in `top-bar.tsx`, `app-layout.tsx`,
  `navigation-sidebar.tsx`, `mobile-navigation.tsx`, `quick-actions.tsx`,
  `components/demo/harmonized-ui-demo.tsx`. Returns **hardcoded tailwind class
  strings** (`text-red-400 bg-red-500/10 …`) — does not read `tourifyTheme`.
- `themeUtils.getStatusClasses()` — live in `harmonized-ui-demo.tsx`; hardcoded classes.

Dead exports (zero consumers):
- `tourifyTheme` object itself; `themeUtils.getRoleColor` (references
  `tourifyTheme.colors`); `themeUtils.getPriorityClasses`;
  `themeUtils.getSpacingClass` / `getShadowClass`; `componentVariants` (button /
  card / status variant class strings). `componentVariants` additionally
  references `bg-primary-600`, `bg-secondary-600`, `bg-neutral-*` classes that
  the real Tailwind config does **not** define (**C-07**).

Separate route-local duplicate: `app/admin/utils/theme-utils.ts` exports its own
`themeUtils` (admin-badge class language), consumed by
`app/admin/components/enhanced-metric-card.tsx` (**C-08**). No lib-theme import.

---

## 4. ThemeProvider implementations (6 found; 5 under `app/`+`components/`)

Search command: `rg -n "ThemeProvider" app components --glob '*.tsx'` plus
`rg -n "theme-provider" --glob '*.{ts,tsx}'` for import edges.

| # | Implementation | Mechanism | Live? | Mount |
| --- | --- | --- | --- | --- |
| 1 | `hooks/use-theme.tsx` `ThemeProvider` | custom context; adds `light`/`dark` to `<html>`; `defaultTheme="dark"` | **LIVE** | `app/layout.tsx` (root; wraps everything) |
| 2 | `components/theme-provider.tsx` | next-themes wrapper (`attribute="class"`, system) | **LIVE** | `app/venue/providers.tsx` (venue subtree) |
| 3 | `components/dashboard/dashboard-theme-provider.tsx` | custom; loads theme from profile + localStorage; renders `.dashboard-theme-shell` with inline `--dashboard-*` vars and `--primary`/`--ring` | **LIVE** | `app/dashboard/layout.tsx` |
| 4 | `components/venue/theme-provider.tsx` | next-themes wrapper | **DEAD → DELETED (Phase 3)** | — |
| 5 | `app/venue/components/theme-provider.tsx` | next-themes wrapper | **DEAD → DELETED (Phase 3)** | — |
| 6 | `app/admin/dashboard/components/theme-provider.tsx` | next-themes wrapper | **DEAD → DELETED (Phase 3)** | — |

Also dead → **DELETED (Phase 3)**: `app/providers.tsx` `Providers` wrapper
(next-themes) — 0 importers + 0 `Providers` symbol usage; it existed solely as the
(unused) consumer of `components/theme-provider.tsx`.

**Phase-3 update (2026-09-11, finalized 2026-09-13):** the three dead twins + `app/providers.tsx` were
re-validated (per-file rg importers/symbol usage, zero source references incl.
relative/alias spellings, eslint clean, register rows set `retired`) and **deleted**.
The composition contract for the three remaining live providers is recorded in
`TOKEN_REGISTRY.md` Table L (who wraps which subtree, which tokens each sets).
The live providers were **NOT merged** — each wraps a disjoint subtree / writes a
disjoint token surface, so any merge is not provably zero-delta (C-06 resolved as
documented contract, not consolidation). Final re-validation on 2026-09-13
re-proved all negative rg results and zero-delta compare points; evidence in the
DESIGN-030 task record.

Runtime result (**C-06**): the root layout applies the custom hook provider
(dark-first), the venue subtree double-mounts next-themes semantics inside it,
and the dashboard subtree applies inline palette vars + `--primary`/`--ring`
overrides on a shell div. The dashboard palette also writes `--primary` /
`--ring` to the *shell element*, changing how `bg-primary`, `text-primary`,
`ring-*` resolve inside `/dashboard/**` only.

---

## 5. Neon scope

Definition: `.staff-scheduling-prototype` in `app/globals.css` lines 215–273
(dark-first semantic remap + `--radius` + 6 `--neon-*-rgb` triplets + 6 dead
`--neon-*` composites + 23 `--color-*` v4-style mappings).

Scope anchors (elements carrying the class; re-verified 2026-09-13):
- `components/admin/staff-scheduling-tab.tsx:162` (`<div className="staff-scheduling-prototype">`)
- `components/admin/admin-calendar-view.tsx:643` (root `cn('staff-scheduling-prototype …')`)
- `components/admin/admin-calendar-view.tsx:862` (subscribe-panel `SheetContent`,
  wraps `OrgCalendarSync`) — **added Phase 4** (3 anchor files / 4 sites)
- `components/admin/calendar-day-sheet.tsx:428` (dialog panel, rendered under the calendar view)

Consumer containment (verified 2026-09-11 and re-verified 2026-09-13): all
**26** files referencing `neon-*` classes or `--color-neon-*` / `--color-primary`
/ `--color-ring` arbitrary values live under `components/admin/**` and render
inside one of the anchors (`staff-scheduling-tab.tsx` mounts `board-view`/
`staff-view`/`templates-view`/`management-view`; `admin-calendar-view.tsx` mounts
`org-calendar-sync.tsx` — including the line-862 subscribe panel — and
`calendar-day-sheet.tsx`; mount sites for `StaffSchedulingTab` are all under
`/admin/**`: `components/hiring/staff-operations-tabs.tsx:124`,
`app/admin/dashboard/events/[id]/page.tsx:1338`, `app/admin/dashboard/staff/page.tsx:49`).
No consumer resolves `neon-*` outside the scope today.

**Phase-4 scope decision (2026-09-13):** the triplet roles are KEPT as a scoped
runtime surface — the staff scheduling surface is an intentional, independent
surface theme (owner direction Design Q2 + preserve-intentional-differences);
NOT promoted to `:root` (zero cross-scope usage; a `:root` copy would be an
unreviewed no-op global surface today). **Phase 5 (2026-09-13): the 6 dead
`--neon-*` composites were REMOVED** (retirement executed; negative rg
re-proven zero `var(--neon-*)` composite references across all file types; the
`--color-neon-*` map and Tailwind aliases read the `-rgb` triplets directly —
triplets and aliases intact).

| Scope item | Status |
| --- | --- |
| `--neon-*-rgb` triplets (6) | consumed by tailwind `neon-*` aliases **only in-scope** — Phase 4: keep scoped surface (C-02 recorded, owner note) |
| `--neon-*` composites (6) | **REMOVED (Phase 5)** — 0 consumers (`var(--neon-purple)` etc. never referenced; negative rg); definitions deleted, triplets/aliases intact |
| `--color-neon-*` (6) | consumed in-scope (`shadow-[…var(--color-neon-purple)]`, etc.) |
| `--color-primary` / `--color-ring` | consumed in-scope (calendar-day-sheet, scheduling-shift-card) |
| `--color-background` … `--color-input` (17) | **dead** — 0 consumers (Tailwind v3 app; `--color-*` is the v4 convention) |

---

## 6. Global dark-only form overrides

`app/globals.css` lines 334–349: an un-scoped, un-guarded element rule

```css
input, textarea, select {
  background-color: #0f1117 !important;
  border-color: #2d3748 !important;
  color: white !important;
  transition: all 0.3s ease !important;
}
input:focus, textarea:focus, select:focus {
  border-color: #9333ea !important;
  box-shadow: 0 0 0 2px rgba(147, 51, 234, 0.2) !important;
}
```

- Applies everywhere (root stylesheet), including venue and any light surface.
- `!important` makes it un-overridable by component-level form classes.
- It is the concrete instance of the state risk "global dark input overrides …
  can break light or surface-specific UI" (`docs/engineering/agents/design-system/STATE.md`).
- A byte-similar duplicate existed in the dead `styles/globals.css` (lines 88–103).

**Phase-5 outcome (DESIGN-030, 2026-09-13):** the duplicate in
`styles/globals.css` was **removed with the dead root** (zero rendered delta —
the file never loaded; C-10). The **LIVE override (lines 360–374) is NOT
changed**: 148 files under app+components render raw
`<input|textarea|select>` elements, so removing the rule would change rendered
values everywhere (zero-delta not provable). **Scoped remediation gate
recorded** (TOKEN_REGISTRY.md §5d): a separate owner-reviewed bounded change
should replace the global `!important` rule with token-based component-level
form styles (shadcn input/select/textarea primitives driven by `--input`/
`--ring`/`--primary`/`--border`), then delete the global override.

---

## 7. Conflicts and duplicates register (stage-1 dispositions)

| ID | Conflict / duplicate | Detail | Stage-1 disposition | Phase |
| --- | --- | --- | --- | --- |
| C-01 | Divergent "primary"/"secondary" semantics | theme.ts `primary`=#0ea5e9 vs CSS `--primary`=#7c3aed vs `--admin-primary`=/role `tour_manager`=#8b5cf6 vs dashboard royal primary=#8b5cf6 | record only | 2 (central registry) |
| C-02 | `neon-*` Tailwind aliases without `:root` fallback | aliases project `--neon-*-rgb`; vars exist only under staff scope | **Phase 4 (2026-09-13): KEEP AS SCOPED RUNTIME SURFACE.** All 26 consumers re-verified in-scope (anchors now 3 files / 4 sites). No `:root` promotion (zero cross-scope usage; promise-free today); owner-facing note recorded on the registry Table G rows — promote only via an explicit owner-approved neon layer. | 4 (done — decision recorded) |
| C-03 | Radius projection without root truth | `rounded-lg/md/sm` -> `var(--radius)`; `--radius` only in staff scope (0.625rem); dead roots define 0.5rem | **Phase 2 (2026-09-11): DEFERRED to Phase 3+ with an explicit visual-review gate.** Per-alias identity proof in `TOKEN_REGISTRY.md` §2a + Phase-4 gate note: current computed value outside staff scope is `0` (undefined var -> invalid at computed-value time -> border-radius initial) for all three aliases; proposed `--radius: 0.5rem` at `:root` yields 0.5rem/0.375rem/0.25rem, so the change is NOT provably zero-regression (~3,068 `rounded-{lg,md,sm}` usages across 923 files; re-verified 2026-09-13 = 1500/966/602). **Phase 4 (2026-09-13): gate FINALIZED as a note only** — owner visual review of the `0 → 8/6/4px` app-wide delta (+ per-surface screenshot regression pass) is required before any separate bounded change; no behavioral change made. **DESIGN-033 (2026-09-13): RESOLVED — OWNER APPROVED + APPLIED.** `--radius: 0.5rem` at `app/globals.css :root`; `tailwind.config.ts` formulas verified (lg `var(--radius)` → 0.5rem, md `calc(- 2px)` → 0.375rem, sm `calc(- 4px)` → 0.25rem; no config change); Table C/K rows flipped live; QA visual check of critical surfaces is the final gate (handoff HF-DESIGN-033-QA). | 3 (visual-review gate) → **6 (applied)** |
| C-04 | `.dark` class is a no-op in the main app | `darkMode:["class"]`; `app/globals.css` has no `.dark` selector; `:root` is dark-first; only dead roots define `.dark` remaps | record only | 3 (Phase 3 executed 2026-09-11; C-04 stays OPEN — provider dead twins removed but `.dark` remains a no-op in the main app) |
| C-05 | Parallel `--color-*` v4 map | 23 `--color-*` vars in staff scope, 17 with zero consumers (v3 app) | record only | 2 (central registry) |
| C-06 | Three live theme runtimes | root hook provider + venue next-themes + dashboard inline palette with `--primary`/`--ring` override | **Phase 3 (2026-09-11): RESOLVED as a documented composition contract, NOT a merge.** Each live provider wraps a disjoint subtree (root / `/venue/**` / `/dashboard/**`) and writes a disjoint token surface; merging is not provably zero-delta. Contract + provider audit table recorded in `TOKEN_REGISTRY.md` Table L. Three dead twins + `app/providers.tsx` deleted after zero-importer re-validation. | 3 (done) |
| C-07 | Dead `componentVariants` references undefined class names | `bg-primary-600`, `bg-secondary-600` not in the Tailwind config | record only (dead code) | 2 |
| C-08 | Duplicate `themeUtils` module | `app/admin/utils/theme-utils.ts` vs `lib/design-system/theme.ts` | record only | 2 |
| C-09 | Body color uses legacy rgb vars, components use HSL vars | `body { color: rgb(var(--foreground-rgb)) }` vs semantic `--foreground` | record only | 2 |
| C-10 | Dead CSS roots can silently re-enter cascade | 4 un-imported shadcn roots with different `--radius`/chart/sidebar values | **Phase 5 (2026-09-13): EXECUTED (removed).** Zero importers re-proven for all four roots (rg, all file types, exact + alias/relative spellings; no `@import` chains; no next/postcss registration). Per-root zero-use registers + zero-delta compare points in `TOKEN_REGISTRY.md` §5a–5c; authored light sidebar (2 roots) / chart (3 roots) / semantic (3 roots, 2 families) / `--radius` 0.5rem values preserved as provenance (§5b). Every class duplicated live; every var live elsewhere or dead (`--radius`, C-03 unchanged). DESIGN-032's `:root` truth + Tailwind projections kept the sidebar primitive generating. 431 lines deleted. | 5 (done) |
| C-11 | `--dashboard-primary` consumed outside dashboard shell | `components/settings/enhanced-settings-router.tsx:478,620,632` mounted at `app/settings/page.tsx` (General settings, not `/dashboard/**`) | **Phase 4 (2026-09-13): PREMISE CORRECTED — NOT a runtime gap.** The settings surface re-mounts `.dashboard-theme-shell` via `SettingsThemeShell` (`enhanced-settings-router.tsx:212/222/245→858`, `getDashboardThemeCssVars` inline vars, same mechanism as the dashboard provider), so `--dashboard-primary` RESOLVES under `/settings`. Re-recorded as documented intentional composition (settings = dashboard-shell-themed surface, consistent with the C-06 Table-L contract). No code change; `enhanced-settings-router.tsx` is USER-003's lane (untouched). | 4 (done — decision recorded) |
| D-01 | Duplicate `--admin-*` vs `--neon-*` / role colors | `--admin-primary`=139 92 246 (#8b5cf6), `--admin-accent`=6 182 212 (#06b6d4) overlap the CSS `--primary` and staff `--neon-*` language | record only; **Phase 5 (2026-09-13): OWNER-PENDING decision request** — 13 latent `--admin-*` color tokens: Option A adopt into the registry as scoped admin palette / Option B retire (delete from `app/admin/globals.css`, keep `--admin-transition-normal`). Owner: admin agent (handoff HF-DESIGN-030-ADMIN). `app/admin/globals.css` untouched. | 5 (owner-pending) |
| D-02 | Duplicate dark form override | `styles/globals.css` duplicates the global input override (dead file) | **Phase 5 (2026-09-13): dead duplicate REMOVED with the root (zero rendered delta — unloaded); LIVE override at app/globals.css:360–374 GATED** — removing it changes rendered values across 148 form-control files, so a scoped remediation gate is recorded instead (token-based component-level form styles as a separate owner-reviewed bounded change). | 5 (dead duplicate done; live override gated) |

---

## 8. Stage-1 baseline decision (runtime-truth identity)

Per the stage-1 rule ("no behavioral edit is required unless provably safe"),
**no source file is changed in stage 1**. Rationale per family:

| Tailwind alias family | Identity assertion held? | Why no edit |
| --- | --- | --- |
| 12 semantic colors (border/input/ring/background/foreground/primary/secondary/destructive/muted/accent/popover/card + `-foreground`) | **yes** — every alias maps 1:1 to an existing `:root` var in `app/globals.css`; staff scope remaps the same names deliberately | already truthful |
| 6 `neon-*` colors | **yes within its scope** — aliases map to `--neon-*-rgb` which exists inside `.staff-scheduling-prototype`; all 26 consumers render inside that scope | adding `:root` fallbacks would be a no-op today but belongs to the neon-scope phase, not stage 1 |
| `rounded-lg/md/sm` | **divergent** — alias maps to `var(--radius)` which does not exist at `:root` (only in staff scope) | fixing now (adding `--radius` to `:root`) is **not provably zero-regression** (would round every radius app-wide); staged under Phase 2 with visual review — **RESOLVED (DESIGN-033, 2026-09-13): owner approved the `0 → 8/6/4px` app-wide delta and `--radius: 0.5rem` was applied at `:root`**; QA visual check of critical surfaces is the final gate |

Zero source changes => trivially zero visual regression for this stage.

**Phase-2 update (2026-09-11):** the centralized registry is now the target
authority — see `TOKEN_REGISTRY.md` (per-role rows for every semantic role incl.
primary/admin/neon/staff/dashboard, radius, and the 3 legacy rgb, with status
live/dead/conflict/duplicate). Phase 2 evaluated the only safe-addition
candidate (`--radius` at `:root`) and **deferred it** (identity not provable:
current computed value is 0 app-wide vs proposed 0.5rem/0.375rem/0.25rem — per
table in registry §2a); no other `:root` addition is a candidate. All four
dead-root removals were evaluated and **deferred to a Phase-5 cleanup
checkpoint** (zero importers proven, but `--sidebar-*`/`--chart-*` definitions
live only in dead files and are referenced by live `components/ui/sidebar.tsx`).
Phase 2 made **zero source-code changes** — gates recorded instead of edits.

---

## Phase roadmap (design only until each phase executes — updated 2026-09-11, Phase 2)

1. **Phase 2 — Centralized token registry.** **EXECUTED (2026-09-11).**
   `TOKEN_REGISTRY.md` is the target-authority registry (role -> canonical CSS
   var -> runtime value -> Tailwind alias(es) -> defining file(s) -> status,
   one row per role, machine-checkable). The stage-1 inventory is its survey
   input; registry §2c records survey corrections. **NOT applied in Phase 2**
   (both were evaluated and gated instead): adding `--radius` at `:root`
   (identity fails — see §2a proof; moved to Phase 3 with a visual-review
   gate) and promoting neon triplets to `:root` (out of scope by rule; stays in
   Phase 4 with its gate). Dead-root removal was evaluated and **deferred to
   Phase 5** (sidebar/chart token references, C-10).
2. **Phase 3 — ThemeProvider consolidation + radius truth.** **EXECUTED (2026-09-11; finalized 2026-09-13).**
   The three dead next-themes twins (`components/venue/theme-provider.tsx`,
   `app/venue/components/theme-provider.tsx`,
   `app/admin/dashboard/components/theme-provider.tsx`) and `app/providers.tsx`
   were re-validated per file (rg importers + symbol usage, zero source references
   incl. relative/alias spellings), register rows set `retired`, and **deleted**.
   The three LIVE providers were **NOT merged** — the composition contract is
   recorded in `TOKEN_REGISTRY.md` Table L (root hook provider wraps all routes
   and sets `<html>` class + localStorage["theme"]; venue next-themes wrapper wraps
   `/venue/**` and sets `<html>` class + `style.colorScheme` + FOUC script; dashboard
   palette provider wraps `/dashboard/**` and sets shell-scoped `--dashboard-*` +
   `--primary`/`--ring`). Merging is not provably zero-delta, so C-06 resolves as a
   documented contract (C-04 stays open: `.dark` class is a no-op in the main app).
   **NOT applied (carried): the C-03 radius visual-review gate** — add
   `--radius: 0.5rem` at `:root` only after owner review of the app-wide
   0 -> 8/6/4px corner delta (rounded-lg/md/sm; ~3,068 utilities / 923 files;
   staff scope unaffected — its own 0.625rem wins by cascade); per-surface
   visual-regression pass required.
3. **Phase 4 — Neon scope + dashboard var scope.** **EXECUTED as a decisions
   + registry phase (2026-09-13) with ZERO source-code changes.** Re-verified
   the 6 neon triplets / 6 dead composites / 19 `--dashboard-*` / 14
   `--admin-*` with fresh rg; per-token-class scope decisions recorded in
   `TOKEN_REGISTRY.md` §4a: neon triplets **kept as scoped runtime surface**
   (C-02, all 26 consumers in-scope at 3 anchor files / 4 sites; owner note —
   no `:root` promotion), `--dashboard-*` **kept as scoped runtime surface**
   (shell = intentional composition boundary for `/dashboard/**` AND `/settings`;
   **C-11 premise CORRECTED** — settings re-mounts the shell, vars resolve),
   `--admin-*` **kept as scoped runtime surface** (route palette, zero external
   consumers; Table D alias claim corrected), `--neon-*` composites **recorded
   dead, retirement deferred to Phase 5**. C-03 radius gate finalized as a note
   only (NO change — identity still fails; delta table + blast radius recorded).
4. **Phase 5 — Global form override + dead-root cleanup + neon composite
   retirement.** **EXECUTED as the final execution batch (2026-09-13).**
   - **C-10 dead-root removal — DONE.** All four un-imported roots
     (`app/venue/globals.css`, `app/admin/dashboard/components/styles/globals.css`,
     `styles/globals.css`, `styles/venue/globals.css`) re-proven zero-importer
     (rg, all spellings, no `@import`, no next/postcss registration) and
     **deleted** (431 lines); per-root zero-use registers + zero-delta compare
     points in `TOKEN_REGISTRY.md` §5a–5c. DESIGN-032 `:root` truth +
     sidebar/chart Tailwind projections made the removal clean (C-10 resolved).
   - **Authored light-scheme provenance — PRESERVED** (`TOKEN_REGISTRY.md`
     §5b): light sidebar (2 roots), light chart (3 roots), light semantic
     values (3 roots, 2 families), `--radius` 0.5rem ×4; none loaded (app is
     dark-first; C-04 open).
   - **`--neon-*` composite retirement — DONE.** 6 zero-consumer composite
     declarations removed (negative rg re-proven); 6 `--neon-*-rgb` triplets +
     `--color-neon-*` map + Tailwind aliases intact (C-02 unchanged).
   - **D-02 form override — dead duplicate removed with its root (zero
     rendered delta); LIVE override (app/globals.css:360–374) GATED** — 148
     form-control files depend on it; scoped remediation gate recorded
     (token-based component-level form styles in a separate owner-reviewed
     change). Recommendation recorded in `TOKEN_REGISTRY.md` §5d.
   - **`--admin-*` latent palette — OWNER-PENDING.** Decision request (option
     A adopt into registry as scoped admin palette / option B retire) recorded
     in `TOKEN_REGISTRY.md` Table D + §5f + DESIGN-030 task record next_steps;
     pending handoff HF-DESIGN-030-ADMIN to the admin agent. `app/admin/globals.css`
     untouched.
- **`--radius: 0.5rem` at `:root` — OWNER-GATED VISUAL REVIEW, NOT
      applied** (C-03). Table C gate finalized Phase 4 unchanged; ~3,068
      `rounded-{lg,md,sm}` usages / 923 files would change 0 → 8/6/4px; tailwind
      borderRadius and `--radius` untouched; 0px corners preserved app-wide.
      **→ SUPERSEDED 2026-09-13: APPLIED by DESIGN-033 (owner approved the
      `0 → 8/6/4px` delta; `--radius: 0.5rem` at `:root`; §2.2 + Table C/K
      live; QA visual check of critical surfaces is the final gate —
      handoff HF-DESIGN-033-QA).**
   - Zero rendered-value delta vs the Phase-4 baseline (roots unloaded; classes
      duplicated live; vars live elsewhere or dead).
5. **Phase 6 — Adoption + regressions.** **C-03 radius gate APPLIED (DESIGN-033,
   2026-09-13)** — the first owner-approved intentional visual change from the
   token program: `--radius: 0.5rem` at `:root` rounds `rounded-lg/md/sm`
   app-wide 0 → 8/6/4px; QA visual check of critical surfaces is the final
   gate. Remaining Phase-6 work: sweep literal colors left in
   components toward registry tokens; per-stage zero-visual-regression gates
   and inventory/registry refresh.

Each phase keeps the CSS variables as runtime truth, Tailwind as a projection,
and requires per-phase register updates plus zero-visual-regression evidence.