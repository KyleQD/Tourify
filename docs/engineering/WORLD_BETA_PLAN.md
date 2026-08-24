# World Controlled Beta Plan — v1.0 (P25)

## Stage A — Internal cohort (week 1–2)

**Audience:** engineering, product, editorial (accounts holding World platform roles).
**Flags:** `WORLD_MUSIC_SEED_PREVIEW_ENABLED=true` for cohort only; playback stays flag-gated.

### Scripted acceptance journeys
1. **Detroit (reference):** open `/discover/world` → select Detroit → verify hero, Popular Now state, Genres & Scenes, historic vs current artist separation, Music, Happening Here empty-state copy, Venues state, Listen Here rights notice, History timeline, Tourify Here, Sources drawer. Conventional route `/discover/world/detroit` completes without the globe.
2. **Kingston + London (international):** same checklist; confirm non-US fixtures render and sources resolve.
3. **Editorial loop:** ingest candidate → inbox action (approve w/ reason) → audit event visible in Quality chain check → radio rights change → claims edit.
4. **Globe slice:** viewport stream under rapid camera movement (no stale UI), cluster labels at global zoom, entity markers at city zoom, mobile density on touch device.
5. **Education:** complete Birth of Techno journey without the globe; educator citations visible.

## Stage B — Selected accounts (week 3–6)

**Audience:** trusted artists, venues, organizations, power users (5–15 accounts).
Adds: passport entries, follows, contributions (correction/source suggestions), search compound queries, appeal submission dry-run.

## Metrics & go/no-go thresholds

| Metric | Source | Go threshold |
|---|---|---|
| Play-start success | world_playback_events | ≥ 90% where rights=eligible |
| Reconnect rate | reconnect / play_start_success | ≤ 20% |
| Early failures (<10s) | early_failure events | ≤ 10% |
| Rights denials (expected UX, not errors) | rights_denied | tracked; unexplained spikes block |
| API latency p95 | viewport/place routes | ≤ 400 ms server time |
| Globe errors | console/error boundary | 0 unhandled per session sample |
| Unresolved locations | world_place_resolution_candidates queue age | median triage < 48 h |
| Review queue age | ingestion candidates open | median < 72 h |
| Zero-result search rate | search analytics buckets | ≤ 25% of queries |

## Correction/feedback workflow
- Stations: card report hook → `world_radio_station_reports` (triage in console).
- Geography/rankings: appeals queue (`world_ranking_appeals`) + contribution corrections.
- All feedback lands as review candidates; nothing auto-mutates canon.

## Stop/go discipline
Any high-severity security/rights issue, review-queue blowup (>200 open candidates), or metric breach stops expansion at the current stage until resolved and re-verified.
