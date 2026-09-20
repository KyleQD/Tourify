# Design System state

- Last reviewed SHA: `7cf660ad8422dbd3adbdb77369d94638cdc2231b`
- Last reviewed at: 2026-09-13 (DESIGN-033: C-03 radius gate APPLIED —
  `--radius: 0.5rem` at `:root`; public `/` runtime confirms the token and
  sampled 6px/16px corners; owner-accepted app-wide 0 → 8/6/4px corner delta;
  authenticated QA covers dashboard/settings/admin/staff, artist overview, and
  direct artist home; the venue terms-save duplicate-key blocker remains;
  registry Table C/K flipped live)
- Active task: DESIGN-033 — apply owner-approved `--radius` token (C-03 gate);
  code change + registry/inventory/state updates DONE, status stays active
  (QA visual check of critical surfaces is the final gate; handoff
  HF-DESIGN-033-QA pending)
- Confidence: **working / partial** — the shared Radix/shadcn primitive library and
  shared state contracts are real and focused-tested, but token authority, domain
  adoption, i18n, and broad accessibility gates remain open. The venue-ui compatibility
  twin retirement under CP-037 is complete; token stages 1–3 (survey + reconcile +
  baseline, central registry, ThemeProvider consolidation) are complete with zero
  rendered-value changes; Phase 5 executed the first source changes (dead roots +
  dead neon composites) with provable zero rendered delta.

## Durable facts

- Canonical shared primitive library: `components/ui/**` (74 files; inventory in
  `docs/engineering/generated/components.md`).
- Layout: `components/layout/**` (9 files); surface: `components/surface/surface-primitives.tsx`.
- Canonical shared state primitives: `components/ui/empty-state.tsx`,
  `components/ui/error-state.tsx`, and `components/ui/skeleton.tsx`.
- Shared state callers adopted: `feature-unavailable.tsx`, `error-boundary.tsx`, and
  `loading-screen.tsx`; domain duplicates remain for owner-coordinated adoption.
- Canonical responsive hook: `hooks/use-mobile.ts`; both remaining domain copies
  (`hooks/venue/use-mobile.tsx` and `app/admin/dashboard/components/hooks/use-mobile.tsx`)
  were converted to pure compatibility re-exports of the canonical hook in DESIGN-031
  (2026-09-11) after zero-use re-validation — no other implementation remains. The
  `components/venue/ui/use-mobile.tsx` copy was retired with DESIGN-029. The admin
  copy MUST keep its relative import (`../../../../../hooks/use-mobile`): this
  subtree's tsconfig maps `@/*` to itself, so an alias import would be circular.
  Register rows corrected accordingly (row 36 target now `hooks/use-mobile.ts`;
  stale `components/ui/use-mobile.tsx` keep row marked retired since DESIGN-002
  moved the canonical hook).
- `components/venue/ui/**` contains 26 files with no live application imports. The
  compatibility boundary is 26 register-authorized keep files. All registered
  retire-later twins (23 files) plus the byte-identical `use-toast.ts` duplicate
  (24 files total) were RE-VALIDATED as zero-consumer (per-twin rg sweep + aggregate
  sweep, no barrel/relative re-exports) and DELETED 2026-09-11 under CP-037 /
  DESIGN-029; the register now marks them `retired` (canonical targets unchanged).
  `avatar.tsx` and `separator.tsx` differed from shared targets (missing canonical
  data-slot attributes) and the retired `use-mobile` target was stale because the live
  canonical hook is `hooks/use-mobile.ts`; all three were recorded accurately in the
  register before deletion.
- The 23 retire-later audits (DESIGN-005..027) are COMPLETE (2026-09-11) with
  zero-use + parity evidence and their RETIREMENT is now also complete (DESIGN-029).
  Every deleted venue twin re-validated to zero live consumers; canonical keep /
  consumers already-migrated / twin retired dispositions are recorded.
  `separator.tsx` was a DIVERGENT stale copy (omits the canonical `data-slot="separator"`
  attribute), so the register's DUP-082 "Exact duplicate" basis was corrected to the
  divergent note (2026-09-11, DESIGN-029). The register's stale rows under
  `app/venue/components/ui/**` (paths that no longer exist on disk) were removed too
  (49 rows).
- Tokens remain split across `app/globals.css`, `tailwind.config.ts`,
  `lib/design-system/theme.ts`, and three live ThemeProviders.
