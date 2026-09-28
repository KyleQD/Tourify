# Workforce live-operations usage contract

- **Owner:** design-system (WFC-007)
- **Task:** `docs/engineering/tasks/active/WFC-007.json`
- **Base SHA:** `16fb834f1a03a70f165be470a5f98f389bf6100a`
- **Consumers:** WFC-008, WFC-009, WFC-010, WFC-013, WFC-015, WFC-017, WFC-020 (admin lanes), and WFC-021 (QA)
- **Authority:** CP-098 (source health), CP-100 (radius frozen), CP-101 (`components/admin/**` is not this lane's path)

This is the contract. If a workforce surface needs a behaviour that is not in
here, the behaviour is missing from the design system and the gap is reported —
it is not re-implemented inside an admin lane.

**No WFC delivery writes a single line under `components/admin/**`.** Everything
below is composed from `components/ui/**`. A guard test enforces it
(`workforce-live-operations.test.tsx` → "keeps every ops primitive inside
components/ui and free of admin imports").

---

## 1. What already existed, and what was reused

Invented from nothing, this lane would have produced a second table, a second
status chip, a second source-health panel, and a fourth hand-picked status
palette. The inventory came first; these were reused instead:

| Need | Reused, not rewritten | Notes |
| --- | --- | --- |
| Status chip surface | `components/ui/badge.tsx` | `Badge` is the base; `OpsStatusChip` adds vocabulary, tone, and data attributes. |
| Empty collection | `components/ui/empty-state.tsx` | Used directly by `OpsSourceHealthPanel` when nothing has reported. |
| Busy / skeleton | `components/ui/skeleton.tsx` | Used directly by `OpsSourceLoading` and `OpsMetricLoading`. |
| Inspector body scrolling | `components/ui/scroll-area.tsx` | Used by `OpsInspectorPanel` when a height is declared. |
| Inspector dividers | `components/ui/separator.tsx` | Used for header/body/footer rules. |
| Mobile inspector | `components/ui/sheet.tsx` | `OpsInspectorSheet` wraps it, so focus trap, escape, scroll lock, and labelling are Radix behaviour. |
| Dense tables | `components/ui/table.tsx` | **Kept as-is.** A real `<table>` is the right primitive when rows are genuinely tabular. `OpsCollection` is the *collection* case, not a table replacement. |
| Focus ring recipe | `components/ui/button.tsx` | The `min-h-11` / 44px target convention is reused verbatim. |

### Deliberately not created

- **A parallel `DataTable`.** `components/ui/table.tsx` already exists and is
  used widely. It was not forked. If a workforce table needs density or
  overflow control, the change is an additive variant on `table.tsx`, raised as
  a follow-up, not a new file.
- **A second `StatusBadge`.** The tone map in `components/ui/ops-tokens.ts` is
  the single status-colour authority for the workforce surface. Admin surfaces
  with their own palettes (`components/admin/logistics/command-center/status-indicators.tsx`,
  for example) converge onto it in the admin lane's own files.
- **A custom `role="listbox"` selection list.** Native `<input type="checkbox">`
  and `<input type="radio">` give correct keyboard operation, focus order, form
  semantics, and a 44px target without hand-written roving focus.

---

## 2. Shipped modules

Every module below is in `components/ui/**` and is covered by
`__tests__/design-system/workforce-live-operations.test.tsx`.

| Module | Exports | Use it for |
| --- | --- | --- |
| `components/ui/ops-tokens.ts` | `resolveSourceState`, `resolveOpsStatus`, `opsRadiusStyle`, `OPS_TONE_CLASSES`, `OPS_FOCUS_RING`, `OPS_TARGET_MIN`, `OPS_RADIUS_TOKENS`, `OPS_SCHEDULING_TOKEN_CONVERGENCE`, the four vocabularies | Reading the vocabulary, not rendering it. |
| `components/ui/ops-source-state.tsx` | `OpsSourceStateBadge`, `OpsSourceValue`, `OpsSourceStateRow`, `OpsSourceHealthPanel`, `OpsSourceLoading` | The four source states, CP-098. |
| `components/ui/ops-status-chip.tsx` | `OpsStatusChip`, `OpsStatusDot`, `OpsStatusMeter`, `resolveOpsStatus`, `OPS_STATUS_VOCABULARIES` | Manager status, action status, readiness, severity, and meters. |
| `components/ui/ops-metric.tsx` | `OpsMetric`, `OpsMetricGrid`, `OpsMetricLoading`, `OpsDepartmentHealthRow`, `OpsDepartmentHealthItem`, `OpsDepartmentHealthList`, `OpsCountPill` | Dense metrics and department health. |
| `components/ui/ops-attention.tsx` | `OpsAttentionItem`, `OpsAttentionList` | The attention queue. |
| `components/ui/ops-timeline.tsx` | `OpsTimeline`, `OpsTimelineEntry`, `OpsTimelineGroup`, `OpsRecordStrip` | Operational history. |
| `components/ui/ops-inspector.tsx` | `OpsInspectorPanel`, `OpsInspectorSheet`, `OpsInspectorSection`, `OpsInspectorField`, `OpsInspectorFields` | Detail surface, desktop and mobile. |
| `components/ui/ops-collection.tsx` | `OpsCollection`, `OpsCollectionItem`, `OpsBulkActionBar`, `OpsRowAction` | Dense selectable collections and bulk actions. |
| `components/ui/ops-filters.tsx` | `OpsSourceStateFilter`, `OpsStatusFilter` | Interactive filters. Client-only, deliberately separate from the presentational modules. |
| `components/ui/ops-shell.tsx` | `OpsShell`, `OpsShellHeader`, `OpsShellNav`, `OpsNavLink`, `OpsSection`, `OpsScopeBar`, `OpsSkipLink`, `OPS_MAIN_ID` | The command shell and the single `<main>`. |

---

## 3. Source-state behaviour (CP-098) — the part that must not be got wrong

`resolveSourceState(state, meta)` is the only decision point. Everything else in
the surface reads its answer.

| State | Label | Icon | Border | Tone | Value | Timestamp | Reason | Retry |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `fresh` | Fresh | check | solid | ok | shown when a number exists | shown | shown | never |
| `stale` | Stale | clock | solid | warn | shown when a number exists | shown | shown | never |
| `unavailable` | Unavailable | wifi-off | **dashed** | critical | **never** | never | shown | when `retryable` |
| `not_authorized` | Restricted | eye-off | **dotted** | muted | **never** | never | **never** | **never** |

### The false-zero rule

`OpsSourceValue` and `OpsMetric` do not accept a bare number. They accept a
source state plus an optional value, and the value is rendered only when the
resolver says the read succeeded.

```tsx
// Wrong — renders "0 upcoming shifts", which reads as a healthy zero.
<span>{value}</span>

// Right — renders the word "Unavailable" and no digit at all.
<OpsSourceValue label="Upcoming shifts" state="unavailable" value={0} />
```

`data-ops-value` is `"numeric"` or `"suppressed"`, so QA can assert the
suppression without reading pixels.

### How `not_authorized` avoids leaking existence

A restricted source must not reveal that the resource exists, that it has a
count, that it has a timestamp, that it can be retried, or that it is even a
particular kind of thing. Six rules are enforced in `resolveSourceState` and
consumed everywhere:

1. `showsValue` is `false`, so a restricted source can never render `0` — and
   therefore can never be mistaken for a source that is genuinely zero.
2. `showsTimestamp` is `false`, so it cannot be dated or correlated with an
   event.
3. `showsReason` is `false` **and any supplied `reason` is discarded**, so a
   server message such as "3 vendor payroll records are restricted" cannot be
   displayed even if the API sends one.
4. `showsRetry` is `false` regardless of `retryable`: a retry that can never
   succeed is a capability disclosure.
5. `resourceName` is accepted by the type (so callers cannot accidentally split
   the vocabulary) and is **never returned**.
6. The label and the screen-reader announcement are scope-generic — "Restricted"
   and "Restricted by access scope." — with no name, count, type, or hint.

Downstream, three more rules hold:

- `OpsMetric` with `state="not_authorized"` renders exactly one word. The metric
  name, the value, the delta, the reason, the stamp, and the icon are all
  dropped, because the *name of the measurement* is itself the disclosure.
- `OpsSourceHealthPanel` never renders a row for a restricted source. It emits a
  single aggregated, unnamed line ("Some sources are outside your access scope.")
  and does not disclose how many are restricted. Restricted sources are **not**
  counted as "needing attention", because a scope boundary is not a failure.
- `OpsDepartmentHealthRow` withholds the department name and the drill-down
  `href` when either measure is restricted, because a link is a capability
  disclosure.

---

## 4. Landmark, overflow, and breakpoint contract

- **One `<main>`.** `OpsShell` renders it. There is no separate `OpsMain` export,
  because two exported landmarks are two chances to render `<main>` twice. A
  route renders exactly one `OpsShell`.
- **No overflow on the frame.** No element in `ops-shell.tsx` sets
  `overflow: auto|scroll`. The grid and the flex column both carry `min-h-0`, so
  a tall child compresses its own region instead of pushing a scrollbar onto an
  ancestor.
- **Scrolling is declared, not inherited.** `OpsCollection` and `OpsTimeline`
  scroll only when a `viewport` is passed; `OpsInspectorPanel` scrolls only when
  a `viewport.height` is passed. Without one, `data-ops-viewport="page"` and the
  page scrolls normally.
- **Skip link.** `OpsShell` ships `OpsSkipLink` first, targeting `#ops-main`.
  Pass `skipLinkLabel={null}` to omit it deliberately.
- **Breakpoints.** `< lg`: navigation and inspector stack around the main region.
  `>= lg`: navigation is a `minmax(0, 15rem)` column. `>= xl` with an inspector:
  a third `minmax(0, 22rem)` column. Metric grids are 1 / 2 / 4 at base / `sm` /
  `xl`.

## 5. Type, target, focus, and motion contract

- **Type floor 14px.** Every text style in `components/ui/ops-*.tsx` is
  `text-sm` or larger. A guard test fails on `text-xs` or any arbitrary
  sub-14px step. Metadata is `text-sm text-muted-foreground`, not `text-xs`.
- **Target floor 44px.** `OPS_TARGET_MIN` is `min-h-11`. Every interactive
  element carries it, on the control itself or on its label wrapper.
- **Focus.** One recipe, `OPS_FOCUS_RING`:
  `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`.
  Filter and selection controls put it on the real `<input>`, so the ring is on
  the thing that takes focus.
- **Selection is native.** `OpsCollectionItem` renders real
  `<input type="checkbox">` / `<input type="radio">`, so keyboard operation,
  focus order, and the checked state are platform behaviour. It throws if
  `selection` is set without a `selectionLabel`, because an unnamed selection
  control cannot be operated with a screen reader.
- **Motion.** No ops primitive animates. `components/ui/skeleton.tsx`'s
  `animate-pulse` is inherited by the loading placeholders; a guard test fails
  if any ops file adds an animation without a `motion-reduce:animate-none`
  escape.
- **Contrast.** `OPS_TONE_CLASSES` is measured, not asserted. The test suite
  reads the installed Tailwind palette and parses `--card`,
  `--muted-foreground`, and `--foreground` out of `app/globals.css :root`,
  composites each tone's own `bg-<hue>-500/10` over `--card`, and requires
  WCAG 2.1 AA (≥ 4.5:1) for every tone. Measured ratios are printed on failure.

## 6. Radius contract (CP-100)

`--radius: 0.5rem` is frozen. This lane:

- **does not modify** `app/globals.css`;
- **does not define** `--radius` anywhere;
- **does not write** to `:root` in any file;
- **consumes** `var(--radius)` as the CSS fallback in
  `rounded-[var(--ops-radius-panel,var(--radius))]`.

A surface that needs a different radius ships a **scoped** token via
`opsRadiusStyle(radius, { slot })`, which sets `--ops-radius-panel`,
`--ops-radius-control`, or `--ops-radius-inline` **on that element only**.
Presets: `inherit` (emits nothing — the frozen baseline), `tight` (`0.25rem`),
`flush` (`0rem`), `pill` (`9999px`), or any explicit CSS length.

```tsx
<OpsInspectorPanel label="Worker detail" radius="tight">…</OpsInspectorPanel>
```

## 7. Scheduling-theme convergence

The `.staff-scheduling-prototype` neon scope is a separate token surface with
26 consumers inside `components/admin/**` (DESIGN-030 Phase 4, C-02). WFC-007
cannot edit those files (CP-101), so it publishes the mapping instead —
`OPS_SCHEDULING_TOKEN_CONVERGENCE` in `components/ui/ops-tokens.ts`:

| From | To shared token | For |
| --- | --- | --- |
| `neon-purple` | `--primary` | Actionable / selected affordance |
| `neon-cyan` | `--chart-1` | Informational accent |
| `neon-green` | ok tone | Positive operational state |
| `neon-amber` | warn tone | Needs attention |
| `neon-red` | critical tone | Failure |
| staff scope `0.625rem` radius | `var(--radius)` | CP-100 frozen baseline |

**This is a target, not an applied change.** Applying it is an edit to
`components/admin/**`, so it belongs to the scheduling lane
(WFC-011/WFC-013/ADMVIEW-001) in its own files.

## 8. Which primitive not to use

| Do not | Use instead | Why |
| --- | --- | --- |
| Write a status chip in a workforce page | `OpsStatusChip` / `OpsStatusDot` | A second chip is a second palette and a second decision. |
| Render a number without a source state | `OpsSourceValue` / `OpsMetric` | A bare number is the false-zero bug CP-098 exists to stop. |
| Use `role="listbox"` for a selectable record list | `OpsCollection` + native inputs | Hand-rolled roving focus is a regression surface. |
| Put a second `<main>` in a page | `OpsShell`'s main region | Two main landmarks break landmark navigation. |
| Add `overflow-auto` to a shell region | A declared `viewport` | Undeclared inner scroll containers are the nested-overflow trap. |
| Add `--radius` or a `:root` rule | `opsRadiusStyle` scoped token | `:root` is frozen by CP-100. |
| Hand-pick a status hue | `OPS_TONE_CLASSES` | Hand-picked hues are how the four existing admin palettes diverged. |
| Make `OpsStatusChip` clickable | `OpsSourceStateFilter` / `OpsStatusFilter` | A chip is a label; a control needs a pressed state and a focus order. |
| Add a `DataTable` fork | `components/ui/table.tsx` | It exists. Forking it adds a duplicate-retirement debt. |
| Use `components/ui/alert.tsx` for an attention list | `OpsAttentionItem` | `Alert` hard-codes `role="alert"`; ten standing items would fire ten announcements. |

## 9. Open items this lane could not close

1. **There is no registered CSS role for a status hue.** `OPS_TONE_CLASSES` uses
   Tailwind palette steps because `app/globals.css` has no `--status-*` family
   and the token registry is a closed contract enforced by
   `npm run check:token-registry`. Registering a real status hue needs a
   `tailwind.config.ts` + `app/globals.css` + `TOKEN_REGISTRY.md` change, which
   is outside this grant. **Raised as a path-specific decision for the
   orchestrator, not as a grant widening.**
2. **The admin lane's existing command-center primitives are now superseded but
   untouched.** `components/admin/logistics/command-center/status-indicators.tsx`
   models three source states (`ready | degraded | unavailable`) and has no
   `not_authorized`. `attention-row.tsx`, `summary-stat.tsx`, and `states.tsx`
   overlap `OpsAttentionItem`, `OpsMetric`, and `OpsSourceHealthPanel`. Folding
   them onto this contract is an edit in the admin lane's path (ADMVIEW-001 /
   DESIGN-036) and is handed off, not performed here.
3. **No visual evidence.** This lane produces static build, type, and test
   output. Contrast is computed from token values, not sampled from a
   screenshot. The responsive, focus, and reduced-motion passes belong to QA
   (QA-003 / QA-007).
