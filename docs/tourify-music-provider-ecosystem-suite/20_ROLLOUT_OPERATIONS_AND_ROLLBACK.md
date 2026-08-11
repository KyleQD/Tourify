# 20 — Rollout, Operations, and Rollback

## Feature flags

Recommended independent flags:

- `music_provider_framework_enabled`
- `music_audius_search_enabled`
- `music_audius_playback_enabled`
- `music_soundcloud_widget_enabled`
- `music_soundcloud_api_enabled`
- `music_soundcloud_import_enabled`
- `music_bandcamp_embed_enabled`
- `music_bandcamp_storefront_enabled`
- `music_mixed_queue_enabled`
- `music_federated_search_enabled`
- `music_provider_sync_enabled`

Support global, environment, account, cohort, and emergency overrides using Tourify's existing flag system.

## Rollout stages

### Stage 0 — Dark infrastructure

Deploy schema, registry, adapters, diagnostics, and hidden UI with flags off.

### Stage 1 — Internal

Tourify staff and test accounts. Validate native regression and diagnostics.

### Stage 2 — Audius design partners

Small artist cohort. Focus on import, playback, profile, and queue reliability.

### Stage 3 — SoundCloud Widget

Use official widget first. Confirm attribution and mobile behavior.

### Stage 4 — SoundCloud API limited beta

Only after app credentials/approval, legal review, quota dashboard, and deletion workflow.

### Stage 5 — Bandcamp embed/storefront

Selected artists validate releases, responsive embeds, and support clicks.

### Stage 6 — Mixed-provider playlists and broader beta

Enable after one-active-runtime stress testing.

### Stage 7 — General availability

Require Definition of Done and operational owner signoff.

## Rollback hierarchy

1. Disable affected provider operation flag.
2. Force provider to safer runtime mode, e.g. SoundCloud API -> Widget.
3. Disable mixed queues while keeping provider cards/links.
4. Disable provider playback while retaining external links.
5. Restore prior player compatibility path.

Do not roll back by dropping tables or deleting imported data during an incident.

## Incident runbooks

- Provider outage.
- SoundCloud quota exhaustion.
- OAuth token refresh failure.
- Widget/embed origin failure.
- Player overlap or runaway audio.
- Leaked credential or playback URL.
- Invalid attribution deployment.
- Sync duplication.

## Operational ownership

Define owners for:

- provider credentials and relationships
- legal/terms review
- player runtime
- Supabase schema/RLS
- analytics/alerts
- customer support and artist import issues

## Stage metrics

- playback success > agreed threshold
- time-to-audible within target
- no native regression
- import duplicate rate below target
- provider error budget
- SoundCloud quota headroom
- support click tracking accuracy
- zero high-severity security findings

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