- Token authority stage 1 (DESIGN-030, 2026-09-11) established the runtime-truth
  baseline with ZERO source changes; inventory lives at
  `docs/implementation/ui-ux-completion/TOKEN_AUTHORITY_INVENTORY.md`. Durable
  facts: (a) runtime CSS truth is only `app/globals.css` (loaded by the root
  layout), `app/admin/globals.css` (14 `--admin-*` tokens), and `app/artist/globals.css`
  (0 tokens); four other CSS roots are dead (no importers):
  `app/venue/globals.css`, `app/admin/dashboard/components/styles/globals.css`,
  `styles/globals.css`, `styles/venue/globals.css` (each defines a different
  `--radius` that never loads). (b) `tailwind.config.ts` projects 12 semantic
  color aliases 1:1 onto `:root` HSL vars (identity holds); the 6 `neon-*`
  aliases project `--neon-*-rgb` triplets that exist ONLY inside
  `.staff-scheduling-prototype` (scope anchors: staff-scheduling-tab.tsx:162,
  admin-calendar-view.tsx:643, calendar-day-sheet.tsx:428; all 26 neon consumers
  verified in-scope), and `rounded-lg/md/sm` project `var(--radius)`, which is
  missing at `:root` (radius divergence C-03 — staged, NOT fixed in stage 1
  because fixing would change visuals).
