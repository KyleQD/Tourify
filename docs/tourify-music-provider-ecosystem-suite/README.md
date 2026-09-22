# Tourify Music Provider Ecosystem — Implementation Document Suite

This suite defines a provider-agnostic music architecture for Tourify with four initial provider modes:

1. **Tourify Native** — existing uploaded/hosted music.
2. **Audius** — API-backed discovery, metadata, account connection, and stream resolution.
3. **SoundCloud** — official API and Widget-backed playback, with scope constrained by SoundCloud terms and app approval.
4. **Bandcamp** — official embedded player, release/storefront links, merch commerce links, and optional approved account/sales APIs; no scraped playback.

The objective is not to build three unrelated integrations. It is to create a permanent provider framework supporting mixed-provider queues, playlists, artist libraries, profiles, EPKs, feed posts, analytics, and future providers without repeatedly refactoring the global player.

## Document index

- `00_MASTER_IMPLEMENTATION_ROADMAP.md`
- `01_EXECUTIVE_OVERVIEW.md`
- `02_REPOSITORY_AUDIT_REQUIREMENTS.md`
- `03_PROVIDER_CAPABILITY_MATRIX.md`
- `04_SYSTEM_ARCHITECTURE.md`
- `05_PROVIDER_CONTRACTS_AND_REGISTRY.md`
- `06_DATABASE_AND_SUPABASE_MIGRATIONS.md`
- `07_BACKEND_API_GATEWAY.md`
- `08_GLOBAL_PLAYER_ENGINE.md`
- `09_AUDIUS_ADAPTER.md`
- `10_SOUNDCLOUD_ADAPTER.md`
- `11_BANDCAMP_ADAPTER.md`
- `12_LIBRARY_IMPORT_AND_SYNC.md`
- `13_FEDERATED_SEARCH_AND_DISCOVERY.md`
- `14_PLAYLIST_QUEUE_AND_COLLECTIONS.md`
- `15_ARTIST_DASHBOARD_AND_PUBLIC_PROFILE.md`
- `16_FEED_EPK_EVENTS_AND_MARKETPLACE.md`
- `17_ANALYTICS_AND_TELEMETRY.md`
- `18_SECURITY_PRIVACY_AND_COMPLIANCE.md`
- `19_TESTING_AND_QUALITY_STRATEGY.md`
- `20_ROLLOUT_OPERATIONS_AND_ROLLBACK.md`
- `21_FUTURE_PROVIDER_SDK.md`
- `22_DEFINITION_OF_DONE.md`
- `23_CODEX_CURSOR_BUILD_AGENT_PROMPT.md`
- `implementation-progress.template.json`

## Recommended use

1. Give the entire folder to Codex/Cursor with repository access.
2. Start with the agent prompt.
3. Require the agent to create an audit report and populate the progress JSON before feature edits.
4. Review the provider capability matrix and architecture decisions after the audit.
5. Execute phases in the master roadmap order.

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

## Official provider references verified for this plan

Verification date: **2026-08-03**. The implementation agent must re-check these references before coding because provider policies and APIs can change.

- Audius API and SDK: https://docs.audius.co/api/ and https://docs.audius.co/sdk/
- SoundCloud API guide: https://developers.soundcloud.com/docs
- SoundCloud Widget API: https://developers.soundcloud.com/docs/api/html5-widget
- SoundCloud rate limits: https://developers.soundcloud.com/docs/api/rate-limits
- SoundCloud API Terms: https://developers.soundcloud.com/docs/api/terms-of-use
- Bandcamp developer API: https://bandcamp.com/developer
- Bandcamp embedded player help: https://get.bandcamp.help/en/articles/15263071-how-do-i-create-a-bandcamp-embedded-player
