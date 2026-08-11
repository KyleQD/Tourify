# 13 — Federated Search and Discovery

## Search architecture

Tourify search fans out to enabled providers in parallel through the provider gateway and merges normalized results.

```ts
interface FederatedSearchResult {
  results: CanonicalSearchItem[]
  providerStatus: Record<MusicProviderId, {
    status: 'ok' | 'partial' | 'disabled' | 'unsupported' | 'error'
    nextCursor?: string
  }>
}
```

## Supported scope

- Tourify Native: full indexed search.
- Audius: provider API search.
- SoundCloud: approved API search.
- Bandcamp: no general remote search assumed; search only Tourify-linked Bandcamp references already in the database.

## Merge and ranking

Rank using:

- exact text match
- Tourify artist relationship
- verified artist ownership
- provider availability
- user follows and location/event context
- engagement quality
- recency
- explicit user provider filters

Do not unfairly prefer a provider because its API returns more items.

## Result presentation

Each result shows:

- title, artist, artwork
- provider source
- playability mode
- support/purchase action where relevant
- imported/already-linked state for artist users
- unavailable or external-only state

## Caching and abuse prevention

- Debounce client queries.
- Minimum meaningful query length.
- Server rate limiting.
- Short provider-specific cache.
- No cross-user exposure of private connected-account data.
- Provider query budget and timeout.

## Failure UX

A failed provider becomes a small status notice while successful results remain usable. The response never treats Bandcamp's lack of general search as an outage.

## Acceptance criteria

- Search returns partial results when one provider times out.
- Provider labels and action capabilities are accurate.
- Bandcamp results come only from authorized/linked Tourify data unless an approved API later exists.
- Pagination cursors remain provider-specific behind the gateway.

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
