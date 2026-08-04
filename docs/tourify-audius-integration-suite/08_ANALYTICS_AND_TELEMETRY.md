# 08 — Analytics & Telemetry

## Objectives

Measure adoption, reliability, engagement, and failure modes without conflating Tourify product analytics with provider royalty or payout accounting.

## Event schema

Use the existing Tourify event system. Add properties rather than creating a disconnected pipeline.

Recommended events:

- `music_provider_search_started`
- `music_provider_search_completed`
- `music_provider_search_failed`
- `music_provider_track_imported`
- `music_provider_track_import_failed`
- `music_playback_resolve_started`
- `music_playback_resolve_completed`
- `music_playback_started`
- `music_playback_progress`
- `music_playback_paused`
- `music_playback_completed`
- `music_playback_failed`
- `music_playback_skipped`

## Common properties

```json
{
  "provider": "audius",
  "trackId": "tourify-track-id",
  "providerTrackId": "external-id",
  "playbackSessionId": "uuid",
  "sourceSurface": "artist_profile",
  "queuePosition": 2,
  "durationMs": 240000,
  "positionMs": 32000,
  "requestId": "request-id",
  "errorCode": null
}
```

Avoid sending temporary stream URLs, provider secrets, or unnecessary user PII.

## Deduplication

- Generate one playback session ID when a track becomes current.
- Emit `started` once after confirmed media playback, not on click.
- Deduplicate progress milestones per playback session.
- Emit completion only after the defined threshold or `ended` event.
- Distinguish user skip from playback failure.

## Progress milestones

Recommended milestones: 10%, 25%, 50%, 75%, 90%, and completed. Follow the current Tourify analytics standard if one exists.

## Operational metrics

- Search request count, p50/p95 latency, and error rate.
- Metadata lookup latency and cache hit rate.
- Playback resolution success and latency.
- Time from click to first audible playback.
- Playback start failure rate by browser and surface.
- Provider unavailable rate.
- Adapter schema-validation failure count.
- Import conflict and duplicate-prevention counts.

## Dashboards and alerts

Create or update dashboards for:

- Provider health.
- Playback funnel.
- Error codes.
- Adoption by surface.
- Native versus Audius regression comparison.

Alerts should focus on sustained failures, not isolated user-network errors.

## Data governance

- Document event retention.
- Respect consent and privacy settings.
- Avoid treating Tourify telemetry as authoritative Audius royalty reporting.
- Ensure deletion/account privacy processes cover user-linked import audit data where applicable.

## Acceptance criteria

- Every failure maps to a stable error code.
- Duplicate events are controlled.
- Provider and source surface are present on all Audius playback events.
- No temporary playback URL appears in logs or analytics.
- Dashboards can isolate Audius without changing native-track reporting.
