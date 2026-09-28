# 14 — Playlist, Queue, and Collections

## Mixed-provider playlists

A playlist stores canonical track references, not stream URLs. Each item records provider preference and safe fallback references.

## Playlist schema additions

Reuse existing playlist tables. Add only if required:

- canonical track/release reference
- provider reference preference
- added-by user
- position/order key
- availability snapshot
- source surface

## Queue behavior

- Resolve current item only.
- Optionally prefetch safe metadata for the next item, not temporary audio URLs unless provider rules and TTL safely permit it.
- Stop and destroy prior runtime on mode switch.
- Skip unavailable entries only according to user setting; otherwise show actionable error.
- Maintain clear provider attribution in queue list.

## Bandcamp entries

Bandcamp embed entries may require the user to interact with the official player. Queue progression can be limited if no reliable official ended event exists. The UI should state this rather than faking completion.

## Collections/favorites

Tourify favorite means a Tourify relationship to a canonical track. It does not automatically favorite/repost on the provider unless an authenticated, explicit user action and provider capability permit it.

## Playlist writing back to providers

Out of scope for initial release. Future adapters may implement provider playlist writes only through explicit user confirmation and capability checks.

## Acceptance criteria

- One playlist contains native, Audius, SoundCloud, and Bandcamp references.
- Queue persistence contains no temporary provider URLs.
- Runtime transitions do not overlap audio.
- Unsupported provider actions are absent or clearly disabled.

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
