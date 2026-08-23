# World Performance Budgets — v1.0 (P23-T07)

**Enforcement points** are named per budget; CI runs the world suites and scoped builds. Breaches are release blockers for the affected surface.

## Bundle

| Budget | Target | Enforcement |
|---|---|---|
| Globe Three.js chunk (lazy) | ≤ 350 KB gz, loaded only when World mode activates | `import("./globe-scene")` dynamic import in `GlobeExperience`; never imported by Discover feed path |
| World domain code in feed path | 0 KB — feed renders without any `lib/world/*` module | route-level code split; P12 toggle keeps flag-off path untouched |
| Framer-motion usage | shared with platform (no duplicate animation lib) | package.json single dependency |

## API payloads

| Surface | Budget | Enforcement |
|---|---|---|
| `/api/world/viewport` | ≤ 120 KB gz at hard cap (400 items) | item count capped by `VIEWPORT_HARD_CAP`; cluster summaries compact |
| `/api/world/place/[slug]` v2 | ≤ 80 KB gz | section limits (`DEFAULT_SECTION_LIMITS`) + bounded lists |
| `/api/world/globe` | ≤ 20 KB gz (10 pilots) | pilot count frozen; marker counts only |
| ETag hits | 304 empty body | viewport + globe routes |

## Runtime

| Metric | Budget | Enforcement |
|---|---|---|
| Camera-change → request dispatch | ≥ 220 ms debounce held under rapid input | `useViewportStream` unit-tested |
| Stale-response commits | 0 allowed | sequence guard tested (`staleDrops` counter) |
| Frame time during orbit | ≤ 16.7 ms p75 on mid-range mobile | DPR cap 2; mobile dust 1800 particles; sprite-only markers |
| GPU memory across layer switches | outstanding resources → 0 every swap | disposal ledger (`getDisposalStats()`); browser profiling in this phase's manual pass |
| Interaction hit targets (touch) | ≥ ~60% larger raycast proxies | coarse-pointer branch tested by construction |

## Large-dataset behavior (T09)

- Viewport composition is O(n) over the source snapshot and output-bounded: verified to 50k synthetic points in tests.
- Payload size must remain flat as total World records grow — regression tests assert caps hold regardless of input density.

## Accessibility (T03/T04/T05/T10)

- Full keyboard operation: Escape closes, arrows cycle places; sr-only selection list mirrors all places.
- Screen-reader text equivalents: arc labels carry direction/type/era; place sections are real DOM (no canvas-only content).
- Reduced motion: auto-rotate disabled, camera tweens immediate, panel transitions instant.
- Layer meaning is never color-only: clusters carry count labels, sources carry text attribution, layers differ by shape/label/size.