- Token authority stage 2 (DESIGN-030 Phase 2, 2026-09-11) delivered the
  target-authority registry at `docs/implementation/ui-ux-completion/TOKEN_REGISTRY.md`
  (role -> canonical var -> runtime value -> Tailwind alias(es) -> defining
  file(s) -> status live/dead/conflict/duplicate; 161 rows across Tables A–K;
  supersedes the inventory for migration decisions). Phase 2 made ZERO source
  changes and recorded two gates instead of edits: (1) **`--radius` at `:root`
  DEFERRED to Phase 3+ with a visual-review gate** — identity proof: outside
  staff scope all of `rounded-lg/md/sm` currently compute to 0 (var undefined at
  `:root` -> invalid at computed-value time -> border-radius initial), proposed
  `--radius: 0.5rem` yields 0.5rem/0.375rem/0.25rem, so the change is NOT
  provably zero-regression; ~3,068 `rounded-{lg,md,sm}` utilitiy usages across
  923 files; staff scope unaffected (its 0.625rem wins by cascade). (2) **All
  four dead-root removals DEFERRED to a Phase-5 cleanup checkpoint (C-10)** —
  zero importers re-proven by rg (all file types; alias/relative spellings) and
  every class each root defines is duplicated live in `app/globals.css`
  (`.glow-effect`, `.card-hover`, `.text-balance`, `.typing-dot`,
  `.scrollbar-hide`, `.animate-scan`), BUT `--sidebar-*`/`--chart-*` exist ONLY
  in the dead roots and `--sidebar-*` is referenced by live
  `components/ui/sidebar.tsx` (lines 184, 201, 227, 521; `bg-sidebar*` /
  `hover:bg-sidebar-accent` classes are absent from `tailwind.config.ts` and are
  silently never generated today). Registry §2c corrected stage-1 survey:
  `--color-primary`/`--color-ring` are consumed in-scope (15 dead of 17
  semantic `--color-*`, not 17), 25 color + 3 radius = 28 Tailwind projections
  (not 27), and chart.tsx `--color-border`/`--color-bg` are inline recharts
  props, not v4-map consumers. (c) `lib/design-system/theme.ts`
  `tourifyTheme` is a parallel TS-only palette (primary=#0ea5e9 vs CSS
  `--primary`=#7c3aed); live surface is only `themeUtils.getRoleClasses`/
  `getStatusClasses` (hardcoded tailwind classes); `componentVariants`,
  `getRoleColor`, `getPriorityClasses`, `getSpacingClass`, `getShadowClass`,
  and the `tourifyTheme` object itself are dead exports. (d) ThemeProvider
  implementations: **3 live mechanism files, one per subtree** —
  `hooks/use-theme.tsx` (root provider, `app/layout.tsx:4`, `defaultTheme="dark"`;
  provides `<html>` class `light`/`dark` + `localStorage["theme"]` + custom
  context; custom `useTheme` consumed by venue theme-switcher/venue-header
  twins), `components/theme-provider.tsx` (next-themes wrapper, mounted by
  `app/venue/providers.tsx` ← `app/venue/layout.tsx` for `/venue/**`; provides
  html class + `style.colorScheme` + next-themes FOUC script), and
  `components/dashboard/dashboard-theme-provider.tsx` (mounted by
  `app/dashboard/layout.tsx` for `/dashboard/**`; renders `.dashboard-theme-shell`
  with inline `--dashboard-*` (15) + `--primary` + `--ring` via
  `getDashboardThemeCssVars`, light-surface vars via the `data-dashboard-theme-light`
  class in globals.css). The three live providers wrap **disjoint** subtrees and
  write **disjoint** token surfaces; they were **NOT merged** — C-06 resolves as
  a documented composition contract (`TOKEN_REGISTRY.md` Table L), not a merge.
  The four dead files (`components/venue/theme-provider.tsx`,
  `app/venue/components/theme-provider.tsx`,
  `app/admin/dashboard/components/theme-provider.tsx`, `app/providers.tsx`) were
  re-validated to zero importers / zero symbol usage (rg, all spellings; fresh
  re-proof 2026-09-13) and **DELETED** (DESIGN-030 Phase 3). next-themes stays a
  dependency (live venue wrapper). (e) The global dark-only form
  override (input/textarea/select `#0f1117` `!important` with purple focus) is
  at app/globals.css:334–349 and is duplicated in the dead `styles/globals.css`.
  (f) `var(--dashboard-primary)` is consumed at
  `components/settings/enhanced-settings-router.tsx:478,620,632` under
  `/settings` (General) where the dashboard shell vars are not in scope (C-11).
- Token authority stage 3 (DESIGN-030 Phase 3, executed 2026-09-11, finalized
  2026-09-13) consolidated the ThemeProvider set with **zero rendered-value
  change**: the three live providers (root / venue / dashboard) wrap disjoint
  subtrees and write disjoint token surfaces and were **NOT merged** (C-06
  resolves as the documented composition contract in `TOKEN_REGISTRY.md` Table L
  + Phase-3 execution notes; merging any pair is not provably zero-delta). The
  four dead provider files (three next-themes twins +
  `app/providers.tsx`) were re-proven zero-importer / zero-symbol (negative rg
  across all file types and alias spellings, fresh 2026-09-13) and **deleted**;
  zero-delta is trivial because nothing imported them. next-themes remains a
  dependency. C-04 (`.dark` class no-op in the main app) stays open; the C-03
  `--radius` visual-review gate is carried unchanged (NOT implemented here).
Register rows 50/159/292/1218 in CANONICAL_COMPONENT_REGISTER.csv are
   `retired`; the register file also carries another lane's concurrent edits
   (preserved unmodified).
- DESIGN-032 (sidebar/chart token gap, 2026-09-13) closed C-10's sidebar side:
  **runtime truth** for the 8 `--sidebar-*` and 5 `--chart-*` roles now lives at
  `app/globals.css :root` (dark values, byte-identical to the dead-root dark
  sources: `styles/globals.css :root`, `.dark` blocks of
  `app/admin/dashboard/components/styles/globals.css` and
  `styles/venue/globals.css`; `app/venue/globals.css` defines NONE of these vars
  — verified rg), and **Tailwind projection** added the `sidebar` family
  (`DEFAULT`→`--sidebar-background`, `foreground`, `primary`,
  `primary-foreground`, `accent`, `accent-foreground`, `border`, `ring`) and
  `chart` ramp (`1..5`) to `tailwind.config.ts` `extend.colors` (38→51 color
  alias names, 41→54 projections; registry Table K). The live
  `components/ui/sidebar.tsx` class tokens (`bg-sidebar`,
  `text-sidebar-foreground[/70]`, `bg-sidebar-accent`,
  `text-sidebar-accent-foreground`, `border-sidebar-border`,
  `bg-sidebar-border`, `ring-sidebar-ring`) previously compiled to NOTHING
  (keys absent) and now generate 1:1 (scoped Tailwind build proof); the
  arbitrary shadows `hsl(var(--sidebar-border))`/`hsl(var(--sidebar-accent))`
  at sidebar.tsx:521 resolve at `:root`. Zero visual regression provable:
  every class token's only consumer is `components/ui/sidebar.tsx` (negative
  rg), `--chart-*` has zero consumers anywhere (projection registered for
  shadcn-chart adoption), and the 13 new color keys collide with none of the
  18 pre-existing `extend.colors` keys. The four dead roots remain UNCHANGED
  (Phase-5 cleanup owns removal); their copies are now redundant for the
  dark app and remain the authored light-value provenance (`app/globals.css :root`
  comment records the corrected provenance — light sidebar values authored in
  the 2 light-capable roots, light chart values in 3). Registry Tables I/K
  updated (13 rows live), DESIGN-032 execution notes appended.
