# 23 — Codex/Cursor Build-Agent Prompt

Copy this prompt into the coding agent with the complete document suite and repository access.

---

You are implementing the **Tourify Music Provider Ecosystem** in the existing Tourify repository. The initial providers are Tourify Native, Audius, SoundCloud, and Bandcamp. You must use the repository's real architecture and current official provider documentation as the source of truth.

## Non-negotiable rules

1. **Audit before editing.** Create a complete audit and confirmed file map before provider/player feature code.
2. **Non-destructive integration.** Preserve native music, uploads, playlists, posts, profiles, EPKs, analytics, and marketplace flows.
3. **Additive Supabase migrations only.** Never reset, drop, rename, truncate, or destructively repurpose production schema.
4. **Provider abstraction.** Product UI and global queue use canonical Tourify contracts. Raw provider payloads stay inside adapters.
5. **Capability-driven design.** Do not pretend all providers support the same features.
6. **No scraping or stream extraction.** Never scrape SoundCloud/Bandcamp, bypass embeds, capture streams, or reverse engineer playback.
7. **Temporary URLs are ephemeral.** Resolve at playback time and never persist or log them.
8. **Provider terms are requirements.** Verify official docs and terms on the day implementation begins; record URLs, date, and decisions.
9. **Feature flags and rollback.** Every provider operation is independently disableable. Native playback remains available.
10. **Progress JSON is mandatory.** Create `docs/music-providers/implementation-progress.json` from the supplied template and update it continuously.
11. **No hidden pre-existing failures.** Record baseline failures separately.
12. **No speculative file edits.** Confirm file targets through repository inspection.
13. **Acting-account authorization.** Reuse existing Tourify membership/employer/account resolution helpers for all mutations.
14. **Do not expose secrets.** Provider secrets/tokens remain server-only and encrypted according to repository standards.

## Required first phase: audit

Inspect:

- Framework versions, package manager, scripts, environment management, deployment/runtime, feature flags, logging, tracing, cache, rate limiting, and testing.
- Global player mount, state/store/context, audio library, queue, persistence, mobile controls, Media Session, route changes, autoplay, and error handling.
- Music/track/release/playlist types, database tables, storage, uploads, signed URLs, analytics, and public visibility.
- Artist dashboard, public profiles, EPK, feed composer/cards, event pages, discovery/search, marketplace, and admin diagnostics.
- Supabase migrations, RLS, generated types, functions, queues/cron, token storage patterns, and account authorization helpers.
- Existing provider, iframe, oEmbed, Audius, SoundCloud, or Bandcamp code.

Run baseline repository commands for install verification, lint, typecheck, tests, build, smoke/E2E, and migration validation where available.

Create:

- `docs/music-providers/AUDIT_REPORT.md`
- `docs/music-providers/ARCHITECTURE_MAP.md`
- `docs/music-providers/ARCHITECTURE_DECISIONS.md`
- `docs/music-providers/BASELINE_VALIDATION.md`
- `docs/music-providers/implementation-progress.json`

Stop and record blockers only when credentials or external approval make a specific operation impossible. Continue all independent phases with flags disabled rather than abandoning the program.

## Provider facts to re-verify

### Audius

Official API/SDK support search, tracks, users, playlists, streaming, and authenticated operations. Use the current SDK/API and protect backend bearer tokens.

### SoundCloud

- OAuth 2.1 with PKCE.
- Official Widget API provides embedded playback control and events.
- Direct stream requests have documented application rate limits.
- Terms require uploader and SoundCloud attribution/backlinks, prohibit offline API content, restrict commercial uses, and require deletion after revocation in applicable cases.
- Implement Widget and API modes separately. Keep API mode disabled unless credentials, approval, legal scope, quota monitoring, and deletion are complete.

### Bandcamp

- General integration should use official user-provided embeds and canonical links.
- Official developer APIs are described for labels and merchandise fulfillment partners and require access approval.
- Do not scrape pages or derive raw audio streams.

## Implementation phases

### Phase 1 — Canonical contracts and registry

- Reuse existing types where safe.
- Add provider IDs, capabilities, canonical track/release/reference, playback descriptor, queue item, normalized errors, and optional interfaces.
- Wrap or adapt native playback first.
- Add provider registry and flags.

Acceptance:

- Existing native music compiles and functions.
- Provider can be disabled centrally.
- No generic component imports provider SDK types.

### Phase 2 — Additive schema

- Reconcile proposed provider connection/reference/import/sync entities with actual schema.
- Add unique keys, indexes, RLS, token isolation, analytics fields, and generated types.
- Add production-like migration and RLS tests.

