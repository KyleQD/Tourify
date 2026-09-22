# 04 — System Architecture

## Logical architecture

```text
Product Surfaces
(Profile / EPK / Feed / Events / Search / Marketplace / Playlists)
        |
Canonical Music Components + Hooks
        |
Music Domain Services
(Library / Search / Queue / Import / Analytics / Commerce Links)
        |
Provider Gateway + Registry + Capability Negotiation
        |
+----------------+----------------+----------------+----------------+
| Tourify Native | Audius Adapter | SoundCloud     | Bandcamp       |
| Runtime        | Stream Runtime | API + Widget   | Embed + Store  |
+----------------+----------------+----------------+----------------+
        |
Global Player Orchestrator + Provider Runtime Host
        |
Supabase persistence / jobs / telemetry / feature flags
```

## Architectural layers

### Canonical domain layer

Owns Tourify IDs and normalized metadata. It never exposes provider payload shape to the product.

### Provider adapter layer

Maps provider operations into canonical contracts, validates external responses, enforces capabilities, and normalizes failures.

### Provider runtime layer

Performs playback:

- `NativeAudioRuntime`
- `ResolvedStreamRuntime`
- `SoundCloudWidgetRuntime`
- `BandcampEmbedRuntime`
- `ExternalActionRuntime` for non-playable commerce/release links

### Orchestration layer

Owns one active queue, one current entry, transitions, cancellation, persisted safe state, analytics session, and provider runtime switching.

### Product integration layer

Uses reusable canonical cards and actions. It asks capability services what to display.

## Core data flow: playback

1. User selects canonical track/release.
2. Player queues a safe canonical reference.
3. Registry selects provider and runtime mode.
4. Backend resolves any ephemeral descriptor.
5. Runtime starts playback or displays approved embed.
6. Runtime events normalize into player events.
7. Analytics records provider, source surface, timing, and result.
8. On transition, prior runtime is stopped/destroyed before the next starts.

## Core data flow: import/link

1. Artist connects an account or supplies a provider URL.
2. Backend validates authorization and source.
3. Adapter resolves metadata.
4. Duplicate detector searches provider key, canonical URL, ISRC where available, and normalized fingerprint.
5. User reviews merge/link decision.
6. Backend writes canonical record and provider reference in one transaction where possible.
7. Sync state is scheduled only if the provider supports it.

## Availability and resilience

- Provider circuit breakers prevent repeated slow failures.
- Search returns partial results with provider status.
- Queues allow retry, skip, or open externally.
- Provider disablement does not delete canonical records.
- Cached metadata has bounded TTL and source timestamps.
- Player resolution responses are no-store and short-lived.

## Candidate module structure

Confirm or adapt during audit:

```text
lib/music/domain/
  provider-types.ts
  canonical-track.ts
  capabilities.ts
lib/music/providers/
  registry.ts
  native/
  audius/
  soundcloud/
  bandcamp/
lib/music/player/
  orchestrator.ts
  runtimes/
  analytics-session.ts
app/api/music/
  search/route.ts
  tracks/[id]/playback/route.ts
  imports/route.ts
  providers/[provider]/connect/**
components/music/
  global-player.tsx
  runtime-host.tsx
  track-card.tsx
  provider-badge.tsx
  source-manager.tsx
```

## Architecture decision records required

- Canonical track ownership and merge policy.
- Native player compatibility approach.
- Queue persistence boundary.
- SoundCloud Widget vs API selection logic.
- Bandcamp embed storage/sanitization approach.
- Background job implementation.
- Token encryption mechanism.
- Feature flag source of truth.

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
