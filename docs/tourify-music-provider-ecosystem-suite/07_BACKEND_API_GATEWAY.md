# 07 — Backend API Gateway

## Goal

Expose provider-neutral Tourify endpoints while keeping provider credentials, policy logic, response validation, and temporary playback resolution on the server.

## Proposed operations

### Search

`GET /api/music/search?q=&providers=&cursor=`

Returns canonical search result envelopes with per-provider status. Partial provider failure does not fail the entire search.

### Resolve provider URL

`POST /api/music/provider-references/resolve`

Validates a user-supplied Audius/SoundCloud/Bandcamp URL and returns reviewable normalized metadata.

### Import/link

`POST /api/music/imports`

Requires authenticated acting-account authorization and an idempotency key. Supports merge/link/new decisions.

### Playback resolution

`POST /api/music/tracks/:id/playback`

Returns a short-lived descriptor. Response must be private/no-store. Never returns credentials.

### Provider connection

- `/api/music/providers/:provider/connect`
- `/api/music/providers/:provider/callback`
- `/api/music/providers/:provider/disconnect`
- `/api/music/providers/:provider/sync`

Only expose operations supported by the provider and approved app configuration.

### Provider diagnostics

Admin-only status, quota, latency, token refresh, and circuit-breaker visibility. Never reveal secrets.

## Gateway middleware

- Input validation with repository-standard runtime schemas.
- Authentication and acting-account authorization.
- CSRF/state/PKCE verification for OAuth.
- Per-user, per-account, per-IP, and per-provider rate limiting as appropriate.
- Request IDs and distributed trace context.
- Abort timeouts.
- Bounded retries only for idempotent requests.
- Circuit breaker and provider health metrics.
- Cache metadata, never expiring playback URLs unless explicitly safe and bounded.
- Structured redacted errors.

## Caching

| Data | Suggested policy |
|---|---|
| Provider metadata | bounded TTL with stale-while-revalidate if terms allow |
| Search results | short TTL; provider-specific |
| Connection status | short private cache |
| Playback descriptor | private/no-store or verified ultra-short cache |
| Provider capability config | server config cache |
| Bandcamp embed configuration | durable safe metadata after validation |

## Idempotency

Generate or accept keys for:

- import/link
- sync page processing
- analytics milestones
- webhook processing
- disconnect/revocation jobs

Persist result status so retries return the prior safe result.

## Acceptance criteria

- Generic endpoints contain no provider-specific response shape.
- Unauthorized cross-account imports are rejected.
- Search degrades partially when one provider fails.
- Temporary URLs and OAuth tokens never appear in logs or persistent caches.
- All routes have contract tests covering validation and normalized errors.

## Cross-cutting implementation guardrails

- **Audit first:** all file targets in this suite are candidates until confirmed against the live Tourify repository.
- **Additive only:** do not reset Supabase; do not drop, rename, truncate, or repurpose production columns or tables.
- **Preserve native playback:** Tourify-hosted audio remains a first-class provider and the fallback path.
- **Normalize at the boundary:** provider payloads are mapped into Tourify domain contracts before entering UI, queue, analytics, or persistence layers.
- **Resolve playback just in time:** expiring or provider-controlled playback URLs are never stored in Supabase, local storage, analytics, logs, or durable queues.
- **Feature-flag every provider:** discovery, connection, import, display, playback, sync, and commerce can be disabled independently.
- **Provider terms override product preference:** the common Tourify UX must adapt to each provider's permitted playback and attribution model.
- **No scraping:** do not scrape Bandcamp or SoundCloud pages, extract hidden stream URLs, bypass embeds, or reverse engineer provider controls.
- **Acting-account authorization:** all mutations must use Tourify's existing account/organization/artist authorization helpers.
- **Idempotency:** imports, links, syncs, analytics milestones, and webhook processing must be safe to retry.
- **Observability without leakage:** log request IDs, provider, operation, latency, and normalized error code; redact tokens, personal data, and playback URLs.
- **Rollback without data loss:** disable flags and detach provider execution paths; retain additive data for later recovery unless a user requests deletion.
