# 17 — Analytics and Telemetry

## Event taxonomy

### User/product events

- `music_provider_connect_started`
- `music_provider_connect_completed`
- `music_provider_connect_failed`
- `music_import_started`
- `music_import_completed`
- `music_import_duplicate_detected`
- `music_play_requested`
- `music_play_resolved`
- `music_play_started`
- `music_play_progress_25|50|75`
- `music_play_completed`
- `music_play_failed`
- `music_provider_opened`
- `music_support_clicked`
- `music_store_item_clicked`

### Operational metrics

- provider request latency
- provider error rate by normalized code
- playback time-to-audible
- widget ready latency
- stream resolution success
- rate-limit remaining/reset
- token refresh success
- sync lag and job failures
- circuit-breaker state

## Common properties

- canonical track/release ID
- provider
- playback mode
- provider external ID where permitted
- source surface and source entity
- playback session ID
- anonymous/user/account ID under existing privacy rules
- request ID
- app version and device class
- error code

Never include tokens, temporary stream URLs, full embed HTML, or unnecessary personal data.

## Milestone deduplication

- One event per playback session and milestone.
- Server or durable client idempotency key.
- Do not infer Bandcamp completion when the embed does not expose a reliable completion event.
- Distinguish outbound click from purchase.

## Dashboards

- Provider reliability comparison.
- Playback funnel by provider and surface.
- Artist connection/import adoption.
- Rate-limit and quota dashboard.
- Bandcamp support/merch click-through.
- Native vs external engagement.

## Alerts

- Provider error spike.
- SoundCloud quota threshold.
- Token refresh failure spike.
- Increased player overlap/concurrency errors.
- Import duplicate anomaly.
- Playback time-to-audible regression.

## Acceptance criteria

- Provider failures can be isolated without exposing secrets.
- Product analytics do not overstate unsupported completion or purchases.
- Existing analytics consumers remain backward compatible.

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
