# Detroit Activation — A0–A7 Go/No-Go Record

**Run:** local isolated rehearsal, 2026-08-22
**Database:** local Supabase stack (`tourify-beta`, Postgres 15.8) — disposable; Tourify Demo untouched
**Repo head at activation:** `301c8f13` (branch `integration/tourify-reconcile-2026-08`)
**Framing:** executed as a governed REHEARSAL while G1 sits at CONDITIONAL (one open classification). Every stage ran against the disposable local database only; evidence converts directly into the formal activation package once the G1 disposition is signed.

## Stage results

| Stage | Result | Evidence |
|---|---|---|
| A0 — G1 evidence | CONDITIONAL | `implementation/phase1/G1_EVIDENCE_20260822_LOCAL_RUN1.md`; two clean full-lineage replays; all contract/RLS/negative/typegen/lint/flag gates green; open item: `artist_music_provider_refs` live-only DDL |
| A1 — Platform World RBAC | **PASS (9/9 cases)** | `A1_rbac_authorization_tests.sql` + `A1_rbac_test_output.txt`: unauthenticated/org-admin denied; reviewer view+review without publish/sources.manage; publisher holds publish; expired assignment denied; `auth.uid()`-only signature proven structurally; zero user assignments seeded |
| A2 — Canonical prerequisites | PASS | 12 places / 8 aliases / 9 external refs / 53 sources / 25 relation types; no duplicate Detroit identity; flags still OFF. Vocabulary drift fixed: artifact's `manufacturer_archive` remapped to reviewed class `archive` |
| A3 — Private staging load | PASS (idempotent) | 176 candidates after double-apply in one transaction; staging remains client-inaccessible (G1 grant gates); rerun-safe upserts |
| A4 — Detroit canonical promotion | PASS | Governed migration execution of the reviewed preview: **25 entities, 25 place edges, 15 graph edges, 66 claims (all with evidence), 16 sources**, every row draft; no verified/published overwrites possible; playback tables untouched |
| A5 — Supabase repository parity | **PASS (0 differences)** | `detroit-db-backed.json` vs static fixture via `run_detroit_parity_check.sh`; semantic report: `detroit_world_semantic_parity.json`. Fixes required to reach parity are recorded in commit `301c8f13` (EWKB parsing, snake_case external_refs + deterministic place-identity-first ordering, edge-claim-derived confidence/provenance, claim-metadata merge for relationship_note/credit_role/credited_as, internal-key stripping) |
| A6 — Editorial state tests | **PASS (8/8 cases)** | `A6_editorial_state_tests.sql` + output: anon sees zero drafts; governed draft→verified→published makes exactly one entity visible to anon; retired hides it again; rejected never surfaces. Repository-level published_only dump returns ONLY the governed-published subtree (`detroit-db-backed-published.json`) then fully reverted (baseline counts re-verified) |
| A7 — Detroit exit gate | **GO (rehearsal)** pending one item | All technical criteria above are green. The single outstanding item is the A0/G1 disposition (`artist_music_provider_refs` read-only Demo export or explicit acceptance). No fake artist accounts exist; no recording/audio is playable; no private locator appears in any payload |

## Findings raised by real execution (fixed)

1. Frozen Migration B source-type check lacked `manufacturer_archive` used by the reviewed registry artifact → remapped in the governed conversion rather than widening the frozen contract.
2. Reader could not parse PostgREST EWKB geography and diverged from the static path on external-ref casing/ordering → unified both backing stores on one verbatim projection.
3. Entity confidence/provenance aggregated across all claims; corrected to derive from the canonical place-edge claim, matching the curated corpus exactly.
4. Relationship presentation fields (`relationship_note`, `credit_role`, `credited_as`) live on governed claim metadata; projector now merges safe fields from the linked claim.

## After-Detroit expansion (runbook steps 1–4) — COMPLETE

Generalized promotion tooling (`compile_pilot_canonical_preview.py` /
`validate_pilot_canonical_preview.py`, generated via strict asserted
transforms of the frozen Detroit originals by
`generate_pilot_promotion_tooling.py`; Detroit output regression-checked).
Each preview validated 27/27 checks. Governed migrations applied; full
lineage replay clean with all nine World migrations. Per-pilot results:

| Pilot | Entities | Place edges | Graph edges | Claims | Sources | Parity |
|---|---|---|---|---|---|---|
| Detroit | 25 | 25 | 15 | 66 | 16 | PASS 0 |
| Kingston | 25 | 25 | 14 | 65 | 11 | PASS 0 |
| Lagos | 18 | 18 | 11 | 48 | 11 | PASS 0 |
| London | 21 | 21 | 10 | 53 | 12 | PASS 0 |
| Tokyo | 21 | 21 | 11 | 54 | 15 | PASS 0 |
| **Total** | **110** | **110** | **61** | **286** | — | — |

Totals land exactly on the handoff-derived corpus numbers. Evidence JSONs:
`<pilot>-db-backed.json` + `<pilot>/detroit_world_semantic_parity.json`.

Finding recorded: `run_detroit_parity_check.sh` hardcodes the Detroit
fixture as reference; other pilots were compared by invoking
`compare_world_place_semantics.py` directly with per-pilot fixtures.

## Next actions after disposition

1. Kingston → Lagos → London → Tokyo promotion/parity repeats.
2. Staging-only MusicBrainz + Radio Browser adapter runs (`PILOT_INGESTION_SPEC_V0_1.md`).
3. Rights-aware radio/sound-guide/archive playback behind `world_music_radio_enabled`.
4. Public Discover World renderer — only after data contracts and viewport performance are proven.
