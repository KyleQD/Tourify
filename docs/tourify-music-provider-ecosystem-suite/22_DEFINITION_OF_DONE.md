# 22 — Definition of Done

The program is complete only when all required items below have evidence in `implementation-progress.json`.

## Architecture

- [ ] Audit and architecture map are approved.
- [ ] Canonical contracts and provider registry exist.
- [ ] Native Tourify music uses or is compatible with the framework.
- [ ] Generic UI/player code consumes no raw provider payloads.
- [ ] Provider capabilities control available actions.

## Database

- [ ] Additive migrations apply without reset.
- [ ] Existing native rows remain valid.
- [ ] Provider references are unique/idempotent.
- [ ] RLS and token isolation tests pass.
- [ ] Generated types are current.

## Providers

- [ ] Audius adapter passes contract and playback tests.
- [ ] SoundCloud Widget mode works with required attribution.
- [ ] SoundCloud API mode is disabled unless approved and fully operational.
- [ ] SoundCloud quota and deletion workflows are tested.
- [ ] Bandcamp uses official embeds/links only.
- [ ] Bandcamp external checkout is clear.

## Player

- [ ] Native regression suite passes.
- [ ] Mixed-provider queue works.
- [ ] One active runtime is guaranteed.
- [ ] Rapid switching and route transitions are safe.
- [ ] Temporary URLs are not persisted.
- [ ] Mobile, keyboard, Media Session, loading, error, and unavailable states work.

## Product surfaces

- [ ] Music Sources dashboard.
- [ ] Unified artist library.
- [ ] Public profile integration.
- [ ] EPK integration.
- [ ] Feed attachment integration.
- [ ] Event integration.
- [ ] Marketplace/Bandcamp support integration.
- [ ] Federated search within provider capabilities.
- [ ] Mixed-provider playlists.

## Analytics and operations

- [ ] Playback and import telemetry implemented.
- [ ] Provider health/quota dashboards implemented.
- [ ] Alerts and runbooks tested.
- [ ] Rollback drill completed.
- [ ] Support/admin diagnostics exist.

## Security and compliance

- [ ] Tokens encrypted and server-only.
- [ ] No temporary URL/token logging.
- [ ] CSP/embed sanitizer verified.
- [ ] Attribution and backlinks verified.
- [ ] Revocation/deletion tested.
- [ ] Legal/product approval recorded for SoundCloud scope.
- [ ] No scraping or stream-ripping code exists.

## Quality

- [ ] Lint, typecheck, unit, integration, E2E, build, migration, RLS, accessibility, and performance gates pass.
- [ ] Pre-existing failures are separated from introduced regressions.
- [ ] Documentation, env examples, and architecture decisions are current.
- [ ] All required progress tasks are complete or explicitly deferred with owner and rationale.

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
