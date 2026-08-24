# World Pilot Seed Template — v1.0 (P18-T02)

**Validator:** `scripts/world/validate-pilot.ts --all` · **Builder reference:** `scripts/world/expansion/build-wave2.py`

Every cultural region — Wave 1 or Wave 2 — uses ONE repeatable corpus contract (`data/world/pilots/<region>.json`, schema `world-history-seed-v0.1`). No region-specific application code is permitted (T06); all regions render through `WorldPlaceResponseV2` and the shared regional components.

## File shape

```jsonc
{
  "schema_version": "world-history-seed-v0.1",
  "pilot_key": "<region-slug>",
  "place_path": "us/la/new-orleans",       // canonical geo_places path
  "overview": { "musical_identity": "…" },
  "entities": [ … ],
  "relationships": [ … ]
}
```

## Entity types (frozen corpus vocabulary)

`artist_reference` · `recording_reference` · `historical_milestone` · `genre` · `scene` · `movement` · `instrument` · `studio_landmark` · `sound_signature` · `tradition` · `educational_topic`

Every entity requires: unique `seed_id`, `slug`, `entity_type`, `canonical_name`, `short_description`, and ≥1 `source_keys` entry.

## Relationship keys

`part_of` · `uses_instrument` · `credited_to` · `related_to` · `evolved_from` · `influenced_by`

Every relationship requires: resolvable endpoints, `source_keys`, numeric `confidence` (0–1), and `review_status: needs_review` + `publication_status: draft` — corpora STAGE, they never self-publish (T04).

## Density targets (T03) — where evidence supports it

| Type | Minimum |
|---|---|
| artist_reference | 15 |
| recording_reference | 5 |
| instrument | 3 |
| studio_landmark | 3 |
| historical_milestone | 5 |
| genre/scene/movement | 3 |
| tradition (celebrations) | 3 |

Wave-1 pilots are regression-frozen at their accepted densities (detroit 25, kingston 25, london 21, tokyo 21, lagos 18 entities).

## Workflow

1. Draft corpus following this template (reference `scripts/world/expansion/build-wave2.py`).
2. Register sources in `data/world/reference/sources.json`; add city/country rows to `places.json` with coordinates.
3. Validate: `npx tsx scripts/world/validate-pilot.ts <region>` — must pass vocabulary + provenance checks.
4. Add the key to `PILOT_KEYS` (`lib/world/globe/types.ts`) only after validation passes.
5. Governed promotion to a live environment remains migration/review-gated exactly like Waves before it (T04); regional subject-matter review (T07) is an editorial-process step recorded per region.
