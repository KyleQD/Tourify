# 10 — SoundCloud Provider Adapter

## Recommended dual-mode architecture

### Mode A — SoundCloud Widget

Default broadly available playback integration.

- Render official SoundCloud iframe.
- Control it through the Widget API.
- Normalize widget events into Tourify player events.
- Preserve required attribution, uploader credit, and permalink.
- Do not remove provider advertising or required notices.

### Mode B — SoundCloud API

Use only for approved application functionality and permitted content scope.

- OAuth 2.1 with PKCE.
- Short-lived token and single-use refresh-token handling per current docs.
- Metadata, authorized account catalog, uploads or management only where the Tourify product and app approval permit.
- Direct stream resolution only after legal/product review and capacity validation.

## Why both modes are needed

The official Widget reduces direct play-request quota pressure and offers a compliant embedded experience. API mode enables deeper connected-account workflows but carries authentication, deletion, commercial-use, rate-limit, and attribution obligations.

## Module design

```text
providers/soundcloud/
  config.ts
  api-client.ts
  widget-descriptor.ts
  oauth.ts
  schemas.ts
  mapper.ts
  adapter.ts
  terms-policy.ts
  quota.ts
  errors.ts
  fixtures/
```

## OAuth requirements

- Authorization Code + PKCE.
- Validate state and redirect URI.
- Encrypt tokens at rest.
- Rotate single-use refresh tokens atomically.
- Handle token family invalidation and reconnect state.
- Revoke/delete stored SoundCloud personal data on disconnect or access revocation as required.

## Quota strategy

- Track remaining play requests and reset time.
- Widget mode should remain available when API stream quota is constrained.
- Do not retry `429` aggressively.
- Add admin warning thresholds.
- Load test against realistic provider capacity before beta expansion.

## Compliance requirements

- Credit uploader.
- Credit SoundCloud as source.
- Link visibly to `permalink_url` for relevant sounds.
- No offline access or stream capture.
- No scraping.
- No reselling provider service/content.
- Commercial placement of third-party content requires careful review; prioritize connected uploader-owned content for commercial profile/EPK contexts.
- Do not imitate the overall SoundCloud product experience.

## Acceptance criteria

- Widget runtime maps ready/play/pause/progress/finish/error safely.
- Attribution and backlinks are always present where required.
- Revoking a connection invalidates Tourify access and schedules deletion of associated provider data.
- API and Widget modes have independent feature flags.
- Rate-limit exhaustion does not break native/Audius/Bandcamp playback.

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
