# 12 — Library Import and Sync

## Artist-facing Music Sources dashboard

Recommended sections:

- Tourify Native
- Audius
- SoundCloud
- Bandcamp
- Connection status
- Catalog count
- Last sync
- Provider health
- Display priority
- Disconnect/remove actions

## Import modes

### Account sync

Available only where provider auth and scopes permit. User chooses all or selected releases/tracks.

### Search and add

Available for Audius and approved SoundCloud search.

### Paste link/embed

Available for all providers; primary Bandcamp path.

### Manual canonical entry

Artist can create a release record and attach provider links without importing provider metadata.

## Duplicate detection hierarchy

1. Exact provider + external ID.
2. Normalized canonical provider URL.
3. ISRC/UPC when supplied and trustworthy.
4. Existing artist/release ownership relationship.
5. Normalized title/artist/duration similarity as a review suggestion only.

Never auto-merge solely on fuzzy title/artist similarity.

## Source priority

A canonical track may have multiple references. Artist chooses:

- primary playback source
- fallback playback source
- preferred purchase/support source
- display links

If primary source is unavailable, player may offer a verified fallback without silently changing attribution.

## Sync behavior

- Cursor-based and resumable.
- Provider-specific schedules.
- Lock per connection to prevent concurrent duplicate sync.
- Upsert by provider identity.
- Soft mark missing/unavailable content; do not immediately delete canonical records.
- User review for destructive removals.
- Track last source modification time when available.

## Disconnect behavior

Offer separate actions:

- Disconnect authorization but keep public references.
- Remove provider references from profile.
- Delete imported provider metadata and personal data.

Explain impact before execution and honor provider deletion obligations.

## Acceptance criteria

- Re-running imports produces no duplicate provider references.
- Artists can control source priority and visibility.
- Sync failures are resumable and visible.
- Disconnect does not delete Tourify-native audio or unrelated canonical records.

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