- Token authority Phase 4 (DESIGN-030, 2026-09-13) delivered the neon +
  dashboard/admin var-scope decisions with **ZERO source-code changes** (fresh
  rg evidence at the dirty tree SHA `7cf660ad`). Durable facts: (a) The 6
  `--neon-*-rgb` triplets (app/globals.css `.staff-scheduling-prototype`
  lines 261–266) are a **kept scoped runtime surface** (C-02): all **26** neon
  consumer files re-verified under `components/admin/**`, rendering inside 3
  anchor FILES / 4 anchor SITES — staff-scheduling-tab.tsx:162,
  admin-calendar-view.tsx:643 **and :862** (subscribe panel, wraps
  OrgCalendarSync), calendar-day-sheet.tsx:428; NO `:root` promotion (zero
  cross-scope usage; a `:root` copy would be an unreviewed no-op global
  surface today). Owner-facing note recorded on the registry Table G rows.
  (b) The 6 `--neon-*` composites (lines 267–272) are `dead` (negative rg:
  zero `var(--neon-*)` composite references; the `--color-neon-*` map and
  Tailwind aliases read the triplets directly); retirement moved to Phase 5.
  (c) The 19 `--dashboard-*` vars (`.dashboard-theme-shell` lines 77–94 +
  light block 97–102) are a **kept scoped runtime surface**; **C-11 PREMISE
  CORRECTED** — the `--dashboard-primary` consumers at
  enhanced-settings-router.tsx:478,620,632 are NOT unset: the settings surface
  re-mounts `.dashboard-theme-shell` via `SettingsThemeShell`
  (settings-theme-shell.tsx:28, `getDashboardThemeCssVars` inline vars — same
  mechanism as dashboard-theme-provider.tsx:99; wrapped at
  enhanced-settings-router.tsx:212/222/245→858). C-11 demoted from "runtime
  gap" to documented intentional composition (settings is a dashboard-shell
  themed surface; consistent with the Table-L contract). No code change —
  `enhanced-settings-router.tsx` is USER-003's active lane, untouched. (d) The
  14 `--admin-*` tokens (app/admin/globals.css `:root`, `/admin/**` scope) are
  a **kept scoped runtime surface** with **ZERO external var() consumers**
  (negative rg app/components/lib/hooks); `--admin-transition-normal` is
  consumed only by its own file (.admin-metric-card/.admin-btn-futuristic);
  the other 13 color tokens are a latent route-scoped palette — adoption vs
  retirement deferred to Phase 5 with the admin-surface owner (D-01 overlap
  language). Registry Table D "rgb(var(--admin-primary)) arbitrary values"
  claim corrected (no code consumer). (e) C-03 `--radius` gate **FINALIZED as
  note only** — re-verified still missing at `:root`; per-alias identity proof
  unchanged and still FAILING (current 0 app-wide vs proposed
  0.5rem/0.375rem/0.25rem); blast radius re-confirmed **3,068**
  `rounded-{lg,md,sm}` occurrences (1500/966/602) across **923 files**
  (app+components; 928 including lib/hooks/pages); **no behavioral change** —
  0px corners preserved; owner must review the `0 → 8/6/4px` app-wide delta
  (+ per-surface screenshot regression pass) before any separate bounded
  change. Registry line references refreshed from survey-era to current
  (Tables C/E/F/G preambles).
- Token authority Phase 5 (DESIGN-030, 2026-09-13) — final execution batch
  with **provable zero rendered-value delta** (first source changes since
  stage 1): (a) **C-10 dead-root removal EXECUTED** — the four un-imported
  roots (`app/venue/globals.css`, `app/admin/dashboard/components/styles/globals.css`,
  `styles/globals.css`, `styles/venue/globals.css`, 431 lines) re-proven
  zero-importer (rg all spellings, no `@import`, no next/postcss registration)
  and deleted; per-root zero-use registers + zero-delta compare points in
  `TOKEN_REGISTRY.md` §5a–5c. Every class was duplicated live; every var is
  live elsewhere (Table A / DESIGN-032 `:root`) or dead (`--radius`). Removal
  was unblocked by DESIGN-032 (`:root` sidebar/chart truth + project aliases);
  C-10 closed. (b) **Authored light-scheme provenance preserved** in the
  registry §5b (NOT loaded — app is dark-first, C-04 open): light Table A
  semantic values (3 roots, 2 families: "nouvelle" 222.2-family in the venue
  root; neutral 0 0% 3.9%-family in the admin-dashboard + styles/venue roots),
  light sidebar (2 light-capable roots), light chart (3 roots),
  `--radius: 0.5rem` ×4. (c) **`--neon-*` composite retirement EXECUTED** —
  6 zero-consumer `rgb(var(--neon-*-rgb))` declarations removed from
  app/globals.css (negative rg: zero `var(--neon-*)` composite references);
  6 `--neon-*-rgb` triplets + `--color-neon-*` map + the 6 Tailwind aliases
  intact (C-02 scoped-surface decision unchanged). (d) **D-02 — dead duplicate
  form override removed with `styles/globals.css` (zero rendered delta); the
  LIVE override (app/globals.css:360–374) is GATED** — 148 files under
  app+components render raw `<input|textarea|select>` elements, so removing
  the rule is not zero-delta-provable; scoped remediation gate recorded
  (token-based component-level form styles in a separate owner-reviewed
  change; recommendation in registry §5d). (e) **`--admin-*` latent palette —
  OWNER-PENDING decision request** (option A adopt into registry as scoped
  admin palette / option B retire 13 zero-consumer color declarations; keep
  `--admin-transition-normal`), recorded in registry Table D + §5f + task
  next_steps + pending handoff HF-DESIGN-030-ADMIN to the admin agent;
  `app/admin/globals.css` untouched. (f) **C-03 `--radius` gate NOT applied**
  — `tailwind.config.ts` borderRadius + `--radius` untouched; 0px corners
  preserved; gate note finalized Phase 4 intact.
