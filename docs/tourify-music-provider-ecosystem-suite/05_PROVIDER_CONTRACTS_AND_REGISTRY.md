# 05 — Provider Contracts and Registry

## Canonical types

```ts
export type MusicProviderId =
  | 'tourify_native'
  | 'audius'
  | 'soundcloud'
  | 'bandcamp'

export type PlaybackMode =
  | 'native_audio'
  | 'resolved_stream'
  | 'soundcloud_widget'
  | 'bandcamp_embed'
  | 'external_only'

export interface CanonicalTrack {
  id: string
  providerPrimary: MusicProviderId
  title: string
  displayArtist: string
  artistAccountId?: string
  releaseId?: string
  durationMs?: number
  artworkUrl?: string
  explicit?: boolean
  isPlayable: boolean
  availability: 'available' | 'unavailable' | 'restricted' | 'unknown'
  providerReferences: ProviderReference[]
}

export interface ProviderReference {
  provider: MusicProviderId
  entityType: 'track' | 'release' | 'playlist' | 'artist' | 'store_item'
  externalId?: string
  canonicalUrl: string
  playbackMode: PlaybackMode
  metadataVersion?: string
  lastVerifiedAt?: string
}

export interface PlaybackDescriptor {
  canonicalTrackId: string
  provider: MusicProviderId
  mode: PlaybackMode
  expiresAt?: string
  streamUrl?: string
  widgetUrl?: string
  embedConfig?: Record<string, unknown>
  attribution: {
    creator: string
    providerLabel: string
    canonicalProviderUrl: string
  }
}
```

## Adapter contracts

Separate optional interfaces so unsupported capabilities are explicit:

```ts
interface BaseProviderAdapter {
  id: MusicProviderId
  capabilities(): ProviderCapabilities
  resolveReference(input: ProviderReferenceInput): Promise<ProviderEntity>
  healthCheck(): Promise<ProviderHealth>
}

interface SearchProvider {
  search(query: SearchQuery): Promise<SearchPage>
}

interface PlaybackProvider {
  resolvePlayback(input: PlaybackRequest): Promise<PlaybackDescriptor>
}

interface AccountProvider {
  getAuthorizationUrl(input: AuthStart): Promise<string>
  exchangeAuthorization(input: AuthCallback): Promise<ProviderConnection>
  refreshConnection(connectionId: string): Promise<void>
  revokeConnection(connectionId: string): Promise<void>
}

interface SyncProvider {
  syncCatalog(input: SyncRequest): Promise<SyncResult>
}
```

## Provider registry

Responsibilities:

- Register adapters by provider ID.
- Check server and account-level flags.
- Return capability-safe interfaces.
- Reject unsupported operations before provider calls.
- Attach standard timeout, tracing, metrics, and error mapping middleware.
- Expose provider status to admin diagnostics.

## Error model

```ts
export type ProviderErrorCode =
  | 'PROVIDER_DISABLED'
  | 'UNSUPPORTED_OPERATION'
  | 'AUTH_REQUIRED'
  | 'AUTH_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'CONTENT_RESTRICTED'
  | 'PLAYBACK_BLOCKED'
```

UI receives stable codes and safe messages. Raw provider bodies remain server-side and are redacted in logs.

## Versioning and compatibility

- Add `contractVersion` to provider fixtures and optional stored metadata.
- Make additions backward compatible.
- Never make generic components depend on a provider-only field.
- Deprecate through adapters rather than rewriting stored rows immediately.

## Acceptance criteria

- Native and external queue entries use the same canonical queue type.
- Capability checks prevent unsupported Bandcamp search or playlist write controls.
- Provider errors can be tested without network calls.
- Registry can disable one provider while others continue.

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
