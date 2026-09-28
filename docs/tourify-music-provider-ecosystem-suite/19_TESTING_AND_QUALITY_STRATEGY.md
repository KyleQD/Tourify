# 19 — Testing and Quality Strategy

## Test pyramid

### Unit tests

- Provider mappers and runtime schemas.
- Capability negotiation.
- URL normalization and embed sanitization.
- Duplicate detection.
- Error mapping.
- Player state reducer/state machine.
- Analytics milestone deduplication.

### Contract tests

Fixtures representing official provider response shapes. Fail when required fields or mappings drift.

### Integration tests

- Gateway auth and acting-account authorization.
- Import transaction/idempotency.
- RLS behavior.
- OAuth state/PKCE and refresh rotation.
- Playback resolution no-store behavior.
- Partial federated search failure.

### Player/runtime tests

- Native audio.
- Audius resolved stream.
- SoundCloud Widget event bridge using a controlled test harness.
- Bandcamp embed host lifecycle.
- Rapid switching and stale events.
- One active runtime guarantee.

### E2E flows

1. Artist connects/imports Audius and publishes a track.
2. Artist connects SoundCloud and adds an authorized track or Widget link.
3. Artist pastes Bandcamp release and publishes embed/storefront.
4. Listener creates a mixed-provider queue.
5. Listener navigates routes while playback state remains safe.
6. Provider becomes unavailable and user skips/retries.
7. Artist disconnects provider and data is removed appropriately.
8. Feed/EPK/event/marketplace cards resolve the same canonical release.

### Migration and RLS tests

- Apply from production-like baseline.
- Preserve existing counts and native records.
- Test duplicate constraints.
- Test public, owner, member, admin, and service-role access.

### Accessibility

- Keyboard navigation.
- Screen reader names/states.
- Focus management for source/import dialogs.
- iframe titles.
- reduced motion and responsive/mobile layouts.

### Performance

- Initial bundle impact.
- Lazy loading provider SDKs/widgets.
- Search fanout latency.
- Player time-to-audible.
- Memory cleanup after iframe/runtime changes.
- Quota/load simulation.

## Test gates by phase

Each phase lists commands and evidence in progress JSON. No phase is complete with skipped critical tests unless the blocker is explicitly approved.

## Acceptance criteria

- Native regression suite is green.
- No simultaneous audio in stress tests.
- External network tests are supplemented by deterministic fixtures.
- Provider-disabled states are covered.
- Security and deletion tests are automated.

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
