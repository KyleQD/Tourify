# 06 — Database and Supabase Migrations

## Migration strategy

Use new timestamped additive migrations. Reuse existing tables where they already model the concepts safely. The names below are conceptual and must be reconciled with the repository audit.

## Proposed additive entities

### `music_provider_connections`

Stores a Tourify account's authorized provider connection.

Key fields:

- `id uuid primary key`
- `owner_account_id uuid not null`
- `provider text not null`
- `provider_user_id text`
- `display_name text`
- `status text`
- `scopes text[]`
- `access_token_ciphertext text` — only if repository encryption standards allow DB storage
- `refresh_token_ciphertext text`
- `token_expires_at timestamptz`
- `last_synced_at timestamptz`
- `revoked_at timestamptz`
- timestamps

Unique active connection constraint should reflect whether multiple identities per provider are allowed.

### `music_provider_references`

Links canonical Tourify entities to provider entities.

- canonical entity ID/type
- provider
- external ID when stable
- canonical URL
- playback mode
- source ownership state
- availability
- bounded normalized metadata JSONB
- metadata source timestamp
- last verified timestamp

Unique keys:

- `(provider, external_id, entity_type)` when external ID exists
- normalized URL uniqueness where appropriate
- one primary provider reference per canonical entity only if product rules require it

### `music_import_jobs`

Tracks imports and background syncs:

- provider connection
- operation type
- cursor
- idempotency key
- status
- counts
- safe error summary
- started/completed timestamps

### `music_provider_sync_state`

Provider-specific cursor and health state without mixing it into canonical track rows.

### Analytics extensions

Prefer adding nullable `provider`, `playback_mode`, `source_surface`, `provider_external_id`, and `playback_session_id` to existing event storage rather than a duplicate analytics stack.

## Optional canonical extensions

Only after audit confirms need:

- `primary_provider`
- `availability_status`
- `canonical_source_url`
- `is_external_reference`

All added columns should be nullable or safely defaulted so existing rows remain valid.

## RLS model

- Public users can read only published canonical music and public-safe provider references.
- Artists/organizations can manage references owned by their acting account.
- Tokens and secret connection fields are never exposed through public tables or client-selectable views.
- Service-role/background workers use narrowly scoped server paths.
- Admin inspection should use audited privileged functions, not broad client bypass.

## Token storage

Preferred order:

1. Existing secrets/encrypted credential service.
2. Server-side encrypted columns with key rotation and no client access.
3. Do not store tokens until secure storage exists.

## Migration validation

- Apply from a production-like schema snapshot.
- Confirm no table reset or destructive statement.
- Verify existing counts and representative native rows before/after.
- Test unique constraints and idempotent import behavior.
- Test all RLS roles.
- Regenerate Supabase/GraphQL types.
- Run rollback-by-disablement exercise; schema remains additive.

## Example migration sequence

```text
001_add_provider_connections.sql
002_add_provider_references.sql
003_add_import_jobs_and_sync_state.sql
004_add_provider_analytics_fields.sql
005_add_rls_and_indexes.sql
006_backfill_native_provider_references_optional.sql
```

Backfill is optional and must be batched, resumable, and safe to re-run.

## Acceptance criteria

- Existing native data and playback are unchanged after migration.
- Duplicate provider imports are blocked at the database and service layers.
- Public clients cannot read tokens or private sync data.
- Disconnect/revocation can remove provider personal data without deleting unrelated Tourify records.

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
