# 01 — Executive Overview

## Product decision

Tourify should not build Audius, SoundCloud, and Bandcamp as separate player products. It should build a **provider-agnostic music platform** with a consistent Tourify experience and provider-specific execution modes.

## Business value

- Artists can bring existing catalogs into Tourify without re-uploading everything.
- Tourify profiles and EPKs become living distribution hubs rather than static link pages.
- Music posts, events, and marketplace items can share a common canonical release/track model.
- Mixed-provider playlists make Tourify useful to listeners even before the native catalog is large.
- Provider abstraction protects the product roadmap from a single service changing its API.
- Bandcamp links connect discovery to direct artist support and merch purchases.
- Analytics can measure which surfaces and providers drive engagement and outbound sales.

## Recommended scope by provider

### Tourify Native

Full control: upload, storage, playback, downloads where licensed, analytics, playlists, certification, sales, and future tokenized ownership features.

### Audius

First-class API-backed provider: search, catalog metadata, account authorization, tracks/releases/playlists, playback resolution, and provider actions permitted by Audius.

### SoundCloud

Hybrid provider:

- **Widget mode:** default broad playback path using the official embeddable player controlled through the Widget API.
- **API mode:** approved application use cases, OAuth connection, creator-authorized catalog management, metadata, and direct stream resolution where permitted.
- Required attribution and backlinks are product requirements, not optional decoration.

### Bandcamp

Embed and commerce provider:

- Official album/track player embeds.
- Canonical release and artist links.
- Support/purchase/merch calls to action.
- Optional account, sales-report, or merchandise fulfillment APIs only for approved label/partner accounts.
- No generalized catalog scraping or raw streaming adapter.

## Product principles

1. One queue and player shell, multiple playback runtimes.
2. One canonical track/release model, many provider references.
3. Source attribution stays visible.
4. Users control which provider connections and imports are displayed.
5. Tourify never claims ownership of third-party content.
6. External providers may fail; native Tourify workflows must remain functional.
7. Commerce and streaming are related but separate capability domains.

## Success measures

- Provider connection success rate.
- Time from connection to first imported/referenced release.
- Playback start success and time-to-audible by provider.
- Mixed-queue transition success.
- Imported catalog duplicate rate.
- Profile/EPK play-through and outbound support clicks.
- Provider error rate and rate-limit utilization.
- Percentage of active artists with at least one connected music source.

## Non-goals for first release

- Mirroring provider audio files into Tourify storage.
- Offline playback of third-party content.
- Replacing SoundCloud or Bandcamp social/community experiences.
- Processing Bandcamp purchases natively without an approved integration.
- Cross-provider write operations such as uploading a Tourify track to every provider.
- Automatic artist identity matching based only on names.

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