- **DESIGN-033 (C-03 radius APPLIED, 2026-09-13) — the First owner-approved
  intentional visual change from the token program.** Owner approved the
  app-wide `0 → 8/6/4px` corner delta for `rounded-lg/md/sm` (~3,068
  utilities / 923 files; 1500/966/602, the long-standing blast radius), and
  `--radius: 0.5rem` was added to `app/globals.css :root` (semantic radius
  comment block after the chart ramp; the ONLY token added by this task —
  point-in-time sweep vs HEAD: DESIGN-032 sidebar/chart (13, pre-existing
  dirt) + `--radius` (1) = 14 new `--` declarations, all registered).
  `tailwind.config.ts` `extend.borderRadius` was VERIFIED 1:1 and NOT
  changed: `lg` = `var(--radius)` → 0.5rem (8px), `md` =
  `calc(var(--radius) - 2px)` → 0.375rem (6px), `sm` =
  `calc(var(--radius) - 4px)` → 0.25rem (4px) — the formulas already produce
  the owner-accepted values, so no correction was needed. Scoped Tailwind
  build (v3.4.17 CLI, probe content) emits all three utilities verbatim;
  numeric resolution confirmed (0.5rem = 8px base). Staff scope unaffected:
  `.staff-scheduling-prototype` keeps its own `0.625rem` (wins by cascade),
  so the admin staff surface is not part of the visual delta. Registry
  Table C (4 rows) + Table K (3 rows) flipped conflict → live; §2a/§4e/§5g
  historical "NOT applied" markers superseded; §6 execution notes appended.
  Inventory C-03 row + §2.2 + §8 + Phase roadmap updated. QA visual check of
  critical surfaces (main app, admin, artist, venue, dashboard, settings) is
  the FINAL GATE — pending handoff HF-DESIGN-033-QA to the qa agent.
- **DESIGN-033 QA checkpoint (2026-09-13):** the primary checkout was exercised
  on localhost:3000. Public `/` rendered root `--radius: .5rem`, with sampled
  `rounded-md` at 6px and the main `rounded-2xl` card at 16px. Protected
  `/admin`, `/artist`, `/venue`, `/dashboard`, and `/settings` redirected to
  login without an authenticated session; `/staffing` did not mount
  `.staff-scheduling-prototype`. Focused verification passed 5 files / 27
  tests and `agents:validate` passed 17 agents / 99 tasks / 0 warnings / 0
  errors. The handoff remains pending and DESIGN-033 remains active until an
  authenticated visual pass exercises those surfaces and the staff scope.
- Focused primitive coverage is in
  `__tests__/design-system/shared-state-primitives.test.tsx` (3 tests); no axe gate,
  broad primitive/layout suite, or web i18n framework exists.
- Current generated context: 369 web routes, 24 mobile routes, 939 API handlers, 1,939
  component files, 693 detected database objects across 422 migrations, and 1,287
  detected policies. These are navigation aids owned by the wider system.

## Current focus

- DESIGN-029 retirement is complete: all 24 registered retire-later venue-ui twins
  (23 twin files + use-toast.ts) were re-validated to zero live consumers and deleted
  under the accepted CP-037 decision; the 26 keep files remain preserved and the
  register was corrected (retired rows, DUP-082 separator basis fixed, 49 stale
  `app/venue/components/ui/**` rows removed).
