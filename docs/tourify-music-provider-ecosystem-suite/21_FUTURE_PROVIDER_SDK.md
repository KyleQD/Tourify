# 21 — Future Provider SDK

## Goal

Make future providers a bounded adapter project rather than a global player rewrite.

## Provider package template

```text
providers/<provider>/
  README.md
  config.ts
  capabilities.ts
  client.ts
  schemas.ts
  mapper.ts
  adapter.ts
  auth.ts             # optional
  playback.ts         # optional
  embed.ts            # optional
  errors.ts
  fixtures/
  tests/
```

## Onboarding checklist

1. Legal and terms review.
2. Official API/SDK/embed availability.
3. Authentication model.
4. Playback mode and DRM/stream restrictions.
5. Attribution requirements.
6. Rate limits and pricing.
7. Data retention/deletion requirements.
8. Commerce capability.
9. Search and playlist support.
10. Feature flags and rollback mode.
11. Fixtures and contract tests.
12. Operational owner.

## Certification tests

A provider cannot register in production unless it passes:

- capability contract
- error normalization
- timeout/cancellation
- no-secret logging
- runtime lifecycle
- attribution rendering
- disabled-state behavior
- migration/data review
- security checklist

## Candidate future providers

Spotify, Apple Music, YouTube/YouTube Music, Mixcloud, Deezer, TIDAL, Beatport, and distributor/catalog partners should be evaluated independently. Their existence does not imply Tourify has playback rights or API eligibility.

## Design rule

Do not expand `MusicProviderId` and ship UI until the provider has a documented capability matrix and terms decision. Unsupported providers can initially be modeled as external listen links without playback.

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
