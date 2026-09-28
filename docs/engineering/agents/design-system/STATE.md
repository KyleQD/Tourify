# Design System state

<!-- generated-agent-state:start -->
## Generated queue summary

- Generated at: 2026-09-28T03:22:19.549Z
- Source: task records and TASK_INDEX.json

- `DESIGN-033` — blocked/waiting_decision; MAINTENANCE-DEBT
- `DESIGN-036` — blocked/queued_postlaunch; POSTLAUNCH-LOGISTICS
- `DESIGN-038` — blocked/waiting_dependency; CORE-WEB-LAUNCH
- `WFC-007` — blocked/waiting_dependency; POSTLAUNCH-WORKFORCE
<!-- generated-agent-state:end -->

- Last reviewed SHA: `d21769046d517898144ee09a1c7bb4a7d36b068f` (branch `codex/qa004-staging-campaign`)
- Last reviewed at: 2026-09-25 (Wave 34: DESIGN-037 orphaned `lib/services/**` pile
  swept — 15 zero-importer modules / 5,554 lines deleted and 1 module repointed
  onto the recorded canonical column, removing 211 measured primary tsc
  diagnostics; DESIGN-033 re-verified with the C-03 owner approval recorded as
  an unevidenced gate; DESIGN-036 acceptance criteria written for the first time,
  which surfaced two of its eight pattern families as undelivered)
- Active tasks: DESIGN-037 (lib/services orphaned-pile sweep; result pass, handoffs
  open) — DESIGN-033 (C-03 owner approval is NOT independently evidenced; HF-DESIGN-034-C03-APPROVAL-PROVENANCE
  open, plus the still-pending HF-DESIGN-033-QA) — DESIGN-036 (6 of 8 pattern
  families delivered; navigation and scope cannot be written inside the current
  grant, QA evidence handed to QA-007)
- Confidence: **working / partial** — the shared Radix/shadcn primitive library and
  shared state contracts are real and focused-tested, but token authority, domain
  adoption, i18n, and broad accessibility gates remain open. The venue-ui compatibility
  twin retirement under CP-037 is complete; token stages 1–3 (survey + reconcile +
  baseline, central registry, ThemeProvider consolidation) are complete with zero
  rendered-value changes; Phase 5 executed the first source changes (dead roots +
  dead neon composites) with provable zero rendered delta.

## Durable facts

- **`lib/services/**` was an orphaned pile and is now swept (DESIGN-034/Wave 34).**
  Durable artifact: `docs/engineering/agents/design-system/lib-services-inventory-2026-09-25.json`
  (machine-readable, 92 rows, one disposition each). At the start: **92 files,
  41,770 lines, 22 zero-importer, 12 dead-but-imported, 58 live**. Disposition split
  after the sweep: **15 deleted / 5,554 lines, 1 repointed, 58 live-retained,
  12 held-pending-owner, 4 held-or-deferred-to-venue, 3 vitest roots**.
  The three reusable liveness rules that took real work and should be reused:
  (a) a zero-importer claim must be re-proven by a *second, different* extraction
  path, not by re-reading the same graph; (b) a module can be zero-importer and
  still undeletable, because a test in another lane's path may assert on its
  **source text** (`organization-social-integrations.service.ts` and
  `social-interactions.service.ts` are both held for exactly this reason — an
  import-graph sweep alone would have silently broken two test suites);
  (c) deleting a module whose only importers are dead files owned by *other* lanes
  trades its diagnostics for a new TS2307 in a file you do not own, so it is a
  net loss and a handoff, not a delete.
- **211 primary tsc diagnostics were removed from the `lib/services` pile**, all
  counted from real scoped-tsc runs (a generated per-run `tsconfig` whose `include`
  is exactly the named roots, with `tsFilesParsed` recorded so a short-circuiting
  run cannot masquerade as a clean one): 209 with the 15 deleted files, 2 from the
  repoint. Per file: staff-management 52, staff-job-board 42, password-management 31,
  advanced-analytics 30, onboarding-workflow 14, security-compliance 12,
  session-management 10, real-time-staff 6, enhanced-staff-analytics 5, locations 3,
  equipment-assets 2, event-participants 2. **The 1,384-diagnostic whole-repo
  baseline was NOT re-measured** — a full `npm run typecheck` is prohibited in a
  multi-lane wave (CI 68m18s, OOMs on 8GB) and 211 is a scoped figure, not a
  projection of a full run.
