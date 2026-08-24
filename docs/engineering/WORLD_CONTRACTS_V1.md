# WORLD_CONTRACTS_V1.md — Frozen Core World Contracts

**Status:** FROZEN v1 · **Frozen:** 2026-08-22 · **Commit:** `e3d7e69b` (branch `feature/world-of-music`)
**Code source of truth:** `lib/world/contracts/v1.ts` + `lib/world/contracts/v2-payloads.ts`
**Tests:** `__tests__/world/contracts-v1.test.ts` (11/11 PASS)

## Change policy (freeze rules)

1. **Additions** (new relation key / entity kind / payload field): minor version bump + DECISION_LOG entry + registry test update. Never client-invented.
2. **Removals/renames**: major version bump + alias map retained for one cycle.
3. **No adapter/projector may invent values outside these registries.** Unknown values fail closed into review state.

## 1. Relation-type registry (P2-T01/T02)

### Retained (25 migration-seeded pairs — Migration B `20260822021740`)

| Domain | Keys |
|---|---|
| artist_place | active_in · associated_with · based_in · born_in · formed_in · originated_in |
| cultural_place | associated_with · developed_in · historically_significant_in · originated_in · practiced_in |
| cultural_graph | credited_to · evolved_from · influenced_by · part_of · related_to · uses_instrument |
| track_place | associated_with · produced_in · recorded_in · released_from · written_in |
| radio_place | associated_with · broadcasts_from · serves |

Deprecated: none. Aliases: none.

### Newly required (frozen for Wave-2+ projectors)

| Domain | Key | Consuming phase |
|---|---|---|
| event_place | occurs_in | P5 |
| org_place | headquartered_in, associated_with | P6 |
| content_place | about_place, associated_with | P8 |
| ranking | popular_in | P9/P17 |

Each addition ships as a governed seed migration **when its projector lands** — not before.

## 2. Entity kinds & projectable sources (P2-T03)

| Kind | Projecting table(s) |
|---|---|
| artist | artist_profiles |
| venue | venues_v2, venue_profiles |
| event | events_v2 |
| organization | organizer_accounts |
| track / release | artist_music |
| post | posts |
| blog_article / press_release | artist_blog_posts / posts |
| radio_station | world_radio_stations |
| cultural_entity | world_cultural_entities |
| place | geo_places |

## 3. Confidence semantics (P2-T04)

Numeric `[0,1]` AND enumerated band, both required:

| Band | Range | Meaning |
|---|---|---|
| accept | ≥ 0.80 | may auto-match where spec allows |
| review | 0.65–0.79 | candidate; editorial eyes required |
| unresolved | < 0.65 | diagnostics only |

Out-of-range input throws (`RangeError`) — never clamps.

## 4. Visibility levels (P2-T05)

`private → internal → public → aggregate_only`

Legal transitions (no silent widening): private→{internal,public}; internal→{private,public,aggregate_only}; public→{internal,aggregate_only}; aggregate_only→{internal} only.

## 5. Temporal validity (P2-T06)

- Every projection row carries `valid_from`/`valid_until` (nullable = open-ended).
- `active_in` relations EXPIRE: writers must set a window; readers filter "now ∈ window".
- Rankings/signals are always window-scoped; windows never implicit.
- Event projections auto-expire at event end + 1 day.

## 6. Provenance requirements (P2-T07)

| Origin | Required provenance |
|---|---|
| user-entered | user id + created_at + optional source URL |
| derived (projector) | projector version + source table/pk + run id |
| provider-derived | provider key + external id + retrieved_at + license class |
| editorial | editor id + decision + claim/evidence link |

Every published relationship must trace: source → external id → ingestion run → candidate → claim → evidence → reviewer decision.

## 7. Versioned payload contracts (P2-T08)

`world-place-v2.0` · `world-viewport-v1.0` · `world-search-v1.0` · `world-signal-v1.0` · `world-ranking-v1.0` · `world-editorial-candidate-v1.0` — TypeScript shapes in `v2-payloads.ts`. V2 keeps all v0.1 sections additive and adds `live` (Tourify discovery merge) and `trust` (claims-with-evidence counts). Signals are **aggregate-only by construction**.

## 8. Contract tests (P2-T09)

11 tests enforce: arbitrary relation strings rejected; cross-domain reuse rejected; arbitrary entity kinds rejected; non-projectable table pairs rejected; confidence range enforced; illegal visibility/lifecycle transitions rejected; publish gate requires approved+reviewer; schema-version literals pinned.
