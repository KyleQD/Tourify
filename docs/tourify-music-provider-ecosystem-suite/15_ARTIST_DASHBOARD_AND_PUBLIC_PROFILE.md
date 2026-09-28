# 15 — Artist Dashboard and Public Profile

## Artist dashboard

### Music Sources

- Connect/link provider.
- View connection health and last sync.
- Import selected catalog.
- Paste track/release URL.
- Resolve duplicates.
- Choose primary playback and support sources.
- Hide/remove/disconnect.

### Library

Unified filters:

- Tracks
- Releases
- Playlists
- Native uploads
- Audius
- SoundCloud
- Bandcamp
- Playable/unavailable
- Published/draft

### Release editor

Canonical release data is edited once. Provider-specific fields live in source panels. Artists can control public visibility and link ordering.

## Public profile

Recommended sections:

- Featured Release
- Top Tracks
- Albums/EPs/Singles
- Playlists
- Listen On
- Support Artist / Merch

The same canonical components should support all profile templates and responsive variants.

## Ownership and verification

- A pasted public link is not proof the Tourify user owns the provider account.
- Verified provider connection may establish account control, subject to provider identity mapping.
- Management claims, analytics import, or privileged sync require verified ownership/authorization.
- Public links can still be displayed with a “linked” rather than “verified” status.

## Accessibility

- Provider announced in accessible labels.
- Controls have keyboard focus and state.
- Artwork includes meaningful alt text or is decorative.
- Widget/embed titles describe content.
- Unavailable and external checkout states are not color-only.

## Acceptance criteria

- Artist can add each provider using its supported workflow.
- Public profile plays or embeds content without exposing dashboard-only metadata.
- Provider disablement removes actions while preserving layout integrity.
- Duplicate imports show an existing-link state.

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