- **Every code-drift object that had a recorded canonical replacement and a
  surviving `lib/services` consumer is now resolved.** All 11 such objects
  resolved either to a dead consumer (deleted) or to the single repoint
  (`venue_profiles.name` → `venue_profiles.venue_name` in
  `lib/services/staff-onboarding.service.ts`, verified against
  `lib/database.types.ts` and `20260721120000_venue_profiles_url_slug.sql:5`).
  23 database objects now have zero on-disk reference under `lib/services`.
- **50 objects still reference `lib/services` and 28 of them have no canonical
  home at all** (`canonicalReplacement: null` in the database lane's artifact).
  These were NOT repointed: the discipline is that a lane repoints only onto an
  object the repository already names, and never invents a table to silence a
  diagnostic. `hiring_candidates` and the three `user_mfa_*` tables were
  independently confirmed to have **no CREATE TABLE in the active chain, in any
  archive, backup, or script** — genuinely undecidable, routed to the database
  lane as HF-DESIGN-034-SCHEMA-NO-HOME.
- **Two database-lane inventory file attributions are stale**
  (`docs/engineering/database-type-inventory-2026-09-25.json` is a read-only input
  and was not edited): `pending_password_resets` was attributed to
  `optimized-notification-service.ts` and `submit_verification_request` to
  `venue.service.ts`, but `git show HEAD` on both files shows no such reference
  and both are clean at HEAD. The CI log the inventory was derived from is from a
  different tree revision than the current HEAD, so per-object file attributions
  must be re-verified before they are acted on. Deleting
  `password-management.service.ts` incidentally removed the only on-disk consumer
  of `pending_password_resets`, so that `schema-missing` object now needs no
  schema decision at all.
- **C-03 (`--radius`) is a governance gap, not an engineering gap (Wave 34).**
  `--radius: 0.5rem` is at `app/globals.css:76` and is **committed at HEAD**
  (both `app/globals.css` and `tailwind.config.ts` are clean); the Tailwind
  formulas are 1:1 and a scoped build re-confirms 8/6/4px with the staff scope
  unchanged at 0.625rem/10px. What is missing is an **independent owner record**:
  `docs/engineering/DECISIONS.md` has no C-03 or `--radius` entry, and
  `HF-DESIGN-033-QA` has been `pending` since 2026-09-13 with no acceptance.
  Every affirmative statement about the owner approval is a document this lane
  wrote. **A lane must not be the accepting lane for its own visual-regression
  gate**; the durable fix is to record the owner decision in the cross-domain
  decision log, and the standing rule for this domain is that owner-gated
  decisions get a DECISIONS.md entry with a named approver, not only a token-registry
  row written by the implementing lane.
- **DESIGN-036's goal names eight logistics pattern families; six exist.**
  Delivered and test-guarded: attention, readiness, source-health, summary,
  loading, empty, error (+ the overview panel). **Missing: navigation and scope.**
  The only scope UI is `components/admin/logistics/logistics-scope-bar.tsx`, which
  sits outside `command-center/`, is not exported from the barrel, is not
  test-covered, and lives in the admin lane's path. The lesson: an empty
  `acceptance_criteria` array plus `result: "passed"` with `last_run_at: null` is
  a pass claim with nothing behind it, and it hid a two-day-old gap. Write the
  criteria down and the gap shows up immediately.
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
- **DESIGN-034 (token-registry CI gate, 2026-09-20) — COMPLETE.**
  `scripts/ci/check-token-registry.mjs` parses Tables A–I and exact Table K
  rows, requires every `live`/`conflict` role to have runtime truth, rejects
  unregistered declarations or non-module global token-source files, and
  compares all Tailwind CSS-variable projections exactly against registered
  roles. The machine-readable source boundary is `app/globals.css`,
  `app/admin/globals.css`, and `tailwind.config.ts`; component-local/module
  custom properties remain outside the global registry contract. The check
  and negative fixtures run in main CI; baseline passes at 126 role rows / 69
  active vars / 41 projections / 2 global sources.
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
- **DESIGN-034 Phase 6 regression gate is COMPLETE (2026-09-20):** exact
  registry/runtime/Tailwind drift is now a main-CI failure, with focused
  negative fixtures covering missing definitions, rogue global sources and
  declarations, and unregistered projections. No runtime CSS or Tailwind value
  changed.
- Remaining design work: (1) token authority Phase 6 adoption (the regression
  gate is complete;
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

## Mobile chrome contract — 2026-09-20 (DESIGN-035)

- The shared mobile app chrome has one global entry point: the five-action bottom nav in
  `components/nav.tsx` (`safe-area-bottom fixed inset-x-0 bottom-0 z-50 md:hidden grid
  h-16 max-w-md grid-cols-5`). It renders only on non-admin, non-artist, non-venue,
  non-root, authenticated mobile routes (render conditions exclude `/admin`, `/artist`,
  and the root path; venue routes are excluded via `hideRootNav` in
  `lib/routing/app-chrome-visibility.ts`).
- `AppChrome` reserves matching content space with
  `pb-[calc(var(--player-height,0px)+4rem+env(safe-area-inset-bottom))] md:pb-[var(--player-height,0px)]`,
  and its `showMobileAppNav` mirrors the same route exclusions. The
  `persistent-player-bar` sits at `bottom-16` on mobile (above the nav) and
  `md:bottom-0` above md.
- Surface-owned chrome wins: the artist workspace owns `MobileArtistNav`
  (`components/artist/mobile-artist-nav.tsx`, own bottom bar + `pb-16`) and is excluded
  from the global nav/AppChrome mobile chrome. Admin and venue surfaces own their own
  chrome similarly. Any new authenticated top-level surface must either adopt the global
  bars or add its exclusion to both `nav.tsx` and `app-chrome.tsx`.
- Landing/signup presentation contract: the landing page has exactly one account path in
  the first viewport (header "Join free" + hero "Create your free account"); repeated
  marketing CTAs are deliberately absent (removed in DESIGN-035). Landing header
  controls and the auth card's Sign Up/Sign In tabs are pinned to 44px at every
  breakpoint (`min-h-11`, and `md:min-h-11` on the auth tabs because the shared
  `TabsPrimitive` base is `min-h-11 md:min-h-0`). The embedded auth card on the landing
  surface is rectangular (`shardShape={false}`, 16px radius).
- Reduced-motion contract: the landing surface carries no essential motion; the only
  animation is Tailwind `transition-opacity` (0s under `prefers-reduced-motion`) and
  `animate-pulse` inside the `aria-hidden` Suspense fallback.

## Wave 34 verification baseline (2026-09-25)

- `npx vitest run __tests__/design-system __tests__/services __tests__/venue/venue-code-drift-cluster.test.ts __tests__/integrations/mfa.service.test.ts __tests__/events __tests__/feed`:
  **33 files / 253 tests passed** (32 files / 248 tests before
  `__tests__/design-system/lib-services-orphaned-pile.test.ts` was added).
- The new `__tests__/design-system/lib-services-orphaned-pile.test.ts` (5 tests) is
  the durable guard for the sweep: it fails if a deleted module returns, if a
  held module disappears, if any file in the repository imports a `lib/services`
  module that does not resolve, if the `venue_profiles.venue_name` repoint is
  reverted, or if the inventory's totals stop reconciling. **Its negative control
  was run**: injecting a file that imports `@/lib/services/staff-management.service`
  makes it fail with exactly that specifier, and removing the probe returns it to
  5/5. A guard that has never been seen to fail is not a guard.
- `npm run check:migration-chain` exit 0 · `npm run check:migration-validation`
  exit 0 · `npm run check:service-role-allowlist` exit 0 ·
  `npm run agents:validate` 17 agents / 152 tasks / 0 warnings / 0 errors ·
  `npx eslint` on the changed and new files exit 0 · `git diff --check` clean.
- NOT RUN in this wave, by rule: full `npm run typecheck`, full `npm test`,
  `npm run agents:generate`. Scoped per-file tsc via a generated
  `tsconfig.ds-scope.json` is the sanctioned substitute and is what produced the
  211-diagnostic figure.

## Workforce Command Center assignment — 2026-09-26

- Goal: own the shared WFC live-operations primitives, responsive behavior, accessibility, and convergence away from the isolated scheduling theme.
- Historical active-task note (superseded by generated queue summary): `WFC-007`, activated 2026-09-26 by the WFC-001 first-activation ownership review.
- Required handoff: provide Admin with tested command-shell, navigation, department, status, timeline, inspector, collection, and canonical data-state primitives using shared Admin tokens.
- Governing plan: `docs/engineering/exec-plans/active/WFC-COMMAND-CENTER-20260926.md`.

## WFC-007 activation rulings — 2026-09-26

- **CP-101 answers the DESIGN-036 escalation against widening.** `components/admin/**` is the admin lane's path, held by ADMVIEW-001 and claimed by seven WFC admin tasks. The design-system grant is **not** widened. WFC-007's working set is `components/ui/**` and `__tests__/design-system/**` only, and it ends with a published usage contract that the admin lanes compose from. The read-only carve-outs recorded in DESIGN-036 and SOCIAL-006 should stop recurring as escalations.
- **CP-100 answers the C-03 governance escalation.** `--radius: 0.5rem` is ratified as the de facto repository baseline and frozen, with no claim of prior owner approval. `app/globals.css` is removed from WFC-007's working set entirely. Any workforce surface needing a different radius ships a scoped token; nothing modifies `:root`. `HF-DESIGN-034-C03-APPROVAL-PROVENANCE` is answered and closes as partially-resolved, with the visual half moving to DESIGN-033's own QA gate.
- **CP-098 is a design obligation, not only an API contract.** `fresh`, `stale`, `unavailable`, and `not_authorized` must be visually distinct, and no presentation may render an unavailable source as zero. `not_authorized` must not leak the existence of the resource it hides.
- With these rulings, WFC-007 no longer conflicts with DESIGN-033 (`app/globals.css`), DESIGN-036 (`components/admin/**`), or DESIGN-037 (`lib/services/**`). The lane is clear to run in parallel with all three.
- Do not claim browser visual evidence from this lane. Static build, type, and test output are what this lane produces; the visual pass belongs to QA.

## WFC-007 delivery — shared Workforce live-operations primitives (2026-09-26)

- **Ten new shared modules, all in `components/ui/**`, all inside the CP-101 grant.**
  `ops-tokens.ts` (vocabularies, tone map, `resolveSourceState`, `opsRadiusStyle`,
  the scheduling convergence table), `ops-source-state.tsx`, `ops-status-chip.tsx`,
  `ops-metric.tsx`, `ops-attention.tsx`, `ops-timeline.tsx`, `ops-inspector.tsx`,
  `ops-collection.tsx`, `ops-filters.tsx`, `ops-shell.tsx`. Tests:
  `__tests__/design-system/workforce-live-operations.test.tsx` (52 tests) plus
  `__tests__/design-system/helpers/ops-contrast.ts`. Published contract:
  `docs/engineering/agents/design-system/workforce-live-operations-usage-contract.md`.
  `tsconfig.ds-scope.json` is the generated scoped-typecheck config for this lane.
- **Inventory came first and the reuse list is the durable part.** Reused rather
  than rewritten: `badge.tsx` (chip base), `empty-state.tsx`, `skeleton.tsx`,
  `scroll-area.tsx` (bounded inspector body), `separator.tsx`, `sheet.tsx` (mobile
  inspector, so focus trap / escape / scroll lock are Radix behaviour), the
  `min-h-11` target convention from `button.tsx`, and the focus-ring recipe.
  **Deliberately NOT created:** a `DataTable` fork (`table.tsx` already exists and
  is correct for genuinely tabular rows — `OpsCollection` is the collection case,
  not a replacement), a `StatusBadge` clone, and a hand-rolled
  `role="listbox"` (native `<input type="checkbox|radio">` gives keyboard
  operation, focus order, form semantics, and a 44px target for free).
  `components/ui/alert.tsx` was rejected for the attention queue because it
  hard-codes `role="alert"`; ten standing items would fire ten announcements.
- **The CP-098 false-zero rule is enforced by type shape, not by discipline.**
  `OpsSourceValue` and `OpsMetric` do not accept a bare number — they accept a
  source state plus an optional value, and `resolveSourceState` decides whether
  the value is renderable. `data-ops-value` is `numeric` or `suppressed` so QA
  can assert suppression without reading pixels. The four states differ on four
  channels (wording, icon, border treatment — solid/solid/dashed/dotted — and
  tone), so they stay distinguishable in greyscale and in forced-colours mode.
- **`not_authorized` non-disclosure is a six-rule contract in one function.**
  `showsValue`, `showsTimestamp`, `showsReason` and `showsRetry` are all `false`,
  any supplied `reason` is **discarded** (a server string such as "3 vendor
  payroll records are restricted" cannot be displayed), `resourceName` is
  accepted by the type and never returned, and the label/announcement are
  scope-generic. Downstream: `OpsMetric` renders exactly the word "Restricted"
  for a restricted measurement (name, value, delta, stamp and icon all dropped,
  because the measurement's *name* is itself the disclosure);
  `OpsSourceHealthPanel` never renders a row for a restricted source and emits
  one aggregated unnamed line that does not even disclose how many are
  restricted; `OpsDepartmentHealthRow` withholds the department name and the
  drill-down `href`, because a link is a capability disclosure. Restricted
  sources are classified non-actionable (`isActionableSourceState`) so a scope
  boundary is never reported as a broken source.
- **The one `<main>` is structural, not conventional.** `OpsShell` renders it;
  there is deliberately **no exported `OpsMain`**, because two exported
  landmarks are two chances to render `<main>` twice. No element in
  `ops-shell.tsx` sets an overflow rule, and both the grid and the flex column
  carry `min-h-0` so a tall child compresses its own region instead of pushing a
  scrollbar onto an ancestor. Scrolling is opt-in and declared
  (`viewport` on `OpsCollection` / `OpsTimeline` / `OpsInspectorPanel`); without
  one, `data-ops-viewport="page"` and the page scrolls normally.
- **The 14px / 44px / focus / reduced-motion floors are guard-tested, not
  asserted in prose.** A source-scanning test fails on `text-xs` or any
  arbitrary sub-14px step in `components/ui/ops-*.tsx`; render-level tests check
  the 44px target on every interactive control (the selection target is the
  `<label>` wrapper, not the 16px box); a test asserts no ops file introduces an
  animation and that the inherited `Skeleton` pulse is switched off with
  `motion-reduce:animate-none` at both call sites; breakpoint classes are
  asserted on the shell grid and the dense grids.
- **Contrast is measured from the real inputs, not asserted by eye.** The helper
  reads the installed `tailwindcss` palette and parses `--card`,
  `--muted-foreground`, and `--foreground` out of `app/globals.css :root`
  (read-only), composites each tone's own `bg-<hue>-500/10` over `--card`, and
  requires WCAG 2.1 AA. Measured at SHA `16fb834f`: ok 14.09:1, info 13.66:1,
  warn 14.42:1, critical 13.00:1, neutral 19.29:1, muted 7.84:1.
- **CP-100 radius: consumed, never defined.** No ops file defines `--radius`,
  none authors a `:root` rule, and `app/globals.css` is byte-identical to HEAD
  (guard-tested: `:root` still has exactly one `--radius: 0.5rem`, and the only
  other declaration in the file is the pre-existing
  `.staff-scheduling-prototype` `0.625rem`). A surface needing a different
  radius ships a **scoped** token through `opsRadiusStyle(radius, { slot })`,
  which sets `--ops-radius-panel` / `-control` / `-inline` on that element only;
  CSS consumes it as `rounded-[var(--ops-radius-panel,var(--radius))]`, so the
  frozen token is the fallback.
- **NEW GAP, raised as a path-specific decision rather than acted on: there is
  no registered CSS role for a status hue.** `OPS_TONE_CLASSES` uses Tailwind
  palette steps because `app/globals.css` has no `--status-*` family, and
  `scripts/ci/check-token-registry.mjs` treats any non-module `.css` file with a
  `--` declaration as a global token source, so a new role needs
  `app/globals.css` + `tailwind.config.ts` + `TOKEN_REGISTRY.md` — all outside
  this grant. Status colour in the workforce surface is therefore *single-sourced
  and contrast-tested* but **not token-governed**. This is the durable answer to
  "the same word ends up in three hues across three pages".
- **The admin lane's existing command-center primitives are now superseded but
  untouched.** `components/admin/logistics/command-center/status-indicators.tsx`
  models three source states (`ready | degraded | unavailable`) and has **no**
  `not_authorized`, so it cannot satisfy CP-098 as written; `attention-row.tsx`,
  `summary-stat.tsx`, and `states.tsx` overlap `OpsAttentionItem`, `OpsMetric`,
  and `OpsSourceHealthPanel`. Folding them onto this contract is an edit in
  ADMVIEW-001's / DESIGN-036's path (CP-101) and is handed off, not performed.
  The same is true of the scheduling-theme convergence: `OPS_SCHEDULING_TOKEN_CONVERGENCE`
  (neon-purple→primary, neon-cyan→chart-1, neon-green/amber/red→ok/warn/critical,
  staff 0.625rem→`var(--radius)`) is published as a target, applied by the
  scheduling lane in its own files.
- **Verification for WFC-007, at SHA `16fb834f`, tier `feature`.**
  `npm run check:token-registry` — pass (126 role rows / 69 active vars / 41
  projections / 2 sources). `npx tsc -p tsconfig.ds-scope.json --noEmit` — exit 0,
  0 diagnostics, **12 files parsed** (recorded so a short-circuiting run cannot
  masquerade as a clean one). `npx vitest run __tests__/design-system` — 5 files /
  67 tests pass. `npm run agents:validate` — 17 agents / 175 tasks / 0 warnings /
  0 errors. `npx eslint` on the 12 changed source files — exit 0.
  **NOT green: `npm run verify:feature -- --changed` did not complete.** Its
  eslint leg passed; its `npm run typecheck` leg is the known full-repo
  resource constraint on this 8GB machine (attempt 1 died with `SIGTERM`,
  attempt 2 was still running at 25 minutes with zero diagnostics emitted), so
  the tier aborts before reaching the admin-route checks. Scoped tsc above is the
  sanctioned substitute. **A full `npm run typecheck` was therefore not produced
  and no whole-repo diagnostic count may be attributed to this lane.**
- **The guards were negative-controlled.** A guard never seen to fail is not a
  guard. Three mutations were injected and reverted: making `OpsSourceValue`
  render an unavailable value, changing one type step to `text-xs`, and changing
  `app/globals.css` `--radius` to `0.25rem`. They failed 4 distinct tests
  (false-zero, sub-14px type, the readiness-meter guard, and the frozen-radius
  guard); reverting returned the suite to 67/67 with `app/globals.css` clean
  against HEAD.
- **No browser, hosted, or screenshot evidence is claimed from this lane.**
  Focus rendering, computed layout at each breakpoint, real composited contrast
  on a rendered surface, and the reduced-motion pass are QA's (QA-003 / QA-007).
  `agents:map:components` was run to refresh the one genuinely stale generated
  map; the other eight generated maps were left alone because they belong to
  lanes with live in-flight changes and this lane's change touches none of them.
