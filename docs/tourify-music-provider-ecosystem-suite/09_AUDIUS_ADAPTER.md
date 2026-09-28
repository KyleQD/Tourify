# 09 — Audius Provider Adapter

## Target scope

Audius is the most complete external provider for initial first-class integration.

### Capabilities

- Search users, tracks, releases/albums, and playlists.
- Resolve public provider references.
- Stream tracks through official API/SDK behavior.
- Connect Audius accounts where product flows require authenticated actions.
- Import/link track and release metadata.
- Display attribution and canonical Audius links.
- Sync selected artist catalog content.

## Module design

```text
providers/audius/
  config.ts
  client.ts
  schemas.ts
  mapper.ts
  adapter.ts
  auth.ts
  errors.ts
  fixtures/
  adapter.test.ts
```

## Implementation requirements

- Use current official SDK/API and pin a reviewed version.
- Keep bearer tokens server-only; public API key usage must follow official guidance.
- Validate every external response with runtime schemas.
- Use abort timeouts and bounded retries.
- Normalize Audius IDs and URLs.
- Cache metadata with source timestamps.
- Resolve stream URLs at playback time.
- Record provider latency and status without logging URLs.

## Import behavior

- Search or paste Audius URL.
- Preview canonical metadata.
- Detect existing provider reference.
- Allow link to existing Tourify release or create canonical reference.
- Do not duplicate native files or imply Tourify owns the audio.

## Account behavior

- Separate “connected Audius account” from “verified Tourify artist ownership.”
- Record scopes and revocation state.
- Remove provider personal data after disconnect where required.

## Acceptance criteria

- Fixture tests cover search, mapping, missing artwork, restricted content, timeout, malformed response, and rate limiting.
- A mixed native/Audius queue plays correctly.
- Temporary playback URL is never stored or logged.
- Provider outage produces a recoverable player state.

## Official provider references verified for this plan

Verification date: **2026-08-03**. The implementation agent must re-check these references before coding because provider policies and APIs can change.

- Audius API and SDK: https://docs.audius.co/api/ and https://docs.audius.co/sdk/
- SoundCloud API guide: https://developers.soundcloud.com/docs
- SoundCloud Widget API: https://developers.soundcloud.com/docs/api/html5-widget
- SoundCloud rate limits: https://developers.soundcloud.com/docs/api/rate-limits
- SoundCloud API Terms: https://developers.soundcloud.com/docs/api/terms-of-use
- Bandcamp developer API: https://bandcamp.com/developer
- Bandcamp embedded player help: https://get.bandcamp.help/en/articles/15263071-how-do-i-create-a-bandcamp-embedded-player

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
