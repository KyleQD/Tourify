# Tourify Token Registry — target authority (DESIGN-030 Phase 2)

Owner: design-system agent. Authority basis: owner-approved CP-055 Design Q2
direction (`docs/engineering/DECISIONS.md`): **centralized token registry =
target authority, CSS variables = runtime truth, Tailwind = projection**,
migrated in stages with zero visual regression per stage.

This document is the **migration authority**. It is the single machine-checkable
record of every semantic token role in the tourify UI: role -> canonical CSS
variable -> runtime value -> Tailwind alias(es) -> defining file(s) -> status.
`TOKEN_AUTHORITY_INVENTORY.md` is its survey input (stage 1 baseline); this
registry supersedes it as the reference for migration decisions.

Format: one row per role, columns fixed in this order:
`role | canonical var | runtime value | tailwind alias(es) | defining file(s) | status | note`.
Status is a single primary tag (`live | dead | conflict | duplicate`); conflict
IDs (C-01..C-11) and duplicate IDs (D-01..D-02) reference the stage-1 inventory.

Survey SHA (base, dirty tree): `7cf660ad8422dbd3adbdb77369d94638cdc2231b`
Recorded at: 2026-09-11 (DESIGN-030 Phase 2; zero source-code changes).
Updated at: 2026-09-11 (DESIGN-030 Phase 3 — provider composition contract, Table L;
4 dead provider files deleted).
Phase-3 finalization: 2026-09-13 (DESIGN-030 Phase 3 — per-provider rg
re-validation + zero-delta proofs recorded in the Phase-3 execution notes below;
STATE.md durable facts and task record DESIGN-030.json updated with evidence;
result: pass).
Amended: 2026-09-11 (DESIGN-032 — sidebar/chart token gap closed: runtime truth
for `--sidebar-*`/`--chart-*` established at `app/globals.css :root`, Tailwind
projection aliases registered in Table K; dead-root copies remain as authored
provenance for the Phase-5 cleanup, un-imported and unchanged).
Amended: 2026-09-13 (DESIGN-030 Phase 4 — neon + dashboard/admin var scope
decisions recorded with fresh rg evidence; C-11 premise CORRECTED — the
`--dashboard-*` consumers under `/settings` resolve because the settings
surface re-mounts `.dashboard-theme-shell` via `SettingsThemeShell` with the
same inline palette vars; zero source changes; C-03 `--radius` gate finalized
as owner-review note only).
Amended: 2026-09-13 (DESIGN-030 Phase 5 — final execution batch: the four dead
CSS roots REMOVED (C-10) with per-root zero-use registers and authored
light-scheme provenance preserved (§5a–5b); the 6 zero-consumer `--neon-*`
composites REMOVED (§5e); the D-02 duplicate form override removed with its
dead root while the LIVE override stays behind a recorded remediation gate
(§5d); C-03 `--radius` gate NOT applied
(owner-gated visual review, unchanged — Table C).
Amended: 2026-09-13 (HF-DESIGN-030-ADMIN resolved — admin-surface owner chose
Option B RETIRE: 13 latent `--admin-*` color tokens removed from
`app/admin/globals.css`; Table D status rows flipped dead; `--admin-transition-normal`
retained (self-consumed by `.admin-metric-card`/`.admin-btn-futuristic`); D-01
overlap eliminated; zero rendered delta).
Amended: 2026-09-13 (**C-03 APPLIED — DESIGN-033.** Owner approved the app-wide
`0 → 8/6/4px` corner delta (rounded-lg/md/sm; ~3,068 utilities / 923 files);
`--radius: 0.5rem` established at `app/globals.css :root` with a semantic
radius comment block. `tailwind.config.ts` `extend.borderRadius` formulas
verified 1:1 — `lg` = `var(--radius)` → 0.5rem (8px), `md` =
`calc(var(--radius) - 2px)` → 0.375rem (6px), `sm` =
`calc(var(--radius) - 4px)` → 0.25rem (4px); no formula correction needed.
Scoped Tailwind build emits the three utilities; staff scope unaffected
(own `0.625rem` wins by cascade). Table C rows flipped `live`; Table K
radius rows flipped `live`; QA visual-check of critical surfaces is the
final gate (handoff HF-DESIGN-033-QA). See §6.)

---

## Legend

- `live` — defined in a file that is actually imported (runtime cascade member).
- `dead` — defined only in un-imported files, or an export with zero consumers.
- `conflict` — role is live but diverges from another role of the same semantic
  name, or its Tailwind projection cannot resolve everywhere it is used.
- `duplicate` — byte/semantic twin of another definition.
- Scoped roles (`admin` route, `dashboard` shell, `staff` scope) are deliberately
  scoped redefinitions of the same semantic names; the canonical row is the
  global `:root` row in Table A.

---

## Table A — Global semantic roles (`:root`, dark-first)

Defining file: `app/globals.css` (`:root`, lines 18–41), loaded by
`app/layout.tsx` (root). 19 rows. Status: `live`; identity held 1:1 by Tailwind
(verified stage 1).

| role | canonical var | runtime value | tailwind alias(es) | defining file(s) | status | note |
| --- | --- | --- | --- | --- | --- | --- |
| background | `--background` | `0 0% 3.9%` | `bg-background` | app/globals.css `:root` | live | also remapped in staff scope (Table F) |
| foreground | `--foreground` | `0 0% 98%` | `text-foreground` | app/globals.css `:root` | live | also remapped in staff scope |
| card | `--card` | `224 71.4% 4.1%` | `bg-card` | app/globals.css `:root` | live | also remapped in staff scope |
| card-foreground | `--card-foreground` | `0 0% 98%` | `text-card-foreground` | app/globals.css `:root` | live | also remapped in staff scope |
| popover | `--popover` | `0 0% 3.9%` | `bg-popover` | app/globals.css `:root` | live | also remapped in staff scope |
| popover-foreground | `--popover-foreground` | `0 0% 98%` | `text-popover-foreground` | app/globals.css `:root` | live | also remapped in staff scope |
| primary | `--primary` | `262.1 83.3% 57.8%` (≈ **#7c3aed** violet) | `bg-primary text-primary` | app/globals.css `:root` | conflict | **C-01**: theme.ts `primary`=#0ea5e9; dashboard provider writes `--primary` inline on shell (C-06); staff remaps in-scope |
| primary-foreground | `--primary-foreground` | `210 20% 98%` | `text-primary-foreground bg-primary-foreground` | app/globals.css `:root` | live | staff remaps in-scope |
| secondary | `--secondary` | `217.2 32.6% 17.5%` | `bg-secondary text-secondary` | app/globals.css `:root` | conflict | **C-01**: theme.ts `secondary`=#d946ef |
| secondary-foreground | `--secondary-foreground` | `210 20% 98%` | `text-secondary-foreground` | app/globals.css `:root` | live | |
| muted | `--muted` | `217.2 32.6% 17.5%` | `bg-muted` | app/globals.css `:root` | live | staff remaps in-scope |
| muted-foreground | `--muted-foreground` | `215 20.2% 65.1%` | `text-muted-foreground` | app/globals.css `:root` | live | staff remaps in-scope |
| accent | `--accent` | `217.2 32.6% 17.5%` | `bg-accent text-accent` | app/globals.css `:root` | live | staff remaps in-scope |
| accent-foreground | `--accent-foreground` | `210 20% 98%` | `text-accent-foreground` | app/globals.css `:root` | live | |
| destructive | `--destructive` | `0 62.8% 30.6%` | `bg-destructive text-destructive` | app/globals.css `:root` | live | NOT remapped in staff scope (staff inherits this) |
| destructive-foreground | `--destructive-foreground` | `210 20% 98%` | `text-destructive-foreground` | app/globals.css `:root` | live | staff remaps in-scope |
| border | `--border` | `217.2 32.6% 17.5%` | `border-border` | app/globals.css `:root` | live | staff remaps in-scope; dashboard shell styles override via classes |
| input | `--input` | `217.2 32.6% 17.5%` | `border-input` | app/globals.css `:root` | live | staff remaps in-scope |
| ring | `--ring` | `224.3 76.3% 48%` | `ring-ring` | app/globals.css `:root` | conflict | dashboard provider writes `--ring` inline on shell (C-06); staff remaps in-scope |

## Table B — Legacy rgb triplets

Defining file: `app/globals.css` (`:root` + `@media (prefers-color-scheme: dark)`).
3 rows. Status: `live`; conflict because body uses these while components use the
semantic HSL vars (**C-09**).

| role | canonical var | runtime value | tailwind alias(es) | defining file(s) | status | note |
| --- | --- | --- | --- | --- | --- | --- |
| foreground-rgb | `--foreground-rgb` | `0, 0, 0` → dark `255, 255, 255` | none (`body { color: rgb(var(--foreground-rgb)) }`) | app/globals.css `:root` + media dark | conflict | C-09: body color vs semantic `--foreground` |
| background-start-rgb | `--background-start-rgb` | `214, 219, 220` → dark `0, 0, 0` | none (body gradient) | app/globals.css `:root` + media dark | conflict | C-09 |
| background-end-rgb | `--background-end-rgb` | `255, 255, 255` → dark `0, 0, 0` | none (body gradient) | app/globals.css `:root` + media dark | conflict | C-09 |

## Table C — Radius roles

`tailwind.config.ts` `extend.borderRadius` **replaces** the default scale for
`lg/md/sm` (deep-merge semantics) with `var(--radius)` projections. **APPLIED
(DESIGN-033, 2026-09-13):** `--radius: 0.5rem` now sits at `app/globals.css
:root` (semantic radius block after the chart ramp), so outside the staff
scope the aliases resolve to **0.5rem/0.375rem/0.25rem (8/6/4px)** — the
owner-accepted values that replace the previous computed **0 (square
corners)** (an undefined `var()` at `:root` made the declaration invalid at
computed-value time). ~3,068 `rounded-{lg,md,sm}` utility usages across **923
files** (re-verified Phase 4, 2026-09-13: `rounded-lg` 1500, `rounded-md` 966,
`rounded-sm` 602; app+components scope) now render with corners. Status:
`live` (**C-03 resolved — owner-accepted app-wide visual change; QA visual
check is the final gate**).

**C-03 gate history:** Phase 2 (2026-09-11) DEFERRED with a visual-review gate
(identity proof FAILED — current 0 vs proposed 0.5/0.375/0.25rem); Phase 4
(2026-09-13) finalized the gate as note only (no behavioral change); **Phase 6
(DESIGN-033, 2026-09-13) — OWNER APPROVED the `0 → 8/6/4px` app-wide delta and
the change was applied.**

| alias | current resolved (`:root`/app-wide) BEFORE | current resolved (staff scope) | applied with `--radius: 0.5rem` at `:root` | identity? |
| --- | --- | --- | --- | --- |
| `rounded-lg` | `var(--radius)` undefined → invalid at computed-value time → **0** | `0.625rem` (10px) | `0.5rem` (8px) | **NO — owner-accepted** |
| `rounded-md` | `calc(var(--radius) - 2px)` undefined → **0** | `0.5rem` (8px) | `calc(0.5rem - 2px)` = `0.375rem` (6px) | **NO — owner-accepted** |
| `rounded-sm` | `calc(var(--radius) - 4px)` undefined → **0** | `0.375rem` (6px) | `calc(0.5rem - 4px)` = `0.25rem` (4px) | **NO — owner-accepted** |

**Owner acceptance (2026-09-13, C-03 gate):** the app-wide corner delta
`0 → 8/6/4px` for `rounded-lg/md/sm` (~3,068 utility usages / 923 files) is
**owner-approved and applied by DESIGN-033**. Blast radius: every surface
outside `.staff-scheduling-prototype` (main app, admin, artist, venue,
dashboard, settings); the staff scope is unaffected (its `0.625rem` wins by
cascade). **Final gate = QA visual-check of critical surfaces** (handoff
`HF-DESIGN-033-QA` to the qa agent). The reference default scale remains
available for keys not overridden (`rounded-xl` = 0.75rem, `rounded-2xl` =
1rem, etc. — unaffected by `--radius`).

| role | canonical var | runtime value | tailwind alias(es) | defining file(s) | status | note |
| --- | --- | --- | --- | --- | --- | --- |
| radius scale | `--radius` | **`0.5rem` at `:root` (DESIGN-033)**; staff scope `0.625rem`; dead roots `0.5rem` (removed Phase 5) | `rounded-lg` = `var(--radius)`, `rounded-md` = `calc(var(--radius) - 2px)`, `rounded-sm` = `calc(var(--radius) - 4px)` | app/globals.css `:root` (0.5rem, applied 2026-09-13); `.staff-scheduling-prototype` (0.625rem, unchanged) | **live** | C-03 RESOLVED — owner accepted the `0 → 8/6/4px` delta (QA visual check final gate, HF-DESIGN-033-QA); formulas verified 1:1, no config correction needed |
| radius-lg | `--radius` | `0.5rem` (8px) app-wide; `0.625rem` inside staff scope | `rounded-lg` | app/globals.css `:root`; tailwind.config.ts projection | **live** | C-03 applied — `var(--radius)` resolves at `:root` |
| radius-md | `--radius` | `calc(0.5rem - 2px)` = `0.375rem` (6px) app-wide; `0.5rem` inside staff scope | `rounded-md` | app/globals.css `:root`; tailwind.config.ts projection | **live** | C-03 applied |
| radius-sm | `--radius` | `calc(0.5rem - 4px)` = `0.25rem` (4px) app-wide; `0.375rem` inside staff scope | `rounded-sm` | app/globals.css `:root`; tailwind.config.ts projection | **live** | C-03 applied |

Reference — installed Tailwind v3 default scale (`node_modules/tailwindcss/stubs/config.full.js`, unchanged for keys not overridden):
`none 0px`, `sm 0.125rem`, `DEFAULT(rounded) 0.25rem`, `md 0.375rem`, `lg 0.5rem`,
`xl 0.75rem`, `2xl 1rem`, `3xl 1.5rem`, `full 9999px`. Only `sm/md/lg` are
overridden by this repo's config; `rounded`, `rounded-xl/2xl/3xl/full/none`
still resolve via the default scale and are unaffected by `--radius`.

## Table D — Admin route roles

Defining file: `app/admin/globals.css` (`:root`), loaded by
`app/admin/layout.tsx` (`/admin/**` only). 1 row: `--admin-transition-normal`
(self-consumed by `.admin-metric-card` line 24 and `.admin-btn-futuristic`
line 34). The 13 previously latent color tokens have been **RETIRED (Option B)**
per the admin-surface-owner decision (handoff `HF-DESIGN-030-ADMIN`, resolved
2026-09-13). Fresh consumer audit confirmed zero `var()`/`rgb(var())` consumers
across all file types; no in-flight admin work plans to adopt them; zero
tailwind projections; admin CSS uses literal rgb() values, not the vars.
D-01 overlap (admin-primary vs CSS `--primary`, admin-accent vs neon-cyan)
eliminated with retirement.

| role | canonical var | runtime value (rgb triplet / hex) | tailwind alias(es) | defining file(s) | status | note |
| --- | --- | --- | --- | --- | --- | --- |
| admin-primary | `--admin-primary` | ~~`139 92 246`~~ | none | ~~app/admin/globals.css `:root`~~ | **dead** | RETIRED Option B (HF-DESIGN-030-ADMIN, 2026-09-13): zero consumers, no in-flight plans; definition removed; D-01 overlap eliminated |
| admin-primary-light | `--admin-primary-light` | ~~`167 139 250`~~ | none | ~~app/admin/globals.css `:root`~~ | **dead** | RETIRED Option B (HF-DESIGN-030-ADMIN, 2026-09-13): zero consumers; definition removed |
| admin-primary-dark | `--admin-primary-dark` | ~~`107 33 168`~~ | none | ~~app/admin/globals.css `:root`~~ | **dead** | RETIRED Option B (HF-DESIGN-030-ADMIN, 2026-09-13): zero consumers; definition removed |
| admin-secondary | `--admin-secondary` | ~~`59 130 246`~~ | none | ~~app/admin/globals.css `:root`~~ | **dead** | RETIRED Option B (HF-DESIGN-030-ADMIN, 2026-09-13): zero consumers; definition removed |
| admin-secondary-light | `--admin-secondary-light` | ~~`96 165 250`~~ | none | ~~app/admin/globals.css `:root`~~ | **dead** | RETIRED Option B (HF-DESIGN-030-ADMIN, 2026-09-13): zero consumers; definition removed |
| admin-secondary-dark | `--admin-secondary-dark` | ~~`37 99 235`~~ | none | ~~app/admin/globals.css `:root`~~ | **dead** | RETIRED Option B (HF-DESIGN-030-ADMIN, 2026-09-13): zero consumers; definition removed |
| admin-accent | `--admin-accent` | ~~`6 182 212`~~ | none | ~~app/admin/globals.css `:root`~~ | **dead** | RETIRED Option B (HF-DESIGN-030-ADMIN, 2026-09-13): zero consumers; definition removed; D-01 overlap eliminated |
| admin-accent-light | `--admin-accent-light` | ~~`34 211 238`~~ | none | ~~app/admin/globals.css `:root`~~ | **dead** | RETIRED Option B (HF-DESIGN-030-ADMIN, 2026-09-13): zero consumers; definition removed |
| admin-accent-dark | `--admin-accent-dark` | ~~`14 116 144`~~ | none | ~~app/admin/globals.css `:root`~~ | **dead** | RETIRED Option B (HF-DESIGN-030-ADMIN, 2026-09-13): zero consumers; definition removed |
| admin-success | `--admin-success` | ~~`34 197 94`~~ | none | ~~app/admin/globals.css `:root`~~ | **dead** | RETIRED Option B (HF-DESIGN-030-ADMIN, 2026-09-13): zero consumers; definition removed |
| admin-warning | `--admin-warning` | ~~`245 158 11`~~ | none | ~~app/admin/globals.css `:root`~~ | **dead** | RETIRED Option B (HF-DESIGN-030-ADMIN, 2026-09-13): zero consumers; definition removed |
| admin-error | `--admin-error` | ~~`239 68 68`~~ | none | ~~app/admin/globals.css `:root`~~ | **dead** | RETIRED Option B (HF-DESIGN-030-ADMIN, 2026-09-13): zero consumers; definition removed |
| admin-info | `--admin-info` | ~~`59 130 246`~~ | none | ~~app/admin/globals.css `:root`~~ | **dead** | RETIRED Option B (HF-DESIGN-030-ADMIN, 2026-09-13): zero consumers; definition removed; was duplicate of admin-secondary |
| admin-transition-normal | `--admin-transition-normal` | `0.3s` | none | app/admin/globals.css `:root` | live | transition duration, non-color; consumed by `.admin-metric-card:24`, `.admin-btn-futuristic:34` — KEPT (Option B retained) |

## Table E — Dashboard shell roles

Defining file: `app/globals.css` `.dashboard-theme-shell` (current lines 77–94;
15 vars at 78–92) + `.dashboard-theme-shell[data-dashboard-theme-light='true']`
(current lines 97–102; 4 vars at 98–101; line refs refreshed Phase 4).
Written onto the shell element by
`components/dashboard/dashboard-theme-provider.tsx` (dashboard subtree) and by
`components/settings/settings-theme-shell.tsx` (settings surface — same
`getDashboardThemeCssVars` mechanism). 19 rows. Status: `live` (shell-scoped);
**C-11 CORRECTED in Phase 4 (2026-09-13)** — the `--dashboard-primary`
consumers under `/settings` are NOT unset: `EnhancedSettingsRouter` wraps all
its surfaces in `<SettingsThemeShell themeId={...}>` (enhanced-settings-router.tsx
lines 212/222/245→858), which renders `.dashboard-theme-shell` with the same
inline palette vars, so the consumers resolve identically to `/dashboard/**`.
Phase-4 scope decision: **keep as scoped runtime surface (a)** — the shell is
the intentional composition boundary for the dashboard AND settings surfaces
(who mount the shell), matching owner direction to preserve intentional surface
differences; no promotion to `:root` (each surface selects its own palette via
`getDashboardThemeCssVars`, so values are NOT globally identical).

| role | canonical var | runtime value | tailwind alias(es) | defining file(s) | status | note |
| --- | --- | --- | --- | --- | --- | --- |
| dashboard-primary | `--dashboard-primary` | `#8b5cf6` | none (`var(--dashboard-primary)` in shell classes + consumers) | app/globals.css `.dashboard-theme-shell` | conflict | **C-11 (corrected Phase 4)**: consumed at components/settings/enhanced-settings-router.tsx:478,620,632 under `/settings` — previously recorded "unset there"; re-verified IN-SCOPE because the settings surface re-mounts `.dashboard-theme-shell` via `SettingsThemeShell` (same inline vars). Recorded as intentional composition, NOT a runtime gap |
| dashboard-secondary | `--dashboard-secondary` | `#7c3aed` | none | app/globals.css `.dashboard-theme-shell` | live | |
| dashboard-accent | `--dashboard-accent` | `#a78bfa` | none | app/globals.css `.dashboard-theme-shell` | live | |
| dashboard-bg-from | `--dashboard-bg-from` | `#0f172a` | none | app/globals.css `.dashboard-theme-shell` | live | |
| dashboard-bg-via | `--dashboard-bg-via` | `#581c87` | none | app/globals.css `.dashboard-theme-shell` | live | |
| dashboard-bg-to | `--dashboard-bg-to` | `#0f172a` | none | app/globals.css `.dashboard-theme-shell` | live | |
| dashboard-glow-a | `--dashboard-glow-a` | `#a855f7` | none | app/globals.css `.dashboard-theme-shell` | live | |
| dashboard-glow-b | `--dashboard-glow-b` | `#3b82f6` | none | app/globals.css `.dashboard-theme-shell` | live | |
| dashboard-glow-c | `--dashboard-glow-c` | `#6366f1` | none | app/globals.css `.dashboard-theme-shell` | live | |
| dashboard-cta-from | `--dashboard-cta-from` | `#9333ea` | none | app/globals.css `.dashboard-theme-shell` | live | |
| dashboard-cta-to | `--dashboard-cta-to` | `#2563eb` | none | app/globals.css `.dashboard-theme-shell` | live | |
| dashboard-text-from | `--dashboard-text-from` | `#e9d5ff` | none | app/globals.css `.dashboard-theme-shell` | live | |
| dashboard-text-to | `--dashboard-text-to` | `#bfdbfe` | none | app/globals.css `.dashboard-theme-shell` | live | |
| dashboard-foreground | `--dashboard-foreground` | `#f8fafc` | none | app/globals.css `.dashboard-theme-shell` | live | also drives light-variant text remaps |
| dashboard-muted | `--dashboard-muted` | `#94a3b8` | none | app/globals.css `.dashboard-theme-shell` | live | |
| dashboard-surface | `--dashboard-surface` | `#ffffff` | none | app/globals.css `.dashboard-theme-shell[data-dashboard-theme-light='true']` | live | light variant |
| dashboard-surface-muted | `--dashboard-surface-muted` | `#f3efe8` | none | app/globals.css light variant | live | light variant |
| dashboard-border | `--dashboard-border` | `rgb(28 25 23 / 0.14)` | none | app/globals.css light variant | live | light variant |
| dashboard-border-strong | `--dashboard-border-strong` | `rgb(28 25 23 / 0.28)` | none | app/globals.css light variant | live | light variant |

## Table F — Staff scope remaps (`.staff-scheduling-prototype`)

Defining file: `app/globals.css` `.staff-scheduling-prototype` (current lines
240–298; line refs refreshed Phase 4).
Scope anchors: `components/admin/staff-scheduling-tab.tsx:162`,
`components/admin/admin-calendar-view.tsx:643`,
`components/admin/calendar-day-sheet.tsx:428`. 18 rows. Status: `live` —
deliberate dark-first remap of the global semantic names; **no `--destructive`
in this scope** (staff inherits the global one). These are scoped shadows of the
Table A roles, not separate roles; rows kept for migration authority.

| role | canonical var | runtime value (staff scope) | tailwind alias(es) | defining file(s) | status | note |
| --- | --- | --- | --- | --- | --- | --- |
| background | `--background` | `232 39% 10%` | `bg-background` | app/globals.css `.staff-scheduling-prototype` | live | shadows Table A row |
| foreground | `--foreground` | `270 50% 97%` | `text-foreground` | app/globals.css staff scope | live | |
| card | `--card` | `230 34% 13%` | `bg-card` | app/globals.css staff scope | live | |
| card-foreground | `--card-foreground` | `270 50% 97%` | `text-card-foreground` | app/globals.css staff scope | live | |
| popover | `--popover` | `230 34% 13%` | `bg-popover` | app/globals.css staff scope | live | |
| popover-foreground | `--popover-foreground` | `270 50% 97%` | `text-popover-foreground` | app/globals.css staff scope | live | |
| primary | `--primary` | `279 87% 64%` | `bg-primary text-primary` | app/globals.css staff scope | live | |
| primary-foreground | `--primary-foreground` | `270 50% 99%` | `text-primary-foreground` | app/globals.css staff scope | live | |
| secondary | `--secondary` | `229 27% 21%` | `bg-secondary` | app/globals.css staff scope | live | |
| secondary-foreground | `--secondary-foreground` | `270 50% 97%` | `text-secondary-foreground` | app/globals.css staff scope | live | |
| muted | `--muted` | `229 27% 19%` | `bg-muted` | app/globals.css staff scope | live | |
| muted-foreground | `--muted-foreground` | `260 16% 70%` | `text-muted-foreground` | app/globals.css staff scope | live | |
| accent | `--accent` | `275 41% 25%` | `bg-accent` | app/globals.css staff scope | live | |
| accent-foreground | `--accent-foreground` | `270 50% 97%` | `text-accent-foreground` | app/globals.css staff scope | live | |
| border | `--border` | `0 0% 100% / 0.1` | `border-border` | app/globals.css staff scope | live | |
| input | `--input` | `0 0% 100% / 0.14` | `border-input` | app/globals.css staff scope | live | |
| ring | `--ring` | `279 87% 64%` | `ring-ring` | app/globals.css staff scope | live | |
| destructive-foreground | `--destructive-foreground` | `270 50% 99%` | `text-destructive-foreground` | app/globals.css staff scope | live | only destructive remap; `--destructive` inherited |

## Table G — Neon roles (staff scope)

Defining file: `app/globals.css` `.staff-scheduling-prototype` (neon triplets
current lines 261–266, composites 267–272; line refs refreshed Phase 4).
12 rows. The 6 `--neon-*-rgb` triplets are consumed by the Tailwind `neon-*`
aliases; **no `:root` fallback exists** — any consumer outside the three scope
anchors silently loses styling (**C-02**). The 6 `--neon-*` composite vars have
zero consumers (dead).
**Phase-4 scope decision (2026-09-13):**
- Triplets → **keep as scoped runtime surface (a)**. Re-verified: all 26 neon
  consumer files render under the scope anchors (fresh rg; anchors now recorded
  at 4 sites: staff-scheduling-tab.tsx:162, admin-calendar-view.tsx:643 AND
  :862 subscribe-panel, calendar-day-sheet.tsx:428). NOT promoted to `:root`:
  zero cross-scope usage and the staff-scope values are a deliberate surface
  theme (owner direction preserves intentional surface differences); a `:root`
  copy would be a today-no-op unreviewed new global surface. C-02 stays
  recorded with the owner-facing note below.
- Composites → **REMOVED (retired) by Phase 5 (2026-09-13)**. Negative rg
  re-proven (zero `var(--neon-*)` composite references across all file types;
  the `--color-neon-*` map and Tailwind aliases reference the triplets
  directly). The 6 declarations were physically deleted from
  `app/globals.css`; the triplets and their aliases are intact (C-02 owner
  notes unchanged).

| role | canonical var | runtime value | tailwind alias(es) | defining file(s) | status | note |
| --- | --- | --- | --- | --- | --- | --- |
| neon-purple | `--neon-purple-rgb` | `180 92 255` | `neon-purple` (`rgb(var(--neon-purple-rgb) / <alpha-value>)`) | app/globals.css staff scope | conflict | C-02: no `:root` fallback; all consumers in-scope — **owner note (Phase 4): intentional staff-surface theme; promote to `:root` only via an explicit owner-approved neon layer** |
| neon-pink | `--neon-pink-rgb` | `242 92 191` | `neon-pink` | app/globals.css staff scope | conflict | C-02 (owner note as above) |
| neon-cyan | `--neon-cyan-rgb` | `98 212 239` | `neon-cyan` | app/globals.css staff scope | conflict | C-02; overlaps `--admin-accent` (6 182 212) — D-01; owner note as above |
| neon-amber | `--neon-amber-rgb` | `247 200 79` | `neon-amber` | app/globals.css staff scope | conflict | C-02 (owner note as above) |
| neon-green | `--neon-green-rgb` | `91 234 155` | `neon-green` | app/globals.css staff scope | conflict | C-02 (owner note as above) |
| neon-red | `--neon-red-rgb` | `242 96 114` | `neon-red` | app/globals.css staff scope | conflict | C-02 (owner note as above) |
| neon-purple-composite | `--neon-purple` | `rgb(var(--neon-purple-rgb))` | none | ~~app/globals.css staff scope~~ | removed | REMOVED Phase 5 (zero `var(--neon-purple)` references re-proven by negative rg; definition deleted; triplet + alias intact) |
| neon-pink-composite | `--neon-pink` | `rgb(var(--neon-pink-rgb))` | none | idem | removed | REMOVED Phase 5 |
| neon-cyan-composite | `--neon-cyan` | `rgb(var(--neon-cyan-rgb))` | none | idem | removed | REMOVED Phase 5 |
| neon-amber-composite | `--neon-amber` | `rgb(var(--neon-amber-rgb))` | none | idem | removed | REMOVED Phase 5 |
| neon-green-composite | `--neon-green` | `rgb(var(--neon-green-rgb))` | none | idem | removed | REMOVED Phase 5 |
| neon-red-composite | `--neon-red` | `rgb(var(--neon-red-rgb))` | none | idem | removed | REMOVED Phase 5 |

## Table H — `--color-*` v4-style map (staff scope)

Defining file: `app/globals.css` `.staff-scheduling-prototype` (lines 248–270).
23 rows. This is a Tailwind-v4 convention in a v3 app; only 8 rows are consumed
(in-scope, via arbitrary values); 15 rows are dead. **Correction to stage-1
inventory**: 17 `--color-*` rows are *not* all dead — `--color-primary` and
`--color-ring` are consumed in-scope, so the dead count is 15 of the 17
semantic map, plus 0 of the 6 neon (all live).

| role | canonical var | runtime value | tailwind alias(es) | defining file(s) | status | note |
| --- | --- | --- | --- | --- | --- | --- |
| color-background | `--color-background` | `hsl(var(--background))` | none (v4 convention) | app/globals.css staff scope | dead | 0 consumers |
| color-foreground | `--color-foreground` | `hsl(var(--foreground))` | none | app/globals.css staff scope | dead | 0 consumers |
| color-card | `--color-card` | `hsl(var(--card))` | none | app/globals.css staff scope | dead | 0 consumers |
| color-card-foreground | `--color-card-foreground` | `hsl(var(--card-foreground))` | none | app/globals.css staff scope | dead | 0 consumers |
| color-popover | `--color-popover` | `hsl(var(--popover))` | none | app/globals.css staff scope | dead | 0 consumers |
| color-popover-foreground | `--color-popover-foreground` | `hsl(var(--popover-foreground))` | none | app/globals.css staff scope | dead | 0 consumers |
| color-primary | `--color-primary` | `hsl(var(--primary))` | `shadow-[...var(--color-primary)]` arbitrary values | app/globals.css staff scope | live | in-scope consumers: calendar-day-sheet.tsx:493, scheduling-shift-card.tsx:31 |
| color-primary-foreground | `--color-primary-foreground` | `hsl(var(--primary-foreground))` | none | app/globals.css staff scope | dead | 0 consumers |
| color-secondary | `--color-secondary` | `hsl(var(--secondary))` | none | app/globals.css staff scope | dead | 0 consumers |
| color-secondary-foreground | `--color-secondary-foreground` | `hsl(var(--secondary-foreground))` | none | app/globals.css staff scope | dead | 0 consumers |
| color-muted | `--color-muted` | `hsl(var(--muted))` | none | app/globals.css staff scope | dead | 0 consumers |
| color-muted-foreground | `--color-muted-foreground` | `hsl(var(--muted-foreground))` | none | app/globals.css staff scope | dead | 0 consumers |
| color-accent | `--color-accent` | `hsl(var(--accent))` | none | app/globals.css staff scope | dead | 0 consumers |
| color-accent-foreground | `--color-accent-foreground` | `hsl(var(--accent-foreground))` | none | app/globals.css staff scope | dead | 0 consumers |
| color-border | `--color-border` | `hsl(var(--border))` | none | app/globals.css staff scope | dead | 0 consumers (chart.tsx `--color-border` is an inline recharts prop, not this var — see note below) |
| color-input | `--color-input` | `hsl(var(--input))` | none | app/globals.css staff scope | dead | 0 consumers |
| color-ring | `--color-ring` | `hsl(var(--ring))` | `shadow-[...var(--color-ring)]` arbitrary values | app/globals.css staff scope | live | in-scope consumers: calendar-day-sheet.tsx:493, scheduling-shift-card.tsx:31 |
| color-neon-purple | `--color-neon-purple` | `rgb(var(--neon-purple-rgb))` | `shadow-[...var(--color-neon-purple)]` | app/globals.css staff scope | live | in-scope: staff-scheduling-tab.tsx:429, calendar-day-sheet.tsx:693,702, admin-calendar-view.tsx:661 |
| color-neon-pink | `--color-neon-pink` | `rgb(var(--neon-pink-rgb))` | none (no consumer found) | app/globals.css staff scope | dead | 0 consumers |
| color-neon-cyan | `--color-neon-cyan` | `rgb(var(--neon-cyan-rgb))` | `shadow-[...var(--color-neon-cyan)]` | app/globals.css staff scope | live | in-scope: scheduling-overview-cards.tsx:53 |
| color-neon-amber | `--color-neon-amber` | `rgb(var(--neon-amber-rgb))` | `shadow-[...var(--color-neon-amber)]` | app/globals.css staff scope | live | in-scope: scheduling-overview-cards.tsx:69 |
| color-neon-green | `--color-neon-green` | `rgb(var(--neon-green-rgb))` | `shadow-[...var(--color-neon-green)]` | app/globals.css staff scope | live | in-scope: scheduling-overview-cards.tsx:45 |
| color-neon-red | `--color-neon-red` | `rgb(var(--neon-red-rgb))` | `shadow-[...var(--color-neon-red)]` | app/globals.css staff scope | live | in-scope: scheduling-overview-cards.tsx:61 |

Disambiguation: `components/ui/chart.tsx:211,223` (and venue twin) set an
**inline, element-scoped** `--color-border` / `--color-bg` custom property via
recharts `CSSProperties` (the shadcn chart wrapper convention). Those are not
references to the staff-scope `--color-border` v4-map row above; a future sweep
must exclude inline `style={{ "--color-*": ... }}` props.

## Table I — Dead-root-only tokens

Defining files: the four un-imported CSS roots
`app/venue/globals.css`, `app/admin/dashboard/components/styles/globals.css`,
`styles/globals.css`, `styles/venue/globals.css` (zero importers, verified
Phase 2 by rg). 14 rows originally; **amended by DESIGN-032**: the 8
`--sidebar-*` and 5 `--chart-*` roles now ALSO carry runtime truth at
`app/globals.css :root` (dark values; the app is dark-first) and are marked
`live` with their authored light values recorded — the dead-root copies
remain unchanged as authored provenance for the Phase-5 cleanup. Only the
`--radius` row is still `dead`-only (C-03 gate unchanged). **C-10 sidebar gap
resolved** — see DESIGN-032 notes below.
**PHASE 5 (2026-09-13): the four dead roots were REMOVED** (C-10 executed;
per-root zero-use registers + zero-delta compare points in the Phase-5
execution notes §5a–5c; 431 lines deleted). Runtime truth for all 13
sidebar/chart roles remains at `app/globals.css :root` (DESIGN-032). The
authored light-scheme values are preserved as provenance in §5b (light
sidebar = the 2 light-capable roots; light chart = 3 roots; the Table A
semantic roles had light values authored in 3 roots across 2 families; no
light semantic remap ever loaded — C-04 open). The `--radius: 0.5rem`
declarations were removed with their roots (never loaded; C-03 gate
unchanged — staff 0.625rem is now the only `--radius` definition and the
app-wide state stays undefined → 0px corners).

| role | canonical var | runtime value | tailwind alias(es) | defining file(s) | status | note |
| --- | --- | --- | --- | --- | --- | --- |
| chart-1 | `--chart-1` | dark `220 70% 50%` (runtime at `:root`); light `12 76% 61%` (authored, inactive) | `chart-1` (`fill-chart-1` etc.) | app/globals.css `:root` (DESIGN-032); light authored in the 3 un-imported roots | live | 0 consumers anywhere (rg); projection registered for shadcn-chart adoption; no visual change |
| chart-2 | `--chart-2` | dark `160 60% 45%`; light `173 58% 39%` | `chart-2` | idem | live | 0 consumers |
| chart-3 | `--chart-3` | dark `30 80% 55%`; light `197 37% 24%` | `chart-3` | idem | live | 0 consumers |
| chart-4 | `--chart-4` | dark `280 65% 60%`; light `43 74% 66%` | `chart-4` | idem | live | 0 consumers |
| chart-5 | `--chart-5` | dark `340 75% 55%`; light `27 87% 67%` | `chart-5` | idem | live | 0 consumers |
| sidebar-background | `--sidebar-background` | dark `240 5.9% 10%` (runtime at `:root`); light `0 0% 98%` (authored, inactive) | `bg-sidebar` | app/globals.css `:root` (DESIGN-032); light authored in the 2 light-capable un-imported roots | live | consumed by components/ui/sidebar.tsx:144,184,201,251,306 — NOW generates; previously a silent no-op |
| sidebar-foreground | `--sidebar-foreground` | dark `240 4.8% 95.9%`; light `240 5.3% 26.1%` | `text-sidebar-foreground` (incl. `/70`) | idem | live | consumed by sidebar.tsx (10+ sites); NOW generates |
| sidebar-primary | `--sidebar-primary` | dark `224.3 76.3% 48%`; light `240 5.9% 10%` | `bg-sidebar-primary` (family-complete, projected) | idem | live | 0 class consumers today; projected for the authored family |
| sidebar-primary-foreground | `--sidebar-primary-foreground` | dark `0 0% 100%`; light `0 0% 98%` | `text-sidebar-primary-foreground` | idem | live | 0 class consumers today |
| sidebar-accent | `--sidebar-accent` | dark `240 3.7% 15.9%`; light `240 4.8% 95.9%` | `bg-sidebar-accent`; direct `hsl(var(--sidebar-accent))` in hover shadow (sidebar.tsx:521) | idem | live | consumed by sidebar.tsx (hover/active/data-active); NOW generates |
| sidebar-accent-foreground | `--sidebar-accent-foreground` | dark `240 4.8% 95.9%`; light `240 5.9% 10%` | `text-sidebar-accent-foreground` | idem | live | consumed by sidebar.tsx (hover/active/data-active); NOW generates |
| sidebar-border | `--sidebar-border` | dark `240 3.7% 15.9%`; light `220 13% 91%` | `border-sidebar-border`, `bg-sidebar-border`; direct `hsl(var(--sidebar-border))` in outline shadow (sidebar.tsx:521) | idem | live | consumed by sidebar.tsx:303,391,521,693; NOW generates |
| sidebar-ring | `--sidebar-ring` | dark `217.2 91.2% 59.8%` (both variants share this value) | `ring-sidebar-ring` | idem | live | consumed by sidebar.tsx (focus-visible rings); NOW generates |
| dead-root radius | `--radius` | `0.5rem` (authored in all 4 dead roots; different from staff `0.625rem`) | via rounded-lg/md/sm (never loaded) | ~~4 dead roots~~ **REMOVED Phase 5** | dead | authored 0.5rem provenance preserved (§5b); never participated in the cascade; C-03 gate unchanged — staff 0.625rem is the only remaining definition; app-wide still undefined → 0px corners |

## Table J — theme.ts parallel TS palette (non-runtime)

Defining file: `lib/design-system/theme.ts`. The `tourifyTheme` object has zero
dereferences (imported only by `components/layout/app-layout.tsx`, unused there);
the live surface is `themeUtils.getRoleClasses`/`getStatusClasses` (hardcoded
Tailwind class strings). 7 rows. Status: `dead` palette; `conflict` where it
diverges from CSS truth.

| role | canonical var | value (TS) | tailwind alias(es) | defining file(s) | status | note |
| --- | --- | --- | --- | --- | --- | --- |
| theme.primary | none (TS only) | `#0ea5e9` sky-blue-500 | none | lib/design-system/theme.ts | conflict | C-01: divergent from CSS `--primary` #7c3aed |
| theme.secondary | none | `#d946ef` fuchsia-500 | none | lib/design-system/theme.ts | conflict | C-01: divergent from CSS `--secondary` |
| theme.success | none | `#22c55e` | none | lib/design-system/theme.ts | duplicate | matches `--admin-success` (34 197 94) |
| theme.error/warning/neutral | none | tailwind-palette scales | none | lib/design-system/theme.ts | dead | parallel language; no CSS counterpart |
| theme.dark | none | slate-900..600 hex | none | lib/design-system/theme.ts | dead | parallel language |
| theme.roles (9) | none | role hexes | none | lib/design-system/theme.ts | dead | consumed only by dead `getRoleColor` |
| componentVariants | none | button/card/status class strings incl. `bg-primary-600`, `bg-secondary-600` (not in config) | none | lib/design-system/theme.ts | dead | C-07: references class names the real Tailwind config does not define |

## Table K — Tailwind projection aliases (projection of the above roles)

Defining file: `tailwind.config.ts`. 41 projections (38 color alias names +
3 radius aliases); DESIGN-032 added the 8 `sidebar-*` + 5 `chart-*` aliases.
`app/admin/dashboard/components/tailwind.config.js` is dead
(zero importers; create-next-app residue).

| tailwind alias | projection | targets var | var's truth (Table) | status |
| --- | --- | --- | --- | --- |
| `border` | `hsl(var(--border))` | `--border` | A live (staff remap F) | live |
| `input` | `hsl(var(--input))` | `--input` | A live (F) | live |
| `ring` | `hsl(var(--ring))` | `--ring` | A live (F) | conflict (C-06 dashboard shell override) |
| `background` | `hsl(var(--background))` | `--background` | A live (F) | live |
| `foreground` | `hsl(var(--foreground))` | `--foreground` | A live (F) | live |
| `primary` | `hsl(var(--primary))` | `--primary` | A live (F) | conflict (C-01, C-06) |
| `primary-foreground` | `hsl(var(--primary-foreground))` | `--primary-foreground` | A live (F) | live |
| `secondary(/-foreground)` | `hsl(var(--secondary[-foreground]))` | idem | A live (F) | conflict (C-01) |
| `destructive(/-foreground)` | `hsl(var(--destructive[-foreground]))` | idem | A live (F) | live |
| `muted(/-foreground)` | `hsl(var(--muted[-foreground]))` | idem | A live (F) | live |
| `accent(/-foreground)` | `hsl(var(--accent[-foreground]))` | idem | A live (F) | live |
| `popover(/-foreground)` | `hsl(var(--popover[-foreground]))` | idem | A live (F) | live |
| `card(/-foreground)` | `hsl(var(--card[-foreground]))` | idem | A live (F) | live |
| `neon-purple/pink/cyan/amber/green/red` | `rgb(var(--neon-*-rgb) / <alpha-value>)` | `--neon-*-rgb` | G (staff scope only) | conflict (C-02 resolved Phase 4 as intended staff-surface scope: keep scoped, owner note; NO `:root` promotion — all 26 consumers in-scope) |
| `rounded-lg` | `var(--radius)` | `--radius` | C live (`:root` 0.5rem, DESIGN-033) | live | C-03 APPLIED 2026-09-13 — resolves `0.5rem` (8px) |
| `rounded-md` | `calc(var(--radius) - 2px)` | `--radius` | C live (`:root` 0.5rem, DESIGN-033) | live | C-03 APPLIED 2026-09-13 — resolves `0.375rem` (6px) |
| `rounded-sm` | `calc(var(--radius) - 4px)` | `--radius` | C live (`:root` 0.5rem, DESIGN-033) | live | C-03 APPLIED 2026-09-13 — resolves `0.25rem` (4px) |
| `sidebar` (bg/`DEFAULT`) | `hsl(var(--sidebar-background))` | `--sidebar-background` | I live (`:root` dark, DESIGN-032) | live | added DESIGN-032 |
| `sidebar-foreground` | `hsl(var(--sidebar-foreground))` | `--sidebar-foreground` | idem | live | added DESIGN-032; `/70` opacity modifier via color-mix (Tailwind 3.4), same pattern as `border-border/50` |
| `sidebar-primary` | `hsl(var(--sidebar-primary))` | `--sidebar-primary` | idem | live | family-complete; 0 consumers |
| `sidebar-primary-foreground` | `hsl(var(--sidebar-primary-foreground))` | `--sidebar-primary-foreground` | idem | live | family-complete; 0 consumers |
| `sidebar-accent` | `hsl(var(--sidebar-accent))` | `--sidebar-accent` | idem | live | added DESIGN-032 |
| `sidebar-accent-foreground` | `hsl(var(--sidebar-accent-foreground))` | `--sidebar-accent-foreground` | idem | live | added DESIGN-032 |
| `sidebar-border` | `hsl(var(--sidebar-border))` | `--sidebar-border` | idem | live | added DESIGN-032 |
| `sidebar-ring` | `hsl(var(--sidebar-ring))` | `--sidebar-ring` | idem | live | added DESIGN-032 |
| `chart-1` | `hsl(var(--chart-1))` | `--chart-1` | I live (`:root`, zero consumers) | live | added DESIGN-032 |
| `chart-2` | `hsl(var(--chart-2))` | `--chart-2` | idem | live | added DESIGN-032 |
| `chart-3` | `hsl(var(--chart-3))` | `--chart-3` | idem | live | added DESIGN-032 |
| `chart-4` | `hsl(var(--chart-4))` | `--chart-4` | idem | live | added DESIGN-032 |
| `chart-5` | `hsl(var(--chart-5))` | `--chart-5` | idem | live | added DESIGN-032 |

Non-token literal projections (unbound to CSS vars, noted for future phases):
`boxShadow` glow-* hexes + 3xl/4xl, `backgroundImage`, `backdropBlur.xs`,
`fontSize` 10xl–12xl, `spacing` 128/144, `transitionDuration/Delay` 2000/3000/4000,
16 keyframes, 16 animations, 7 data-* variants.

## Table L — ThemeProvider composition contract (DESIGN-030 Phase 3, 2026-09-11)

One row per provider file: file | wraps-which-subtree (mount) | tokens/attributes it
sets | live/dead status. Created in Phase 3 after per-provider re-validation (rg
importers + symbol usage). After this phase the repository holds **3 live provider
mechanism files** (one per subtree) and **zero dead provider files**.

| # | file | wraps-which-subtree (mount) | tokens / attributes it sets | status |
| --- | --- | --- | --- | --- |
| 1 | `hooks/use-theme.tsx` (`ThemeProvider`, `useTheme`) | **ALL routes** — `app/layout.tsx` root (`defaultTheme="dark"`), outermost provider | `<html>` classList `light`/`dark`; `localStorage["theme"]`; custom React context | **live** (root) |
| 2 | `components/theme-provider.tsx` (next-themes 0.2.1 wrapper) | **Venue subtree only** — `app/venue/providers.tsx` ← `app/venue/layout.tsx` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`; localStorage key = next-themes default `"theme"`, same key as #1) | `<html>` classList `light`/`dark` (same localStorage key as #1); `style.colorScheme`; next-themes FOUC head script; next-themes context | **live** (venue surface) |
| 3 | `components/dashboard/dashboard-theme-provider.tsx` (`DashboardThemeProvider`, `useDashboardTheme`) | **`/dashboard/**` only** — `app/dashboard/layout.tsx` | Renders `.dashboard-theme-shell` div with inline CSS vars via `getDashboardThemeCssVars` — 15 `--dashboard-*` + `--primary` + `--ring` (lib/dashboard/dashboard-themes.ts:356-378, `--primary`/`--ring` at 375-376, confirmed 2026-09-13); the 4 light-surface vars (`--dashboard-surface`, `--dashboard-surface-muted`, `--dashboard-border`, `--dashboard-border-strong`) resolve from `app/globals.css` `.dashboard-theme-shell[data-dashboard-theme-light='true']`, keyed by the provider's `data-dashboard-theme-light` attribute — changes `bg-primary`/`text-primary`/`ring-*` resolution inside the shell | **live** (dashboard surface) |
| 4 | `components/venue/theme-provider.tsx` (next-themes wrapper) | — | (never mounted) | **dead → DELETED** Phase 3; zero importers |
| 5 | `app/venue/components/theme-provider.tsx` (next-themes wrapper) | — | (never mounted) | **dead → DELETED** Phase 3; zero importers |
| 6 | `app/admin/dashboard/components/theme-provider.tsx` (next-themes wrapper) | — | (never mounted) | **dead → DELETED** Phase 3; zero importers |
| 7 | `app/providers.tsx` (`Providers` = next-themes ThemeProvider + Auth + Social) | — | (never mounted) | **dead → DELETED** Phase 3; zero importers + zero symbol usage |

Adjacent theme files observed during the Phase-3 sweep (not providers; out of phase
scope, noted for the owning lanes):
- `hooks/venue/use-theme.ts` — a venue-domain `useTheme` fork (localStorage
  `"theme"`, applies `.dark` class only). **Zero importers** (rg, all spellings).
  Venue-lane cleanup candidate; same pattern as the DESIGN-031 use-mobile shims.
- `components/ui/sonner.tsx` — next-themes `useTheme` → Sonner Toaster wrapper.
  **Zero importers** (the root layout imports `Toaster` from `sonner` directly;
  `components/ui/toaster.tsx` uses the shadcn `useToast`, not next-themes).
  Outside-provider next-themes `useTheme` resolves to next-themes' default context
  (`{ theme: undefined, setTheme: noop }`), i.e. `theme="system"` in the wrapper.

**Six-provider discrepancy resolution (from the inventory §4):** the DESIGN-030 goal
text said "the five ThemeProvider variants"; the stage-1 survey found **six**
ThemeProvider component implementations — 5 under `app/` + `components/`
(`components/theme-provider.tsx`, `components/dashboard/dashboard-theme-provider.tsx`,
`components/venue/theme-provider.tsx`, `app/venue/components/theme-provider.tsx`,
`app/admin/dashboard/components/theme-provider.tsx`) plus 1 under `hooks/`
(`hooks/use-theme.tsx`) — and additionally `app/providers.tsx`, a `Providers`
wrapper that *composes* the next-themes `ThemeProvider` with Auth + Social (not a
seventh ThemeProvider implementation). All 7 files are audited above (rows 1–7).

**C-06 resolution — composition contract, NOT a merge.** The three live providers
each wrap a **disjoint** subtree (root = all routes; venue = `/venue/**`;
dashboard = `/dashboard/**`) and each writes a **disjoint** token surface (row 1:
html class + localStorage; row 2: html class + `style.colorScheme` + FOUC script;
row 3: shell-scoped inline CSS vars incl. `--primary`/`--ring`). Merging any pair
is **not provably zero-delta**: removing the root provider drops class application
for admin/artist/main routes; removing the venue wrapper drops `style.colorScheme`
+ the next-themes FOUC script inside `/venue/**`; removing the dashboard provider
drops the shell vars + `--primary`/`--ring` overrides inside `/dashboard/**`.
Per owner direction (`OWNER_DECISIONS_2026-09-10.md` Design Q8-B) the shared
design-system boundary stays distinct from venue domain behavior, and intentional
surface differences (venue theme, dashboard overrides) are preserved. The contract
above is the target state for Phase 3; future consolidation must pass per-surface
zero-visual-regression evidence first.

Register rows for rows 4–7 were set `retired` in
`CANONICAL_COMPONENT_REGISTER.csv` (2026-09-11, DESIGN-030 Phase 3) and the files
deleted. `next-themes` remains a dependency (used by live row 2); no package change.

---

## Phase-2 execution notes (DESIGN-030, 2026-09-11)

### 2a. `:root` baseline additions — NONE applied (radius deferred)

> **SUPERSEDED 2026-09-13 (DESIGN-033):** the deferred `--radius` addition was
> **APPLIED after owner approval** of the app-wide delta (Table C + §6). The
> identity proof below is historical record — the change is no longer blocked.

The only candidate token for a Phase-2 `:root` addition is `--radius`. Identity
proof (extra credit, per alias — current vs proposed resolved value):

| alias | current resolved (`:root`/app-wide) | current resolved (staff scope) | proposed with `--radius: 0.5rem` at `:root` | identity? |
| --- | --- | --- | --- | --- |
| `rounded-lg` | `var(--radius)` undefined → invalid at computed-value time → **0** | `0.625rem` (10px) | `0.5rem` (8px) | **NO** |
| `rounded-md` | `calc(var(--radius) - 2px)` undefined → **0** | `0.5rem` (8px) | `calc(0.5rem - 2px)` = `0.375rem` (6px) | **NO** |
| `rounded-sm` | `calc(var(--radius) - 4px)` undefined → **0** | `0.375rem` (6px) | `calc(0.5rem - 4px)` = `0.25rem` (4px) | **NO** |

Consumers affected app-wide: `rounded-lg` 1500, `rounded-md` 966, `rounded-sm`
602 utility occurrences across **923 files** (rg count, components+app). Because
`tailwind.config.ts` `extend.borderRadius` **replaces** (deep-merge) the default
scale for `sm/md/lg`, these aliases do **not** resolve via Tailwind's default
scale (`md 0.375rem`, `lg 0.5rem` in the installed v3 config) — they resolve
against `--radius`, which is undefined at `:root`. Adding `--radius: 0.5rem`
therefore changes every such corner from 0 to 8/6/4px: **not provably
zero-regression.**

Decision: **DEFER `--radius` at `:root` to Phase 3+ with an explicit
visual-review gate** (rounded corners 0 → 8/6/4px app-wide after the change;
owner reviews per-surface screenshots; staff scope unaffected because its own
`0.625rem` wins by cascade). No other token is a candidate: all 19 semantic
roles + 3 legacy rgb already hold `:root` truth (identity held); neon,
`--dashboard-*`, the global form override, and `.dark` handling are explicitly
out of scope for additions (Phases 4–5).

### 2b. Dead-root removals — ALL deferred (evidence)

rg proofs (Phase 2, read-only):
- Zero importers of each of the four paths (fixed-string rg across all file
  types excluding node_modules/.git/docs; paths include alias/relative
  spellings: `styles/globals.css` appears in `@/styles/globals.css` and
  `../styles/globals.css`): `app/venue/globals.css`,
  `app/admin/dashboard/components/styles/globals.css`, `styles/globals.css`,
  `styles/venue/globals.css` — all **no importer**.
- Broad `globals.css` sweep: only `app/layout.tsx` (app/globals.css),
  `app/admin/layout.tsx` (admin), `app/artist/layout.tsx` (artist) import
  globals; `components.json` references `app/globals.css` (shadcn config).
- No `@import` chains in any CSS; no extra CSS registration in
  `next.config.ts` / `postcss.config.mjs`.
- Shared classes each dead root defines are duplicated in live
  `app/globals.css` (`.glow-effect`, `.card-hover`, `.text-balance`,
  `.typing-dot`, `.scrollbar-hide`, `.animate-scan` — all present live), so
  deleting loses no class definition.

BUT removal is **not clean** under the strict rule: `--sidebar-*`
(`--sidebar-background/foreground/accent/accent-foreground/border` 5 of 8) is
referenced by the live `components/ui/sidebar.tsx` (lines 184, 201, 227, 521),
and the four dead roots are its **only** definitions in the repo; `--chart-*`
has zero references but only dead-file definitions. Deleting the dead files
would formalize an already-broken silent no-op without resolving the sidebar
primitive (which also uses `bg-sidebar*` classes absent from
`tailwind.config.ts` → those utilities are never generated).

Decision: **defer all four removals to a dedicated Phase-5 cleanup checkpoint
(C-10) with per-root zero-use register entries**, and resolve the sidebar-token
gap (`--sidebar-*` + `bg-sidebar*` classes) in that same phase or a
sidebar-primitive adoption task. `styles/globals.css` additionally carries the
D-02 duplicate form override; both resolve under Phase 5. Recording the gates
instead of removing keeps Phase 2 at zero visual risk.

### 2c. Corrections recorded against the stage-1 inventory survey

1. `--color-*` dead count: stage-1 said 17 `--color-background…--color-input`
   rows are dead; re-audit shows `--color-primary` and `--color-ring` are
   consumed in-scope (calendar-day-sheet.tsx:493, scheduling-shift-card.tsx:31)
   → **15 dead + 2 live** of the 17 semantic map (all 6 `--color-neon-*` live).
2. `chart.tsx` `--color-border`/`--color-bg` are inline recharts props
   (`style={{ "--color-border": … }}`), not v4-map consumers (disambiguation
   note under Table H).
3. Tailwind projection key count: 25 color alias names + 3 radius aliases =
   28 projections (stage-1 "27 color alias keys" counted the
   `{DEFAULT, foreground}` object differently; Table K is authoritative).
4. Radius default-scale reference confirmed from the installed package:
   `sm 0.125rem`, `md 0.375rem`, `lg 0.5rem` — the projection-based identity
   proof in 2a is the operative one because the config overrides these keys.

## Phase-3 execution notes (DESIGN-030, executed 2026-09-11, finalized 2026-09-13)

Per-provider re-validation (fresh rg on 2026-09-13 against the dirty tree at
`7cf660ad`; command evidence in the DESIGN-030 task record):

| # | provider file | importers / symbol usage (2026-09-13 rg) | provides | live/dead |
| --- | --- | --- | --- | --- |
| 1 | `hooks/use-theme.tsx` | `ThemeProvider` ← `app/layout.tsx:4` (root layout, `defaultTheme="dark"`, wraps all routes); custom `useTheme` context consumed by `app/venue/components/theme-switcher.tsx:6`, `components/venue/venue/theme-switcher.tsx:6`, `app/venue/components/venue-header.tsx:13`, `components/venue/venue/venue-header.tsx:13` | `<html>` classList `light`/`dark`; `localStorage["theme"]`; custom React context | **live** (root) |
| 2 | `components/theme-provider.tsx` | sole importer `app/venue/providers.tsx:4` (← `app/venue/layout.tsx:6` `VenueProviders`) | next-themes wrapper for `/venue/**` | **live** (venue surface) |
| 3 | `components/dashboard/dashboard-theme-provider.tsx` | sole importer `app/dashboard/layout.tsx:1` (`<DashboardThemeProvider>` line 8); `useDashboardTheme` export has zero direct consumers (definition only: line 110) | `.dashboard-theme-shell` + inline vars (see Table L row 3) | **live** (dashboard surface) |
| 4 | `components/venue/theme-provider.tsx` | **zero** references to `components/venue/theme-provider` (rg, all file types) | — | **dead → DELETED** |
| 5 | `app/venue/components/theme-provider.tsx` | **zero** references to `app/venue/components/theme-provider` / `venue/components/theme-provider` (rg, all file types) | — | **dead → DELETED** |
| 6 | `app/admin/dashboard/components/theme-provider.tsx` | **zero** references to `admin/dashboard/components/theme-provider` (rg, all file types) | — | **dead → DELETED** |
| 7 | `app/providers.tsx` | **zero** module-path references (`@/providers`, `../providers`, `./providers`) and **zero** `Providers` symbol usage (rg, all file types; the only `Providers` hit is prose "Service Providers:" in `app/privacy/page.tsx`) | — | **dead → DELETED** |

Extra negative proofs (2026-09-13): no `theme-provider` reference in any
`index.ts`/`index.tsx` barrel; `next-themes` remains a dependency, imported only
by the live `components/theme-provider.tsx:2` (and by the zero-importer
`components/ui/sonner.tsx:3`); `hooks/venue/use-theme.ts` (venue-domain fork,
applies `.dark` class only) has zero importers — noted for the venue lane, NOT
touched (out of phase scope, matching the DESIGN-031 shim pattern).

Zero-delta compare points (deletion = zero rendered impact): the four removed
files (rows 4–7) were never imported by any consumer, so no consumer could have
rendered anything from them; the three live provider files were not edited, so
their rendered output (root html class + children; venue html class +
`style.colorScheme` + FOUC script; dashboard shell div + inline vars) is
byte-identical to the stage-1 baseline. No class string or CSS value changed
anywhere.

Consolidation decision (C-06): the three live providers were **NOT merged** —
each wraps a disjoint subtree (all routes / `/venue/**` / `/dashboard/**`) and
writes a disjoint token surface; merging any pair is not provably zero-delta.
The contract in Table L is the target state. Register rows 50, 159, 292, 1218 in
`CANONICAL_COMPONENT_REGISTER.csv` are `retired` with Phase-3 basis text; the
register file also carries another lane's concurrent edits and was preserved
unmodified. No package change (next-themes stays). C-04 (`.dark` no-op in the
main app) remains open; the C-03 `--radius` visual-review gate is carried
unchanged (NOT implemented in Phase 3).

## DESIGN-032 execution notes (sidebar/chart token gap, 2026-09-11)

Resolves C-10's sidebar side: **CSS variables = runtime truth, Tailwind =
projection, registry = authority**, additive-only.

### What was added
- **Runtime truth** (`app/globals.css :root`, inside the existing dark-first
  `:root` block): the 8 `--sidebar-*` and 5 `--chart-*` vars using the DARK
  authored values — byte-identical across all three dark sources
  (`styles/globals.css :root` and the `.dark` blocks of
  `app/admin/dashboard/components/styles/globals.css`,
  `styles/venue/globals.css`; light values identical across the two
  light-capable roots and remain authored-only in the un-imported files —
  the app has no light semantic remap; a future light-mode phase owns them).
- **Tailwind projection** (`tailwind.config.ts` `extend.colors`): `sidebar`
  family (`DEFAULT`→`--sidebar-background`, `foreground`, `primary`,
  `primary-foreground`, `accent`, `accent-foreground`, `border`, `ring`) and
  `chart` ramp (`1..5`). Shape driven by the live class tokens: the primitive
  uses `bg-sidebar` (DEFAULT), so the key is `DEFAULT`, not `background`.
- **Registry rows**: Table I sidebar/chart roles promoted `dead` → `live`
  (provenance recorded); Table K gained the 13 aliases (28 → 41 projections).

### Why no visual regression elsewhere
- Every class token (`bg-sidebar`, `text-sidebar-foreground[/70]`,
  `bg-sidebar-accent`, `text-sidebar-accent-foreground`,
  `border-sidebar-border`, `bg-sidebar-border`, `ring-sidebar-ring`) has
  consumers ONLY inside `components/ui/sidebar.tsx` (rg: 0 matches outside
  that file), so no pre-existing class string changes meaning.
- All 13 new color keys are brand-new top-level names (`sidebar`, `chart`);
  no collision with the pre-existing 18 keys (rg each against the config).
- `--chart-*` has 0 consumers and 0 generated-utility usage today; the chart
  aliases are registered for shadcn-chart adoption (`fill-chart-1` etc.).
- Opacity modifier precedent: `text-sidebar-foreground/70` follows the
  existing `border-border/50` / `stroke-border/50` pattern
  (Tailwind 3.4.17, color-mix).
- The 4 dead roots are UNCHANGED (Phase-5 cleanup owns removal; their copies
  of these vars are now provably redundant for the dark app and remain the
  authored light provenance).

### Provenance for the Phase-5 cleanup ticket
After DESIGN-032, deleting the four dead roots no longer loses the only
`--sidebar-*`/`--chart-*` definitions nor breaks the sidebar primitive: the
runtime definitions live at `app/globals.css :root` and the projections are
registered above. The remaining Phase-5 items are unchanged: `--radius`
dead values, D-02 form-override duplicate in `styles/globals.css`, and the
authored light chart/sidebar values (record them before deletion).

### Verification evidence (DESIGN-032 task record)
- class→key crossing matrix: all 8 sidebar class tokens resolve to
  `sidebar.*` keys; zero orphans.
- collision sweep: no pre-existing color key shadowed.
- negative rg: 0 new class/value consumers outside `components/ui/sidebar.tsx`.
- Tailwind build (scoped content: components/ui/sidebar.tsx +
  components/app-sidebar.tsx): `.bg-sidebar` etc. present in output CSS
  (was previously absent); `text-sidebar-foreground\/70` emits
  `hsl(var(--sidebar-foreground) / 0.7)` (Tailwind 3.4.17 alpha syntax —
  verified from generated CSS, not color-mix).
- eslint tailwind.config.ts: 0 errors; tsc scoped: 0 errors; git diff --check: clean.

## Phase-4 execution notes (DESIGN-030, 2026-09-13) — neon + dashboard/admin var scope

Phase 4 is a **decisions + registry phase with ZERO source-code changes**:
every token class below was re-verified with fresh rg evidence, assigned a
scope disposition per owner direction (Design Q2: CSS vars = runtime truth;
preserve intentional surface differences; independent surface themes
supported), and recorded. No provider file was restructured, no theme symbol
renamed, no class string or CSS value changed.

### 4a. Per-token-class scope decision table

| token class | count | defining file(s) | scope anchor(s) | live consumers | decision | rationale |
| --- | --- | --- | --- | --- | --- | --- |
| `--neon-*-rgb` triplets | 6 | app/globals.css `.staff-scheduling-prototype` (lines 261–266) | staff-scheduling-tab.tsx:162, admin-calendar-view.tsx:643 **and :862** (subscribe panel), calendar-day-sheet.tsx:428 | 6 Tailwind neon-* aliases + arbitrary-value shadow consumers; **26 consumer files**, all under `components/admin/**`, all in-scope (fresh rg 2026-09-13) | **(a) keep as scoped runtime surface** | C-02 — intentional staff-surface theme; zero cross-scope usage; `:root` copy would be a today-no-op, unreviewed global surface. Owner note recorded on each row (promote only via an explicit owner-approved neon layer). |
| `--neon-*` composites | 6 | app/globals.css `.staff-scheduling-prototype` (lines 267–272) | staff scope (never referenced) | **0** (negative rg: no `var(--neon-*)` composite ref outside the definition block; `--color-neon-*` map + aliases reference triplets directly) | **(c) recorded dead; retirement deferred to Phase 5** | physical removal is a zero-delta-able Phase-5 edit; harmless dead declarations today; deferred to keep this phase at zero source changes |
| `--dashboard-*` | 19 (15 base + 4 light) | app/globals.css `.dashboard-theme-shell` (77–94) + light block (97–102); inline values via `getDashboardThemeCssVars` (lib/dashboard/dashboard-themes.ts:356–378) | `/dashboard/**` (dashboard-theme-provider.tsx:99) + `/settings` (settings-theme-shell.tsx:28, mounted by enhanced-settings-router.tsx:212/222/245) | dashboard subtree (shell classes, provider) + enhanced-settings-router.tsx:478,620,632 (+ `__tests__/dashboard/dashboard-themes.test.ts:79` string key) | **(a) keep as scoped runtime surface** | shell is the intentional composition boundary for the dashboard AND settings surfaces; values are palette-selected per theme (`getDashboardThemeCssVars`), so `:root` promotion is not provably identical. **C-11 CORRECTED**: the settings consumers resolve — `SettingsThemeShell` re-mounts the shell with the same inline vars; previously recorded "unset there" was wrong. |
| `--admin-*` | 14 | app/admin/globals.css `:root` (lines 3–7), loaded by app/admin/layout.tsx (`/admin/**`) | `/admin/**` route scope | **0 external var() consumers**; `--admin-transition-normal` consumed only by its own file (.admin-metric-card:24, .admin-btn-futuristic:34) | **(a) keep as scoped runtime surface** → **SUPERSEDED (HF-DESIGN-030-ADMIN, 2026-09-13): Option B RETIRE executed** | Phase-4 disposition: route-scoped palette owned by the admin surface; 13 color tokens latent (authored, defined, loaded, unreferenced). **Resolution:** admin-surface owner chose retirement — 13 color definitions removed from `app/admin/globals.css` (§5f), Table D rows flipped `dead`; `--admin-transition-normal` retained; D-01 overlap eliminated; zero rendered delta (negative rg). |

### 4b. Fresh-evidence confirmations (2026-09-13, dirty tree at `7cf660ad`)

- `--radius` still MISSING at `:root` (bare `:root` block has no `--radius`;
  only staff scope line 260 `0.625rem`; dead roots `0.5rem` ×4). Not provably
  zero-regression → gate note finalized, NO code change.
- `rounded-lg` 1500 / `rounded-md` 966 / `rounded-sm` 602 = **3,068**
  occurrences across **923 files** (app+components scope; PCRE negative
  lookahead) — matches the Phase-2/3 blast radius; 928 files if lib/hooks/pages
  are included (recorded for precision).
- Neon consumer file count: 26 (fresh rg on `neon-(purple|pink|cyan|amber|green|red)`
  in `.tsx`/`.ts`, minus `tailwind.config.ts`); 28 total matches incl.
  `app/globals.css` (definition) + `tailwind.config.ts` (projection). All 26
  under `components/admin/**`; scope anchor occurrence ADDED:
  `admin-calendar-view.tsx:862` (subscribe-panel `SheetContent` wraps
  `OrgCalendarSync`, itself a neon consumer) — anchors are now 3 files / 4 sites.
- `--neon-*-rgb` referenced only by app/globals.css + tailwind.config.ts.
- `--dashboard-*` var() consumers: only `components/settings/enhanced-settings-router.tsx`
  (3 sites, all inside `SettingsThemeShell`) outside the two shell writers and
  the test file.
- `--admin-*` negative rg: zero `var(--admin-` / `rgb(var(--admin-` references
  in app/components/lib/hooks outside `app/admin/globals.css` itself.
- Prior registry line references were survey-era (pre-DESIGN-032); refreshed to
  current line numbers (Tables C/E/F/G preambles).

### 4c. C-11 re-adjudication (correction of stage-1/2/3 evidence)

Stage 1–3 recorded C-11 as "`--dashboard-primary` consumed outside the
dashboard shell → vars unset there". Phase-4 re-audit of the mount chain
disproves the premise: `app/settings/page.tsx` → `EnhancedSettingsRouter` →
`<SettingsThemeShell themeId={appearanceSettings.dashboardTheme}>` (wraps ALL
three render branches: loading 212–216, no-account 222–240, main 245–858).
`SettingsThemeShell` renders `dashboard-theme-shell` with the SAME
`getDashboardThemeCssVars(theme)` inline vars as the dashboard provider, plus
`data-dashboard-theme-light`. Therefore `var(--dashboard-primary)` at lines
478/620/632 resolves identically under `/settings` and `/dashboard/**`. C-11 is
demoted from "runtime gap" to "documented intentional composition" (settings
re-mounts the dashboard shell theme surface — consistent with the C-06
composition contract in Table L). The registry row + inventory row are updated;
**no code change** (the surface difference is intended; USER-003 owns this
file's future evolution and was NOT touched by this lane).

### 4d. Zero-delta compare points (Phase 4)

Zero source files changed: no `.ts/.tsx/.css/.js` edit, no provider file
touched, no token renamed/removed, no Tailwind config change. Rendered output
is byte-identical to the Phase-3 baseline. The only changed files are
`TOKEN_REGISTRY.md`, `TOKEN_AUTHORITY_INVENTORY.md`,
`docs/engineering/agents/design-system/STATE.md`, and the DESIGN-030 task
record (all docs/control-plane). C-03 radius gate: finalized as note ONLY
(no behavioral change — 0px corners preserved app-wide).

### 4e. Remaining Phase-5 items (recorded, not executed)

1. Dead-root removals (C-10) — the four un-imported roots; per-root zero-use
   register entries first; preserve authored light sidebar/chart/radius
   provenance. **→ EXECUTED 2026-09-13 (§5a–5c).**
2. `--radius` at `:root` — only after the owner visual review of the
   `0 → 8/6/4px` app-wide delta (gate note above; separate bounded change).
   **→ OWNER-GATED, NOT applied (Table C gate finalized Phase 4; unchanged).**
   **→ SUPERSEDED 2026-09-13: APPLIED by DESIGN-033 after owner approval —
   `--radius: 0.5rem` at `:root`; QA visual check is the final gate (§6).**
3. `--neon-*` composite retirement (6 declarations, zero consumers — negative
   rg ready). **→ EXECUTED 2026-09-13 (§5e).**
4. Global dark-only form override remediation (D-02) — app/globals.css:360–374
   `!important` rule + `styles/globals.css` duplicate. **→ dead duplicate
   removed with its root; LIVE override GATED (§5d) — removal not
   zero-delta-provable (148 form-control files).**
5. `--admin-*` latent palette: decide adoption vs retirement of the 13
   zero-consumer color tokens (D-01 overlap language) with the admin surface
   owner; `theme.ts` TS-only palette (C-01/C-07, Table J) stayed out of this
   phase per the phase boundary. **→ RESOLVED 2026-09-13: Option B RETIRE
   executed by the admin surface owner (handoff HF-DESIGN-030-ADMIN; §5f,
   Table D).**

## Phase-5 execution notes (DESIGN-030, 2026-09-13) — final execution batch

Phase 5 is the first phase with source changes since stage 1: **C-10 dead-root
removal and `--neon-*` composite retirement are physically executed with
provable zero rendered-value delta**; the D-02 live override, the `--admin-*`
latent palette, and the C-03 `--radius` change remain gated / owner-pending.

### 5a. C-10 dead-root removal — per-root zero-use registers

Re-proven BEFORE removal (rg, all file types excl. node_modules/.git: exact
paths, alias spellings `@/styles/globals.css` / `@/venue/globals.css`, relative
`../styles/globals.css`, broad `globals.css` import sweep, `@import` chains,
next/postcss CSS registration): **all four roots have ZERO importers**. The
only live globals imports remain `app/layout.tsx` (app/globals.css),
`app/admin/layout.tsx` (app/admin/globals.css), `app/artist/layout.tsx`
(app/artist/globals.css); `components.json` references app/globals.css
(shadcn config). The only path matches left in live code are CSS comments in
app/globals.css documenting provenance (no import).

| root (lines deleted) | defined ONLY in that root | live duplicate / provenance | disposition |
| --- | --- | --- | --- |
| `app/venue/globals.css` (130) | 19 semantic HSL light values (`:root`, "nouvelle" 222.2-family) + `.dark` remap variants; `--radius: 0.5rem`; `.typing-dot` (×3) + `@keyframes typing-dot`; `.scrollbar-hide` (×2); `@keyframes scan` + `.animate-scan`; `*`/`body` base layer | all 19 roles live at app/globals.css `:root` (Table A); classes duplicated live (app/globals.css:1128–1160); base layer never loaded (live body = legacy-rgb gradient rule) | **REMOVED** — light values (= the only authored light family-1 values) recorded §5b |
| `app/admin/dashboard/components/styles/globals.css` (94) | neutral light 19 semantic + `--radius`; `--chart-*` light (5) + dark (5); `--sidebar-*` light (8) + dark (8); `.text-balance`; `body { font-family: Arial }` | sidebar/chart dark byte-identical at `:root` (DESIGN-032); sidebar light authored here + styles/venue (2 roots); chart light here + styles/globals + styles/venue (3 roots); `.text-balance` live at app/globals.css:388 | **REMOVED** — provenance §5b |
| `styles/globals.css` (113) | dark 19 semantic `:root` (identical to live Table A) + `--radius` + `--chart-*` LIGHT (5, authored in its dark `:root`) + `--sidebar-*` DARK (8); `body { background-color:#0f1117; color:#fff }`; `.glow-effect` (×3); `.card-hover` (×2); `.text-balance`; **D-02 duplicate form override (88–103)** | semantic/chart/sidebar roles live at `:root`; classes duplicated live (app/globals.css:332–385, 388); body rule never loaded; D-02 duplicate removed here — see §5d | **REMOVED** — provenance §5b; D-02 dead duplicate retired |
| `styles/venue/globals.css` (94) | neutral light 19 semantic + `--radius` + `--chart-*` light (5) + `--sidebar-*` light (8); `.dark` block (variant values, e.g. `--ring 0 0% 83.1%`); `.text-balance`; `body { font-family: Arial }` | idem (light values shared with the admin-dashboard root) | **REMOVED** — provenance §5b |

431 lines deleted total (130+94+113+94).

### 5b. Authored light-scheme provenance (recorded BEFORE removal; nothing is loaded)

The app is dark-first (`:root` = dark in app/globals.css; no `.dark` selector
in the live cascade — C-04 open; no light semantic remap ever loads). The
removed roots were the ONLY authored light values for live token roles;
preserved here for any future light-mode phase (which must re-author them in
the live cascade runtime-truth-first per Design Q2):

| live token family | authored light values (in the removed roots) | authored in (removed roots) |
| --- | --- | --- |
| Table A semantic 19 (`--background` … `--ring`) — FAMILY 1 "nouvelle" | e.g. `--background: 0 0% 100%`, `--primary: 222.2 47.4% 11.2%`, `--ring: 222.2 84% 4.9%` | `app/venue/globals.css :root` |
| Table A semantic 19 — FAMILY 2 neutral | e.g. `--background: 0 0% 100%`, `--primary: 0 0% 9%`, `--ring: 0 0% 3.9%` | `app/admin/dashboard/components/styles/globals.css :root` + `styles/venue/globals.css :root` |
| `--sidebar-*` (8) | `0 0% 98%`, `240 5.3% 26.1%`, `240 5.9% 10%`, `0 0% 98%`, `240 4.8% 95.9%`, `240 5.9% 10%`, `220 13% 91%`, `217.2 91.2% 59.8%` | the 2 light-capable roots (admin-dashboard styles + styles/venue) |
| `--chart-*` (5) | `12 76% 61%`, `173 58% 39%`, `197 37% 24%`, `43 74% 66%`, `27 87% 67%` | 3 roots (`styles/globals.css :root` + both light roots) |
| `--radius` | `0.5rem` | all 4 roots (dead token; staff scope `0.625rem` is the only remaining definition) |

### 5c. Zero-delta compare points + negative rg (post-removal)

- Zero rendered delta is provable: the roots had zero importers (rg, all
  spellings — §5a), so no stylesheet ever entered the cascade from them; every
  class they defined has a live duplicate in app/globals.css; every var they
  defined is live elsewhere (Table A / DESIGN-032 `:root`) or dead (`--radius`,
  C-03 unchanged). Rendered output is byte-identical to the Phase-4 baseline.
- Post-removal negative rg: the 4 root paths now match ONLY the provenance
  comments in app/globals.css (+ these notes); zero import references remain
  (`rg -F "<path>"` outside docs → exit 1; alias/relative import sweep → exit 1).
- `--radius` NOT added to `:root`; `tailwind.config.ts` borderRadius, theme.ts
  and the 3 live ThemeProviders untouched (Phase-5 rule); the
  `.staff-scheduling-prototype` scope and the admin/artist/venue/dashboard
  embeddings unchanged.

### 5d. D-02 form-override remediation — dead duplicate removed, live rule GATED

- `styles/globals.css` (removed, §5a) carried a byte-similar duplicate
  (lines 88–103) of the live global override at app/globals.css:360–374
  (input/textarea/select `background-color:#0f1117 !important`,
  `border-color:#2d3748 !important`, `color:white !important`, purple
  `#9333ea` focus box-shadow). Removing the dead duplicate = **zero rendered
  delta** (unloaded file).
- The **LIVE override is NOT changed**: 148 files under app+components render
  raw `<input|textarea|select>` elements (rg sample incl. onboarding, epk,
  ticketing, social, news, verification, dashboard surfaces), and removing the
  rule changes rendered values everywhere (#0f1117 backgrounds, white text,
  purple focus) — zero-delta is NOT provable.
- **Scoped remediation gate recorded (recommendation):** a separate
  owner-reviewed bounded change should replace the global `!important` rule
  with token-based component-level form styling (shadcn
  `input`/`select`/`textarea` primitives driven by `--input`/`--ring`/
  `--primary`/`--border`), then delete the global override. Basis: STATE.md
  known risk "global dark input overrides … can break light or surface-specific
  UI" + owner direction (CSS vars = runtime truth; preserve intentional surface
  differences).

### 5e. `--neon-*` composite retirement — EXECUTED

- Pre-removal negative rg: `var\(--neon-(purple|pink|cyan|amber|green|red)\)`
  across all file types → **ZERO matches** (the `--color-neon-*` map and the 6
  Tailwind `neon-*` aliases read the `-rgb` triplets directly).
- Removed the 6 composite declarations (previously app/globals.css lines
  267–272): `--neon-purple` … `--neon-red`, each defined as
  `rgb(var(--neon-*-rgb))` — zero consumers.
- Kept intact: the 6 `--neon-*-rgb` triplets (now lines 262–267; consumed by
  the Tailwind aliases + in-scope arbitrary values), the `--color-neon-*` map
  (lines 285–290), and the Tailwind aliases; C-02 owner notes unchanged.
- Post-removal negative rg: zero composite `var()` references anywhere;
  app/globals.css holds exactly 6 triplets + 6 `--color-neon-*` lines.

### 5f. `--admin-*` latent palette — RESOLVED (Option B RETIRE, 2026-09-13)

Decision request recorded for the admin-surface owner (admin agent) — handoff
`HF-DESIGN-030-ADMIN` (this cross-domain decision was a handoff, not silent
scope expansion; the design-system lane owns the registry, the admin lane owns
the `/admin/**` surface):
- **Option A — adopt** the 13 latent color tokens into the registry as a
  scoped admin palette (canonical Table D rows; optional `admin-*` Tailwind
  projections; D-01 recorded as intentional admin surface language).
- **Option B — retire** the 13 zero-consumer color declarations from
  `app/admin/globals.css` (keep `--admin-transition-normal`, self-consumed by
  `.admin-metric-card` / `.admin-btn-futuristic`).

**ADMIN-SURFACE-OWNER DECISION (2026-09-13): Option B — RETIRE, with evidence.**
Fresh repo-wide rg (all file types, 2026-09-13) confirmed **zero** `var(--admin-*`
/ `rgb(var(--admin-*))` consumers outside the defining file; the only matches
were `app/admin/globals.css:24,34` (both `--admin-transition-normal`, self-consumed)
and documentation mentions. No in-flight admin work plans to adopt them
(ADMIN-003 guard migration, ADMUX-0102 navigation hardening, builder progress
ledgers, tailwind.config.ts — zero `admin-*` projections). `/dashboard` has its
own `--dashboard-*` palette; the app theme defaults carry the rest. Per Design
Q2 (avoid latent token debt; preserve intentional surface differences), 13
defined-but-unreferenced custom properties in a route scope are latent debt
with no evidence of a boundary contract — retired.
**Executed:** the 13 color declarations were removed from `app/admin/globals.css`
(lines 3–7 collapsed to `--admin-transition-normal: 0.3s;`); Table D rows flipped
`dead`; D-01 overlap eliminated; post-removal negative rg proves zero consumers
smoke. Provenance values preserved in the Table D rows above (struck through).

### 5g. Phase-roadmap finalization (owner-gated items untouched)

- Phase 5 item 1 (C-10 dead-root removal): **DONE** (§5a–5c).
- Phase 5 item 2 (`--neon-*` composite retirement): **DONE** (§5e).
- Phase 5 D-02: dead duplicate **DONE**; live override **GATED** (§5d).
- Phase 5 item 3 (`--admin-*` latent palette): **RESOLVED — RETIRED (Option B,
  2026-09-13, HF-DESIGN-030-ADMIN)**. 13 zero-consumer color declarations
  removed from `app/admin/globals.css`; Table D rows flipped `dead`;
  `--admin-transition-normal` retained (§5f).
- C-03 `--radius` at `:root`: **OWNER-GATED VISUAL REVIEW — NOT applied**.
  Table C gate note finalized Phase 4 remains intact; `tailwind.config.ts`
  borderRadius and `--radius` are untouched; 0px corners preserved app-wide.
  **→ SUPERSEDED 2026-09-13: OWNER APPROVED + APPLIED by DESIGN-033 (§6).**
- DESIGN-030 remains `active` until the `--radius` gate resolves (or an
  explicit final gate is recorded); the `--admin-*` decision is CLOSED.

## §6 execution notes (DESIGN-033, 2026-09-13) — C-03 radius APPLIED

**C-03 gate closed with owner approval.** Scope: `--radius: 0.5rem` at
`app/globals.css :root` only; no other CSS var, no ThemeProvider, no
`theme.ts`, no neon/dashboard/admin surface edit. `tailwind.config.ts`
`extend.borderRadius` was VERIFIED, not changed:

| alias | tailwind.config.ts projection (unchanged) | resolves (design-033) |
| --- | --- | --- |
| `rounded-lg` | `var(--radius)` | `0.5rem` (8px) |
| `rounded-md` | `calc(var(--radius) - 2px)` | `0.375rem` (6px) |
| `rounded-sm` | `calc(var(--radius) - 4px)` | `0.25rem` (4px) |

### 6a. Applied change
- `app/globals.css :root` — added the semantic radius comment block +
  `--radius: 0.5rem;` (after the chart ramp, before the `:root` close).
  This is the ONLY token added by DESIGN-033 (point-in-time sweep: new
  `--` declarations vs HEAD are DESIGN-032 sidebar/chart (13) + DESIGN-033
  `--radius` (1); all registered).
- Staff scope unchanged: `.staff-scheduling-prototype` keeps its own
  `--radius: 0.625rem` (wins by cascade; stronger specificity + later
  origin — verified no consumer change).

### 6b. Verification evidence (all commands recorded in DESIGN-033 task record)
- Scoped Tailwind build (v3.4.17 CLI, `tailwind.config.ts`, probe content
  `rounded-lg/md/sm`): emitted `.rounded-lg{border-radius:var(--radius)}`,
  `.rounded-md{border-radius:calc(var(--radius) - 2px)}`,
  `.rounded-sm{border-radius:calc(var(--radius) - 4px)}`; numeric resolution
  0.5/0.375/0.25rem (8/6/4px) computed from `--radius: 0.5rem` (16px base).
- `npx eslint app/globals.css tailwind.config.ts` — 0 errors (CSS ignored by
  flat config warning only, exit 0).
- Scoped `tsc` on `tailwind.config.ts` — 0 errors (config unchanged but
  integrity-checked; repo-wide tsc remains resource-constrained in this
  dirty tree, reported honestly).
- `git diff --check -- app/globals.css` — clean (exit 0).
- Style/layout/design-system tests: `__tests__/design-system` 5/5 pass;
  theme/style-adjacent (`dashboard-themes`, post-styles boundary + v3) 22/22
  pass. Zero test files assert `border-radius`/`rounded-*`/`--radius`
  (rg) — no rounding test failure is possible; the app-wide visual delta is
  the owner-accepted behavior, pending the QA visual check.
- `npm run agents:validate` — 17 agents / 99 tasks / 0 warnings / 0 errors.
- Point-in-time rg: no new unregistered tokens — the only `--radius`
  definitions now are `:root` (0.5rem, live) + staff scope (0.625rem, scoped).

### 6c. QA handoff (final gate)
Owner accepted the app-wide `0 → 8/6/4px` corner delta; the final gate is a
**QA visual check of critical surfaces** (main app, admin, artist, venue,
dashboard, settings; staff scope expected unchanged). Pending handoff
`HF-DESIGN-033-QA` (to_agent `qa`) created 2026-09-13; QA closes it after
the visual regression pass. Blast radius: ~3,068 `rounded-{lg,md,sm}`
usages / 923 files (1500/966/602), per the Phase-4 re-verification.

### 6d. Registry status transitions (this note)
- Table C: 4 rows `conflict` → `live` (radius scale + radius-lg/md/sm).
- Table K: 3 radius projection rows `conflict` → `live`.
- Table C gate history + owner-acceptance paragraph added; §2a/§4e/§5g
  historical "NOT applied" statements marked SUPERSEDED (history preserved).
- Inventory C-03 row + §1/§8 radius rows + Phase roadmap updated in
  `TOKEN_AUTHORITY_INVENTORY.md`; STATE.md durable facts + risks updated.

## Disposition authority

- Registry = **target authority** for all token migration decisions; the
  inventory is the survey input and will be refreshed per phase.
- CSS variables remain the **runtime truth**; Tailwind remains a **projection**
  (Tables C and K rows with `conflict` status are where projection and truth
  diverge).
- Every future phase must update this registry's statuses and the inventory's
  phase roadmap with per-stage zero-visual-regression evidence.