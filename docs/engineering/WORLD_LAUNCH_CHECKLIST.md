# World Public Launch Checklist — v1.0 (P26)

## Migrations & data
- [ ] Full lineage replayed green on staging (registry-owned exclusions documented; VEN repairs tracked)
- [ ] World tables present with RLS: sweep query returns 100% enabled
- [ ] Advisor lint: 0 error-level findings in World scope on target DB
- [ ] Pilot corpora promoted through governed review (subject-matter sign-off per region recorded)
- [ ] Demo/production untouched before this gate; backups verified restorable

## Flags & rollout
- [ ] `WORLD_MUSIC_SEED_PREVIEW_ENABLED` staged enablement plan (internal → selected → %)
- [ ] Ingest kill switches configured in environment (`WORLD_INGEST_KILLED`, per-provider)
- [ ] Playback flags remain off until rights review signs off station-by-station

## CI / monitoring / operations
- [ ] World CI green on the release branch (unit suites, scoped TS, migration replay, smoke)
- [ ] Dashboards: console quality (funnel, failure rate, audit chain), provider health strip
- [ ] Alerts: API p95 latency, play-start success, review queue age, unresolved geography growth
- [ ] Ownership matrix: engineering on-call, editorial queue, rights review, ingestion ops, data quality (names filled before 100%)

## Rights / privacy / security
- [ ] No raw stream URLs in payloads/storage (structural validators green)
- [ ] Telemetry/search-analytics minimization verified in production sampling
- [ ] Incident runbook accessible to on-call; kill switches tested in staging
- [ ] Appeals + contributions queues staffed; SLA posted publicly

## Mobile / accessibility / fallback
- [ ] Non-WebGL parity verified on target device matrix
- [ ] Reduced-motion, keyboard, screen-reader passes complete
- [ ] Performance budgets met on mid-range device capture (frame time, payload sizes)

## Post-launch cadence
- [ ] 24 h review: errors, latency, queue depths, kill-switch readiness
- [ ] 7 d review: search zero-result rate, correction themes, playback quality
- [ ] 30 d review: roadmap changes; quarterly source/rights/privacy/ranking review scheduled
- [ ] Expansion planned by measurable demand (queue depth, search demand) — not pin count
