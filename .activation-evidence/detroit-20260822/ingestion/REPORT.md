# Pilot ingestion evidence — MusicBrainz + Radio Browser (Detroit)

Spec: `schemas/PILOT_INGESTION_SPEC_V0_1.md` · Runbook: After-Detroit step 5 / P1-CODEX-006

## Runs (post-fix, clean)
- musicbrainz: succeeded — 2 requests (area search + containment disambiguation + artist browse), 15 artists received, 16 candidates upserted (15 artists new_candidate/needs_review + 1 place MATCHED to seeded canonical us/mi/detroit via containment walk Detroit→Wayne→Michigan), confidence 0.85–0.95.
- radio-browser: succeeded — 1 request, 25 stations received; 25 draft world_radio_stations rows (metadata_only, rights unknown) + 25 candidate radio_place|serves edges (candidate/draft) targeting us/mi or us/mi/detroit by name/tag reference.

## Idempotency proof
Row counts across candidates/stations/edges identical before vs after second runs
(217/25/25); second-run counters created=0 updated=16|25 edges=0. Natural keys:
(source_id, entity_kind, external_record_id) and (directory_provider,
directory_external_id).

## Rights separation honored
- No stream URL persisted anywhere: payloads carry hostname + SHA-256 hash only;
  world_radio_streams untouched pending ingestion-policy review.
- All stations playback_status=metadata_only, rights_status=unknown,
  publication_status=draft, review_status=candidate.
- MB artist identities staged as candidates; NO artist_profiles created;
  geo_external_references write deferred until match approval (spec §7).

## Bugs found & fixed during rehearsal
1. finishRun used invalid status literal ('completed') violating the run-status
   check → update silently no-op'd, leaving 'running' rows. Fixed to
   succeeded/partial/failed with surfaced errors; orphaned runs cancelled.
2. MB area search `country:` field unsupported → replaced with exact-name+City
   search plus recursive 'part of' containment walk to expected ancestors
   (Detroit→Wayne County→Michigan→United States).
3. `/area/{id}/artists` is not a JSON browse endpoint (silently returns the
   area); switched to browse form `/artist?area=<mbid>`.
4. Transient HTTP-200 busy bodies (`{"error": ...}`) bypassed status-based
   retry → retryOnBodyError with exponential backoff (retries=4).

## Counter semantics note
First RB run logged created=50 (station rows + candidate rows share the
counter); subsequent idempotency runs report candidate-only deltas. Runner now
distinguishes stations vs candidates in logs where relevant.
