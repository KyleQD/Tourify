# 00 — Master Implementation Roadmap

## Mission

Create a stable Tourify Music Provider Ecosystem that supports native Tourify audio, Audius, SoundCloud, and Bandcamp through one canonical domain model and one global queue/player orchestration layer, while honoring provider-specific playback constraints.

## Target outcome

A listener can encounter music in an artist profile, EPK, feed post, event page, marketplace listing, search result, or playlist and send it to the same global Tourify player. The queue can contain multiple providers. The player delegates actual playback to the appropriate provider runtime while preserving a consistent Tourify shell, queue, analytics, accessibility, and route persistence.

## Phase 0 — Repository audit and baseline

### Work

- Map existing player mounts, stores/contexts, audio elements, queue types, persistence, Media Session hooks, mobile controls, and route transitions.
- Identify canonical music tables, storage buckets, APIs, GraphQL/Genql operations, analytics events, artist library surfaces, EPK blocks, post attachments, and marketplace schemas.
- Inspect account-context and authorization helpers.
- Inventory all migrations and RLS policies touching music.
- Run baseline install, lint, typecheck, tests, and production build.
- Search for existing Audius, SoundCloud, Bandcamp, iframe, oEmbed, or provider fields.

### Deliverables

- `docs/music-providers/AUDIT_REPORT.md`
- `docs/music-providers/ARCHITECTURE_MAP.md`
- `docs/music-providers/BASELINE_VALIDATION.md`
- `docs/music-providers/implementation-progress.json`

### Gate

No provider or player feature code begins until the audit lists confirmed files, reusable abstractions, pre-existing failures, and migration strategy.

## Phase 1 — Canonical domain contracts and provider registry

### Work

- Define `MusicProviderId`, `PlaybackMode`, `CanonicalTrack`, `CanonicalRelease`, `ProviderReference`, `PlaybackDescriptor`, `ProviderCapabilities`, `ProviderError`, and adapter interfaces.
- Wrap Tourify-native playback as an adapter or compatibility implementation.
- Add a provider registry and capability negotiation.
- Add server/client feature flag helpers.

### Gate

- Native tracks compile through the canonical contracts.
- No UI component requires a raw provider payload.
- A disabled provider cannot be invoked from UI or backend routes.

## Phase 2 — Additive persistence and migrations

### Work

- Add provider accounts/connections.
- Add provider references for tracks, releases, playlists, and storefront items.
- Add normalized imported catalog records only where current tables cannot safely represent them.
- Add sync cursors, health state, import jobs, and provider-aware analytics fields.
- Add unique constraints, indexes, RLS, and generated types.

### Gate

- All migrations apply to a production-like database without reset.
- Existing native rows remain valid.
- Re-running import/link operations does not duplicate records.

## Phase 3 — Backend provider gateway

### Work

- Implement provider registry on the server.
- Add common routes/server actions for search, resolve, import/link, account connection, sync status, and playback resolution.
- Add provider-specific OAuth callbacks only where supported and approved.
- Apply validation, authorization, rate limiting, caching, request IDs, timeouts, retries, and error normalization.

### Gate

Provider-specific code is reachable only through common gateway contracts except inside provider modules.

## Phase 4 — Audius adapter

### Work

- SDK/API client, search, metadata, account connection, imports, playlist/release mapping, playback resolution, attribution, health checks, and fixtures.

### Gate

Audius tracks play in a mixed queue and can be imported idempotently without persisting temporary streams.

## Phase 5 — SoundCloud adapter

### Work

- Implement an approved API mode and an official Widget mode.
- Use OAuth 2.1 with PKCE for connected accounts.
- Support metadata, creator-authorized imports/links, widget control/event mapping, attribution, and rate-limit telemetry.
- Do not design around unlimited direct stream requests; the documented play limit is a hard capacity input.

### Gate

- Widget playback works without hiding required SoundCloud attribution.
- API mode is restricted to approved use cases and can be disabled independently.
- User revocation/deletion paths remove stored SoundCloud data as required.

