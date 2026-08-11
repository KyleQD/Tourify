# 04 — Backend APIs

## API goals

Expose a stable Tourify API for provider search, import/linking, normalized metadata, playback resolution, and telemetry. Clients must not depend on Audius-specific response shapes.

## Proposed endpoints

Adapt paths to current conventions after audit.

### Search Audius

`GET /api/music/providers/audius/search?q={query}&limit={n}&cursor={cursor}`

Responsibilities:

- Validate query length and result limits.
- Enforce feature flag and optional authentication.
- Apply rate limiting.
- Call Audius adapter.
- Return normalized summaries.
- Cache short-lived metadata responses.

### Get provider track metadata

`GET /api/music/providers/audius/tracks/{externalTrackId}`

Returns normalized metadata and provider attribution. It must not expose internal credentials or unbounded raw payloads.

### Import or link provider track

`POST /api/music/import`

Example request:

```json
{
  "provider": "audius",
  "externalTrackId": "abc123",
  "artistProfileId": "optional-tourify-artist-id",
  "sourceSurface": "artist_music_manager"
}
```

Server behavior:

1. Authenticate actor.
2. Authorize target artist/profile.
3. Fetch fresh provider metadata.
4. Validate availability.
5. Reuse existing provider reference if present.
6. Create or link canonical Tourify track in a transaction.
7. Record import audit event.
8. Return canonical track.

### Resolve playback

`POST /api/music/playback/resolve`

```json
{
  "trackId": "tourify-track-id",
  "playbackSessionId": "uuid",
  "sourceSurface": "global_player"
}
```

Returns a short-lived `PlaybackDescriptor`. It should use `Cache-Control: private, no-store` unless provider behavior supports a safer bounded policy.

### Playback analytics

`POST /api/music/events`

Use batching if an event ingestion endpoint already exists. Validate known event names and clamp numeric values.

## Response envelope

Follow existing Tourify API conventions. A recommended format:

```json
{
  "data": {},
  "meta": { "requestId": "..." },
  "error": null
}
```

Error example:

```json
{
  "data": null,
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "This track is temporarily unavailable.",
    "retryable": true
  }
}
```

## Error taxonomy

- `INVALID_REQUEST`
- `UNAUTHENTICATED`
- `FORBIDDEN`
- `FEATURE_DISABLED`
- `TRACK_NOT_FOUND`
- `TRACK_UNAVAILABLE`
- `PROVIDER_RATE_LIMITED`
- `PROVIDER_TIMEOUT`
- `PROVIDER_UNAVAILABLE`
- `PLAYBACK_RESOLUTION_FAILED`
- `IMPORT_CONFLICT`
- `INTERNAL_ERROR`

Provider errors must be mapped to these stable codes.

## Security controls

- Server-only environment access.
- Zod or current project validator for all input.
- Rate limit search, import, and playback resolution separately.
- Restrict import operations by role and ownership.
- Do not allow arbitrary proxy URLs.
- Do not accept provider base URLs from the browser.
- Log request IDs and normalized error codes without leaking tokens or temporary URLs.

## Caching

- Search: short TTL with normalized cache key.
- Track metadata: moderate TTL, stale-while-revalidate if consistent with project infrastructure.
- Playback resolution: no-store or very short private cache.
- Feature/config response: current application standard.

## Dependencies

- Provider adapter and registry.
- Canonical track/provider-reference persistence.
- Authentication and authorization helpers.
- Existing observability utilities.
- Feature flag service or environment configuration.

## Acceptance criteria

- APIs return provider-neutral contracts.
- Unauthorized imports fail consistently.
- Duplicate imports are idempotent.
- Provider timeout does not hang the request indefinitely.
- Playback resolution never stores temporary stream URLs.
- Integration tests cover success and normalized failures.