- DESIGN-030 stage 1 (token survey + reconcile + runtime-truth baseline) is COMPLETE:
  the full inventory is recorded in
  `docs/implementation/ui-ux-completion/TOKEN_AUTHORITY_INVENTORY.md` and the
  phase roadmap (phases 2–6: central registry, ThemeProvider consolidation, neon +
  dashboard var scope, global form override remediation, adoption + regressions)
  is drafted there as design only. Stage 1 made zero source-code changes (no
  token renamed/deleted, no ThemeProvider removed, no class string altered).
- DESIGN-030 stage 2 (Phase 2: central registry + provably-safe `:root` baseline)
  is COMPLETE (2026-09-11): `TOKEN_REGISTRY.md` delivered as the target
  authority (161 rows, Tables A–K); `:root` additions NONE (radius deferred —
  identity not provable, gate recorded); dead-root removals NONE (all four
  deferred to a Phase-5 cleanup checkpoint with rg evidence); Phase roadmap in
  the inventory updated so Phase 3 carries the radius visual-review gate and
  Phase 5 carries the dead-root/sidebar-token checkpoint. Stage 2 made zero
  source-code changes.
- DESIGN-030 stage 3 (Phase 3: ThemeProvider consolidation) is COMPLETE
  (executed 2026-09-11, finalized 2026-09-13): the four dead provider files were
  re-validated per file (rg importers + symbol usage, zero source references
  incl. relative/alias spellings) and deleted; the three live providers were
  NOT merged — composition contract recorded in `TOKEN_REGISTRY.md` Table L +
  Phase-3 execution notes (root hook provider / venue next-themes wrapper /
  dashboard shell provider, one per disjoint subtree). The C-03 `--radius`
  visual-review gate was NOT implemented (carried); neon/dashboard/form/.dark
  untouched (Phases 4–5). Zero rendered-value delta: the removed files were
  never imported.
- DESIGN-031 responsive-hook caller migration is COMPLETE (2026-09-11): all six live
  callers already used the canonical `hooks/use-mobile.ts` object contract; the two
  boolean-only domain copies had ZERO consumers and were converted to pure re-exports
  of the canonical hook (contract test `__tests__/design-system/use-mobile-contract.test.ts`
  asserts same-function identity across all three paths). Final removal of the two
  compatibility shims is handed off to the owning venue/admin surfaces.
- DESIGN-032 sidebar/chart token gap is COMPLETE (2026-09-13): `--sidebar-*`/
  `--chart-*` runtime truth at `app/globals.css :root` (dark-first, byte-identical
  authorship), `sidebar` + `chart` Tailwind projection aliases registered, registry
  Tables I/K + counts updated, and the sidebar primitive's class tokens verified
  to now generate (scoped build). Zero non-sidebar visual delta (all consumers
  inside the primitive; no key collisions; `--chart-*` zero consumers). Dead roots
  untouched (Phase-5 cleanup owns removal).
- DESIGN-030 stage 4 (Phase 4: neon + dashboard/admin var scope) is COMPLETE
  (2026-09-13) with **zero source-code changes**: all three token classes were
  re-verified (fresh rg) and KEPT as scoped runtime surfaces — neon triplets
  (C-02, owner note; 26 consumers in-scope at 3 anchor files / 4 sites),
  `--dashboard-*` (C-11 **premise corrected**: settings re-mounts the shell via
  `SettingsThemeShell`, so the consumers resolve; recorded as intentional
  composition), `--admin-*` (14 route-scoped tokens, zero external consumers —
  latent palette). Neon composites recorded dead (retirement → Phase 5). C-03
  `--radius` gate finalized as note only (identity still fails; delta table +
  blast radius recorded; no behavioral change). Registry Tables C/D/E/G/K +
  §4 execution notes + inventory §5/conflicts/roadmap updated.
- DESIGN-030 stage 5 (Phase 5: final execution batch) is COMPLETE for the
  executable items (2026-09-13): **C-10 dead-root removal EXECUTED** (4 roots,
  431 lines, zero importers re-proven; per-root zero-use registers + authored
  light provenance in registry §5a–5b; zero rendered delta) and **`--neon-*`
  composite retirement EXECUTED** (6 dead declarations removed; triplets +
  aliases intact). **D-02**: dead duplicate form override removed with
  `styles/globals.css`; the LIVE override (~line 363) is **gated** (148
  form-control files depend on it — remediation via owner-reviewed token-based
  form styles as a separate change). **C-03 `--radius` gate NOT applied**
  (owner-gated; intact). **4 remaining owner/pending items: (1) `--admin-*`
  latent palette decision** (option A adopt / option B retire — pending handoff
  HF-DESIGN-030-ADMIN to the admin agent; `app/admin/globals.css` untouched),
  (2) **C-03 `--radius` visual review** before any separate bounded change,
  (3) D-02 live form-override replacement (owner-reviewed),
  (4) Phase 6 adoption + regressions.