## Phase 6 — Bandcamp adapter

### Work

- Validate Bandcamp track/album URLs supplied by users.
- Store safe canonical URLs and user-provided embed configuration.
- Render official player embeds and storefront/merch links.
- Add approved label/fulfillment APIs only after Bandcamp grants access.
- Treat playback as `embedded_player`, not a raw stream.

### Gate

No Bandcamp HTML scraping or hidden stream extraction exists. Purchases leave Tourify or use an explicitly approved fulfillment integration.

## Phase 7 — Global player engine refactor

### Work

- Separate queue orchestration from provider playback runtimes.
- Add native audio, remote stream, SoundCloud Widget, and Bandcamp embed runtimes.
- Normalize play/pause/progress/ended/error events where technically possible.
- Support unresolved, loading, blocked, unavailable, and external-action states.
- Preserve queue, shuffle, repeat, volume, Media Session, route persistence, and accessibility.

### Gate

Native playback regression suite passes and mixed-provider transitions do not race or play two providers simultaneously.

## Phase 8 — Library, sync, search, and playlists

### Work

- Build Music Sources and Library dashboard.
- Implement provider connection/linking, import review, duplicate detection, source priority, sync jobs, and disconnect behavior.
- Build federated search with provider filters and legal result boundaries.
- Enable mixed-provider playlists and queue entries.

### Gate

Artists can manage sources and listeners can use one search/queue while provider limits remain visible and respected.

## Phase 9 — Product surface integration

### Work

- Artist profile music sections.
- EPK featured releases, albums, tracks, and listen/support actions.
- Feed music attachments.
- Event music/lineup cards.
- Bandcamp storefront and merch links in marketplace.
- Shared provider-aware card components.

### Gate

Every surface renders from canonical records, not provider JSON, and handles provider disablement gracefully.

## Phase 10 — Analytics, security, and operations

### Work

- Provider-aware playback milestones, source surfaces, resolver latency, errors, widget events, outbound commerce clicks, and sync metrics.
- Token encryption, deletion/revocation, CSP/frame policies, consent, audit logs, incident runbooks, and quotas.

### Gate

No token or temporary URL appears in client logs, database rows, or analytics payloads. Provider health is observable independently.

## Phase 11 — Staged rollout

1. Dark deployment with all provider flags off.
2. Internal Tourify accounts.
3. Selected artist design partners.
4. Audius general beta.
5. SoundCloud Widget beta; API mode only after approval and load validation.
6. Bandcamp embed/storefront beta.
7. Mixed-provider playlists.
8. General availability after stage gates.

## Critical dependency graph

```text
Audit
  -> Canonical contracts + native adapter
  -> Additive schema
  -> Provider gateway
  -> Provider adapters
  -> Playback runtimes/global player
  -> Library/search/playlists
  -> Product surfaces
  -> Analytics/security/operations
  -> Staged rollout
```

## Program risks

| Risk | Impact | Primary mitigation |
|---|---|---|
| SoundCloud terms or app approval restrict desired behavior | High | Widget-first fallback, creator-owned content scope, legal review, isolated flags |
| SoundCloud stream request quota is insufficient | High | Widget playback, caching metadata only, quota dashboards, staged traffic |
| Bandcamp lacks a general streaming/catalog API | High | Official embeds and user-supplied links; approved partner API only |
| Global player refactor breaks native playback | Critical | Native adapter first, regression harness, compatibility layer, phased switch |
| Duplicate catalog records | Medium | provider/external unique keys, fingerprinting, merge review, idempotency keys |
| Provider outages interrupt queues | Medium | timeout, skip/retry UX, fallback provider references, provider circuit breakers |
| Tokens leak to browser or logs | Critical | server-only secrets, encrypted token storage, redaction tests, secret scanning |

## Required progress discipline

Every task must record status, confirmed files, migrations, validation commands, test results, decisions, blockers, and rollback notes in `implementation-progress.json`. A phase is not complete until all acceptance criteria are evidenced.

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
