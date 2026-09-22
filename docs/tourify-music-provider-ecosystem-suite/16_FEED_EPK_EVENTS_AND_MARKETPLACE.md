# 16 — Feed, EPK, Events, and Marketplace Integration

## Shared music attachment model

Feed posts, EPK blocks, event cards, and marketplace listings reference canonical music entities. They do not copy provider metadata snapshots into each feature except for bounded rendering caches.

## Feed

- Composer action: `Attach music`.
- Select from artist library or supported provider search.
- Render a unified card with provider source and permitted actions.
- Opening playback uses global player/runtime host.
- Sharing preserves canonical Tourify URL with provider attribution.

## EPK

Blocks:

- Featured release
- Track list
- Album grid
- Playlist
- Listen-on links
- Support/merch panel

Templates style the Tourify shell, but may not obscure mandatory SoundCloud/Bandcamp branding or controls.

## Events

- Attach performer releases/tracks to lineup and event promotion.
- Play from event page through the global player.
- Track event-to-music engagement separately.
- Do not automatically imply licensing for venue playback or public performance.

## Marketplace

### Bandcamp

- Link albums, digital purchases, vinyl, CDs, cassettes, merch, and subscriptions.
- Clearly label external checkout.
- Record outbound clicks.
- Approved fulfillment API is a later separate workstream.

### Native Tourify

Native merch and music checkout remain independent. Do not redirect a native listing because a Bandcamp reference exists unless seller chose Bandcamp as fulfillment source.

## Analytics continuity

Every surface passes `sourceSurface`, `sourceEntityId`, campaign context, and canonical music ID to the player or outbound link tracker.

## Acceptance criteria

- One canonical release can appear in profile, EPK, feed, event, and marketplace without duplicate source records.
- Provider terms/branding remain intact across templates.
- External checkout is unmistakable.
- Deleting a post does not delete the canonical release.

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