- **DESIGN-033 (C-03 APPLIED, 2026-09-13) is COMPLETE for the code change**
  and CLOSES the phase-5 owner-pending item (2): the owner approved the
  `0 → 8/6/4px` radius delta and `--radius: 0.5rem` is live at `:root`;
  tailwind formulas verified 1:1 (lg/md/sm → 0.5/0.375/0.25rem); scoped
  build proof captured; registry Tables C/K flipped live; inventory rows +
  roadmap updated; QA visual check of critical surfaces is the FINAL GATE
  (pending handoff HF-DESIGN-033-QA to the qa agent) — status stays active
  until QA closes it. Remaining token-program items now: D-02 live
  form-override replacement (owner-reviewed), the `--admin-*` retirement
  handoff (already resolved via HF-DESIGN-030-ADMIN §5f), and Phase 6
  adoption + regressions.
- **DESIGN-033 QA blocker follow-up (2026-09-13):** the clean seeded artist
  persona `qa-flow-artist1@tourify.test` now renders direct `/artist` with the
  post composer, quiet-feed state/loader, artist navigation, and Overview link;
  no page-level Loading screen or new artist console error was observed. The
  clean seeded venue attempt at `/venue/dashboard?account=564aaaf9-feb0-4675-a300-305b29f94da7`
  renders the Venue workspace underneath the mandatory terms gate, but its
  required save still fails with `duplicate key value violates unique constraint
  accounts_account_type_display_name_key`; repeated `Error fetching venue stats:
  Object` errors are also present. Organization Scheduling remains rendered at
  `/admin/dashboard/staff?account=b06240db-f9dd-4bb0-892f-083078914867&tab=scheduling`.
  Runtime readback confirms root `.5rem`, app `rounded-lg` 8px / `rounded-md` 6px,
  and `.staff-scheduling-prototype` `.625rem` with a sampled 10px control.
  Focused 27-test suite, static proof, and `agents:validate` (17/99/0/0) pass;
  HF-DESIGN-033-QA and DESIGN-033 remain active because venue acceptance is
  still blocked.
- Remaining design work: (1) token authority Phase 6 (adoption + regressions;
  the Phase-5 executable items are done — C-03 radius is APPLIED (DESIGN-033,
  QA visual check pending via HF-DESIGN-033-QA), the `--admin-*` decision is
  RESOLVED (Option B retire), and only the live D-02 override replacement
  remains gated (owner-reviewed)),
  (2) shared-state adoption for the remaining domain duplicates, and (3) convert
  the remaining QUESTIONS.md answers into bounded tasks (WS-2.6 a11y/i18n gates).
- Resolve each follow-up only with owning-consumer evidence, target parity, focused
  verification, and register updates; the keep boundary remains unchanged and future
  deletion still requires per-file zero-use re-validation.

## Known risks

- Global dark input overrides and fragmented tokens can break light or surface-specific UI.
  **Phase-5 note (DESIGN-030, 2026-09-13):** the dead-root duplicate of the
  input override was removed with `styles/globals.css` (zero rendered delta);
  the LIVE override (app/globals.css:360–374, `!important` `#0f1117` /
  `#2d3748` / white / purple-focus) is **unchanged and gated** — 148 files in
  app+components render raw form controls that depend on it; remediation is a
  separate owner-reviewed change to token-based component-level form styling
  (registry §5d).
- `rounded-lg/md/sm` project `var(--radius)` while `--radius` is only defined inside
  `.staff-scheduling-prototype`; radii outside that scope are currently un-rounded
  (computed `0`). Phase 2 (DESIGN-030) evaluated adding `:root` truth and
  **deferred it behind an explicit visual-review gate (C-03)** — the
  change (0 -> 8/6/4px app-wide) is not provably zero-regression. Phase 3 did
  NOT implement it; **Phase 4 (2026-09-13) FINALIZED the gate as note only** —
  delta table + blast radius recorded in `TOKEN_REGISTRY.md` Table C (3,068
  `rounded-{lg,md,sm}` usages / 923 files; re-verified); owner visual review of
  the `0 → 8/6/4px` app-wide delta (+ per-surface screenshot regression pass)
  is required before any separate bounded change. **Phase 5 (2026-09-13):
  unchanged** — the dead roots' `0.5rem` definitions were removed with the
  roots (never loaded; no cascade participation), staff `0.625rem` is the only
  remaining definition, app-wide stays undefined → 0px corners. No behavioral
  change made. **RESOLVED (DESIGN-033, 2026-09-13): owner APPROVED the delta
  and `--radius: 0.5rem` was APPLIED at `:root`** — `rounded-lg/md/sm` now
  resolve 0.5/0.375/0.25rem (8/6/4px) app-wide; staff scope unchanged
  (0.625rem by cascade). Remaining gate: **QA visual check of critical
  surfaces** (handoff HF-DESIGN-033-QA, pending) — the app-wide corner change
  is owner-accepted and intentional.
