# 18 — Security, Privacy, and Compliance

## Threat model

- OAuth token theft.
- Cross-account catalog modification.
- Malicious iframe/embed input.
- Provider URL SSRF/open redirect.
- Playback URL leakage.
- XSS through provider metadata.
- Rate-limit abuse and credential exhaustion.
- False artist ownership claims.
- Scraping or stream-ripping implementation drift.
- Over-retention after provider disconnect.

## Controls

### Authentication and authorization

- OAuth state and PKCE.
- Server-only token exchange.
- Acting-account authorization for imports and source settings.
- Step-up/recent authentication for disconnect or credential changes where repository patterns support it.

### Credential protection

- Encrypt at rest.
- Never send refresh tokens to the browser.
- Redact authorization headers and provider responses.
- Secret scanning and automated log tests.
- Rotation/revocation runbook.

### URL and embed safety

- Strict provider hostname allowlists.
- HTTPS only.
- Normalize redirects through safe server validation.
- Store structured embed config, not arbitrary HTML.
- CSP `frame-src` allowlist for official widget/embed origins.
- Sandbox iframe only where compatible with provider functionality.

### Content and rights

- Clear source attribution.
- No ownership transfer implied.
- User attestation for linked catalog management.
- Copyright/reporting path integrated with existing Tourify policy.
- No public-performance licensing claim for events/venues.

### Privacy and deletion

- Document provider personal data stored.
- Allow connection revocation.
- Remove data required by provider terms and user request.
- Keep non-personal canonical public links only when legally permitted and clearly sourced.
- Retention schedule for import jobs and provider errors.

## SoundCloud-specific compliance gate

Before general release, legal/product review must approve:

- commercial placement of content
- whether content is uploader-owned/authorized
- attribution/backlink implementation
- deletion workflow
- Widget/API mode use
- quota and fallback plan

## Bandcamp-specific compliance gate

- Official embed only.
- No scraping or hidden streams.
- API access documented per account.
- External checkout language accurate.

## Acceptance criteria

- Security tests prove tokens and playback URLs are absent from logs/storage.
- RLS rejects cross-account writes.
- Embed sanitizer rejects arbitrary HTML and non-approved origins.
- Disconnect/deletion workflow is tested end-to-end.

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
