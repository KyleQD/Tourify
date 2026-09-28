# 01 — Executive Overview

## Objective

Integrate Audius playback into Tourify so Audius tracks can be discovered, attached to Tourify artist and content records, queued, played through the global player, and measured using the same product experience as Tourify-hosted or other third-party music.

The implementation must preserve existing music uploads, playlists, artist profiles, posts, analytics, and player behavior. Audius is introduced as one provider within a provider-agnostic playback layer.

## Product outcomes

- Tourify artists can connect or reference Audius content without re-uploading audio.
- Audius tracks can appear in artist profiles, posts, playlists, feeds, search, and the global player.
- The global player can switch between Tourify-native and Audius-backed tracks without route interruption.
- Tourify retains its own canonical content records, permissions, presentation, attribution, and analytics.
- Provider failures degrade gracefully and do not break the rest of the player ecosystem.

## Non-goals for the first release

- Replacing Tourify’s native music storage or upload pipeline.
- Mirroring or permanently storing Audius audio files.
- Modifying Audius ownership, payout, moderation, or rights systems.
- Building a full two-way catalog synchronization engine.
- Claiming that Audius engagement equals Tourify-native streams for royalty purposes.

## Guiding implementation rules

1. Audit the repository and Supabase schema before changing code.
2. Extend existing abstractions where viable; do not create a parallel player ecosystem unless the current architecture cannot safely support providers.
3. Add columns, tables, indexes, views, and functions through timestamped migrations. Do not drop, rename, truncate, or reset production objects.
4. Store stable Audius identifiers and metadata references, not signed or temporary stream URLs.
5. Resolve playable stream URLs just in time through a server-side adapter.
6. Gate all user-facing behavior behind feature flags.
7. Record every implementation task in the progress JSON checklist.

## Success metrics

- Audius playback start success rate: at least 98% under normal provider availability.
- Existing non-Audius playback regression rate: zero known critical regressions.
- Global player state persists across supported navigation paths.
- API p95 latency remains within the defined budget for metadata and stream resolution.
- Analytics events distinguish provider, source surface, and playback outcome.
- Rollback can disable Audius without database rollback.

## Stakeholders

- Product: defines supported Audius user flows and rollout cohort.
- Engineering: audits, implements adapters, APIs, state management, UI, migrations, and tests.
- Data/Analytics: validates event schema and dashboards.
- Legal/Operations: validates attribution, branding, terms, privacy, and provider restrictions.
- Support: receives operational runbooks and failure-state guidance.

## Primary risks

- Audius API or discovery-node availability changes.
- Existing player architecture is tightly coupled to one track schema.
- Browser autoplay and media-session differences.
- Temporary stream URL handling or accidental caching.
- Duplicate artist or track records across providers.
- Analytics inflation caused by retries or repeated player events.

## Release recommendation

Implement in phases: audit, contracts, persistence, provider adapter, APIs, player refactor, UI, analytics, testing, internal rollout, limited beta, and general availability. The release should remain reversible through flags and provider routing configuration.