Acceptance:

- No reset/destructive SQL.
- Existing rows preserved.
- Duplicate imports blocked.
- Public clients cannot access credentials.

### Phase 3 — Provider gateway

- Add common search, URL resolve, import/link, connection, sync, playback resolve, and diagnostics paths using repository conventions.
- Add validation, auth, acting-account authorization, request IDs, rate limits, timeouts, bounded retries, circuit breakers, and redacted logs.

Acceptance:

- Partial provider failure is normalized.
- Temporary playback responses are private/no-store.
- Idempotent writes return stable results.

### Phase 4 — Audius adapter

- Client/SDK, schemas, mapper, search, reference resolution, auth where needed, imports, playback resolution, health, and fixtures.

Acceptance:

- Native/Audius mixed queue works.
- No temporary stream persistence.

### Phase 5 — SoundCloud adapter

- Widget descriptor/runtime integration.
- API client and OAuth 2.1 PKCE connection.
- Attribution/backlink component.
- Token rotation and revocation/deletion.
- Quota telemetry and API-to-Widget fallback policy.
- Terms/policy guards in code/config.

Acceptance:

- Widget events map safely to player state.
- Attribution cannot be accidentally omitted.
- API mode is independently flagged.
- Quota exhaustion does not break other providers.

### Phase 6 — Bandcamp adapter

- Validate user-supplied track/album URL or official embed.
- Store structured sanitized embed configuration and canonical commerce links.
- Render official iframe.
- Add external support/merch actions.
- Stub approved partner APIs behind disabled flags only if useful.

Acceptance:

- No scraping or hidden stream code.
- Invalid origins/HTML rejected.
- External checkout clear.

### Phase 7 — Global player/runtime host

- Separate queue orchestration from runtimes.
- Add state machine, cancellation, stale event protection, one-active-runtime invariant, safe persistence, and provider-limited controls.
- Implement native, resolved stream, SoundCloud Widget, and Bandcamp embed runtimes.

Acceptance:

- Native regression green.
- Rapid mixed-provider switching does not overlap or race.
- Provider disablement yields recoverable UI.

### Phase 8 — Library, import, sync, search, and playlists

- Music Sources dashboard.
- Unified library and source priority.
- Idempotent imports and duplicate review.
- Federated search within actual capabilities.
- Mixed-provider playlists/queue.
- Disconnect/delete flows.

Acceptance:

- Repeated sync/import is safe.
- Bandcamp remote search is not fabricated.
- User controls source visibility and priority.

### Phase 9 — Product surfaces

- Public profile.
- EPK.
- Feed attachments.
- Event pages.
- Marketplace and Bandcamp support/storefront links.
- Reusable provider-aware canonical cards.

Acceptance:

- One canonical entity works across surfaces.
- Mandatory provider attribution survives themes/templates.

### Phase 10 — Analytics, security, operations

- Playback/import/support telemetry.
- Provider status/quota dashboards and alerts.
- CSP, embed sanitization, token encryption, deletion, audit logs, incident runbooks.

Acceptance:

- No secrets/temporary URLs in logs or analytics.
- Security, RLS, deletion, and incident tests pass.

### Phase 11 — Rollout

- Dark deploy.
- Internal.
- Audius design partners.
- SoundCloud Widget beta.
- SoundCloud API limited beta only after approval.
- Bandcamp embed/storefront beta.
- Mixed queue beta.
- GA after Definition of Done.

## Progress JSON protocol

Before a task:

- set status `in_progress`
- record confirmed file targets
- record dependencies and blockers

After a task:

- record changed files and migrations
- record commands and exact results
- record acceptance criteria evidence
- record decisions/deviations
- set `complete` only when evidence passes

Never mark a phase complete because code was written. Mark it complete only after its acceptance criteria and required tests pass.

## Coding standards

- Follow repository formatting, naming, imports, and architectural conventions.
- TypeScript strict; avoid `any` except validated provider boundaries with justification.
- Runtime validate external payloads.
- Keep server/client boundaries explicit.
- Prefer small composable functions and stable domain types.
- Avoid duplicate auth, account-context, logging, and rate-limit utilities.
- Lazy-load provider SDKs/widgets.
- Add comments for policy or provider-specific behavior, not obvious code.
- Write tests with fixtures; do not depend solely on live APIs.

## Final handoff

Provide:

- completed progress JSON
- audit and architecture decisions
- migration list and validation output
- changed-file inventory
- test/build evidence
- environment variable documentation without secret values
- provider credential/approval blockers
- rollout and rollback instructions
- known limitations and future tasks

---

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
