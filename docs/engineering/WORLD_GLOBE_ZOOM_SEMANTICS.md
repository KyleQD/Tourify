# World Globe Zoom Semantics — v1.0 (P13)

**Status:** FROZEN for P13 · Source of truth: `lib/world/globe/zoom-policy.ts`
Every surface (globe scene, `/api/world/viewport`, docs) resolves tiers through that module; do not re-derive thresholds locally.

## Tier resolution

Tiers derive from camera altitude in globe radii (OrbitControls distance; 1.0 = surface):

| Distance | Tier | Granularity | Visible layers | Default cap |
|---|---|---|---|---|
| ≥ 2.6 | `global` | heat (aggregates only) | places, scenes | 120 |
| 1.9 – 2.6 | `regional` | aggregate (clusters) | places, artists, events, scenes | 220 |
| < 1.9 | `city` | entity (individual markers) | places, artists, events, venues | 320 |

Non-finite distances fail closed to `global`. Explicit `tier` request params override derivation but are mutually exclusive with `zoom`.

## Product meaning (P13-T03)

- **Global** — countries / major centers / scene *heat*. No individual identity; the renderer receives cluster summaries only.
- **Regional** — cities, clusters, festivals. Server-side cell aggregation (10° cells global, 4° regional) collapses density into stable clusters with weighted centroids and count labels.
- **City** — venues, events, local artists, landmarks as individually selectable entities.

## Bounding rules

- Payloads never exceed `min(requested cap × density hint factor, VIEWPORT_HARD_CAP=400)` items.
- `densityHint=mobile` multiplies caps by 0.6 (server-side, not client-dropped).
- Cluster cells: lat/lng grid keyed by tier (`cellSizeDegreesForTier`); deterministic across runs. H3 remains deferred until PostGIS access patterns are measured (P15+).

## Request lifecycle (client)

1. Camera changes debounce for 220ms before a request spawns.
2. New camera state aborts any in-flight viewport request.
3. Only the newest response sequence may commit (stale drops are counted).
4. Cache keys round bounds to a 0.05° grid + one-decimal zoom so micro-pans reuse frames.

## Cleanup guarantees (P13-T10)

Dynamic marker layers live in dedicated groups; every replacement disposes geometry/material/texture before rebuild, and leaving World aborts in-flight requests and tears down the whole scene. The disposal ledger (`lib/world/globe/disposal-ledger.ts`, `getDisposalStats()`) proves outstanding → 0 on every teardown path. Instrumented browser profiling lands with P23 performance budgets.

## Arc policy

Selection arcs are visual connective tissue only (≤ 6, low-opacity). They express **no** cultural/transmission claim; evidence-backed arcs arrive with P19.
