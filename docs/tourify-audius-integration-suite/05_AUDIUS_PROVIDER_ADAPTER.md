# 05 — Audius Provider Adapter

## Purpose

Encapsulate every Audius-specific concern behind the Tourify music provider interface. No global player or general UI component should call Audius directly.

## Audit and current API verification

Before implementation, verify Audius’s current official API documentation, endpoint behavior, authentication requirements, stream URL rules, rate limits, attribution requirements, and discovery-node recommendations. Record the verified date and documentation references in the implementation log.

## Adapter responsibilities

- Discover or select a healthy Audius API host using current supported guidance.
- Search tracks.
- Fetch individual track and artist metadata.
- Resolve playable stream sources.
- Normalize artwork, duration, artist identity, canonical URL, and availability.
- Map provider failures to Tourify error codes.
- Apply timeouts, safe retries, and observability.

## Internal files

```text
lib/music/providers/audius/
  audius-adapter.ts
  audius-client.ts
  audius-config.ts
  audius-mappers.ts
  audius-schemas.ts
  audius-errors.ts
  audius-health.ts
  __tests__/
```

Use repository naming conventions where different.

## Client design

- One low-level HTTP client.
- Abort controller on every request.
- Configurable timeout.
- Bounded retry for idempotent metadata calls only.
- Host failover only when supported and tested.
- Parse responses using runtime schemas.
- Strip or ignore unknown fields.

## Normalization

Map Audius records into Tourify types.

Required fields:

- External track ID.
- Title.
- Artist display name.
- External artist ID when available.
- Duration in milliseconds.
- Artwork URL or normalized artwork candidates.
- Canonical Audius URL.
- Explicit/provider metadata only when legally and product-relevant.
- Availability status.

Do not store large raw responses by default. A bounded metadata JSON snapshot may be stored for diagnostics and future mapping, but only after security and schema review.

## Playback resolution

- Resolve the current supported Audius stream mechanism at request time.
- Return a `PlaybackDescriptor` to the server API.
- Avoid exposing secrets or internal host-selection details.
- Do not persist resolved URLs.
- Confirm browser media compatibility and CORS behavior in tests.

## Health and resilience

`healthCheck()` should provide a lightweight signal for operational dashboards, not run on every playback request.

Suggested state:

- `healthy`
- `degraded`
- `unavailable`

Implement metrics for latency, timeout, HTTP status family, schema errors, and fallback host usage.

## Configuration

Example server-only variables; exact names should follow project standards.

```text
AUDIUS_ENABLED=false
AUDIUS_API_BASE_URL=
AUDIUS_APP_NAME=Tourify
AUDIUS_REQUEST_TIMEOUT_MS=8000
AUDIUS_METADATA_CACHE_TTL_SECONDS=300
AUDIUS_PLAYBACK_RESOLVE_TIMEOUT_MS=8000
```

Do not hardcode provider hosts if official guidance recommends discovery or configurable hosts.

## Testing

- Contract tests with captured, sanitized fixtures.
- Mapper tests for missing artwork, duration, artist, and unavailable tracks.
- Timeout and rate-limit tests.
- Host failure/failover tests where applicable.
- Playback descriptor validation.
- No-network unit tests for deterministic CI.

## Acceptance criteria

- Adapter fully implements the provider contract.
- Audius payload changes fail safely through schema validation.
- All provider errors are normalized.
- No direct Audius calls remain in UI or global player code.
- Adapter can be replaced or disabled through registry configuration.