- The 6 `neon-*` Tailwind aliases resolve only inside `.staff-scheduling-prototype`;
  any future neon consumer outside the scope anchors silently loses styling
  (C-02 — Phase 4 decision: keep scoped surface; owner note recorded; promote
  only via an explicit owner-approved neon layer).
- **RESOLVED (DESIGN-030 Phase 4, 2026-09-13): `var(--dashboard-primary)`
  consumers outside the dashboard shell are NOT unset (C-11 premise corrected).**
  The settings surface re-mounts `.dashboard-theme-shell` via `SettingsThemeShell`
  (same `getDashboardThemeCssVars` inline vars), so the consumers at
  enhanced-settings-router.tsx:478,620,632 resolve identically to `/dashboard/**`;
  C-11 is recorded as an intentional composition (settings = dashboard-shell
  themed surface), not a runtime gap. `enhanced-settings-router.tsx` remains
  USER-003's lane (untouched).
- RESOLVED (DESIGN-032 + DESIGN-030 Phase 5, 2026-09-13): the
  `--sidebar-*`/`--chart-*` gap behind C-10 — runtime truth at
  `app/globals.css :root` + projected `sidebar`/`chart` aliases (DESIGN-032)
  made removal clean, and **Phase 5 DELETED the four dead CSS roots** (zero
  importers re-proven; per-root zero-use registers; authored LIGHT
  sidebar/chart/semantic values + `--radius` 0.5rem preserved as provenance in
  `TOKEN_REGISTRY.md` §5b — nothing loaded, app is dark-first). The D-02
  duplicate form override was removed with `styles/globals.css`; the LIVE
  override remains behind the §5d remediation gate.
- **OPEN — `--admin-*` latent palette decision (DESIGN-030 Phase 5):** the 13
  zero-consumer `--admin-*` color tokens at `/admin/**` await the admin-surface
  owner's Option A (adopt into the registry as a scoped admin palette) vs
  Option B (retire) decision — pending handoff HF-DESIGN-030-ADMIN;
  `app/admin/globals.css` remains untouched with the tokens loaded and
  unreferenced until the owner decides.
- Three live theme runtimes coexist (root hook provider, venue next-themes,
  dashboard inline palette), so theme behavior differs by route subtree (C-06);
  the composition contract is recorded in `TOKEN_REGISTRY.md` Table L and the
  four dead provider twins (which could have silently re-entered the cascade)
  were deleted in DESIGN-030 Phase 3.
- A venue-domain theme fork `hooks/venue/use-theme.ts` (localStorage `"theme"`,
  applies `.dark` class only) still exists with zero importers; it is the venue
  lane's cleanup candidate (same pattern as the DESIGN-031 use-mobile shims).
- The two `use-mobile` compatibility shims (`hooks/venue/use-mobile.tsx` and
  `app/admin/dashboard/components/hooks/use-mobile.tsx`) now re-export the canonical
  hook, so no responsive-behavior fork remains; they exist until the owning surfaces
  decide final removal.
- Domain state twins can drift from the canonical accessible contracts.
- The full repository typecheck is resource-constrained in this dirty worktree; scoped
  DESIGN-002/DESIGN-003 checks passed.
- The 26 keep files under `components/venue/ui/**` remain compatibility debt in the
  register (`keep`) with no live consumers; any future deletion needs its own
  zero-use re-validation and register update.

Update this file only when a task establishes durable domain knowledge.

## Owner direction — 2026-09-10

Token work targets a centralized registry with CSS variables as runtime truth and
Tailwind as a projection. Core-flow accessibility requires automated,
keyboard/focus, and governed VoiceOver/TalkBack evidence, with WCAG AA as the
durable target. Venue wrappers must not fork shared interaction/state contracts.

## Production launch graph — 2026-09-16

- DESIGN-033 and DESIGN-034 remain P2 and non-blocking unless QA-003 identifies a core accessibility, usability, or token-drift failure.
- QA-003 owns launch accessibility evidence; WCAG AA, keyboard/focus, responsive-browser, and governed assistive-technology checks remain the durable acceptance target.
