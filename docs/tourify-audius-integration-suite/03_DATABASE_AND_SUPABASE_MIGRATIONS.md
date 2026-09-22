# 03 — Database & Supabase Migrations

## Migration policy

All migrations are additive and production-safe.

Forbidden actions:

- `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, destructive type conversion, or database reset.
- Renaming existing production columns without a compatibility period.
- Replacing an existing enum in a way that invalidates stored values.
- Adding non-null columns without safe defaults or backfill sequencing.
- Rewriting large tables in a single blocking transaction where avoidable.

## Audit first

Before writing SQL, identify:

- Current track, song, audio, release, album, playlist, post attachment, artist, and analytics tables.
- Existing provider/source columns.
- RLS policies and helper functions.
- Storage buckets used by music.
- Existing foreign-key patterns and soft-delete conventions.
- Whether IDs are UUID, bigint, text, or mixed.
- Whether the project uses generated Supabase types.

## Recommended additive model

Prefer a provider-reference table if the current track table is canonical.

```sql
create table if not exists public.music_provider_references (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  provider text not null,
  external_track_id text not null,
  external_artist_id text,
  canonical_url text,
  metadata jsonb not null default '{}'::jsonb,
  metadata_version integer not null default 1,
  last_synced_at timestamptz,
  availability_status text not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_track_id),
  unique (track_id, provider)
);
```

Names must be adapted to the actual schema. If a suitable integration table already exists, extend it additively rather than adding another one.

## Optional import records

Use an audit table if imports need actor and source tracking.

```sql
create table if not exists public.music_provider_imports (
  id uuid primary key default gen_random_uuid(),
  provider_reference_id uuid not null references public.music_provider_references(id) on delete cascade,
  imported_by uuid references auth.users(id) on delete set null,
  source_surface text,
  import_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

## Analytics additions

Prefer the existing analytics event table. Add provider context through nullable columns or JSON properties.

Possible additions:

```sql
alter table public.music_playback_events
  add column if not exists provider text,
  add column if not exists provider_track_id text,
  add column if not exists playback_session_id uuid,
  add column if not exists source_surface text,
  add column if not exists error_code text;
```

Do not create a second analytics system when one already exists.

## Indexes

Create indexes concurrently where project migration tooling and transaction rules permit.

- `(provider, external_track_id)` unique lookup.
- `(track_id, provider)` unique lookup.
- `last_synced_at` for stale metadata jobs.
- Playback events by track, provider, session, and timestamp.
- Partial indexes for active/non-deleted records if the schema uses soft deletion.

## RLS guidance

- Public read may be permitted for provider references linked to publicly visible tracks.
- Insert/update should be limited to owners, authorized artist managers, organization roles, or trusted service-role backend functions.
- Raw metadata must not expose private user data.
- Analytics insertion should use an existing secure event-ingestion path.
- Service-role usage must remain server-only.

## Migration sequence

1. Add provider reference table or nullable provider fields.
2. Add indexes and RLS policies.
3. Add helper view/function only if required.
4. Regenerate Supabase types.
5. Deploy code that can read both old and new records.
6. Enable write paths behind a flag.
7. Backfill only when a verified mapping exists.
8. Validate row counts, duplicates, and query plans.

## Backfill principles

- No speculative matching by artist or title alone.
- Store explicit provider IDs only after user selection or verified mapping.
- Process in small batches.
- Make backfill scripts idempotent and restartable.
- Log conflicts instead of overwriting records.

## Example validation SQL

```sql
select provider, count(*)
from public.music_provider_references
group by provider;

select provider, external_track_id, count(*)
from public.music_provider_references
group by provider, external_track_id
having count(*) > 1;

select r.id
from public.music_provider_references r
left join public.tracks t on t.id = r.track_id
where t.id is null;
```

## Rollback

Application rollback is flag-based. New tables and nullable columns remain in place. If a migration causes performance problems, disable Audius writes and reads, remove or replace only the newly added index/policy through a reviewed forward migration, and preserve imported records for later recovery.

## Acceptance criteria

- Migrations apply cleanly to a production-like clone.
- Existing rows require no changes to remain valid.
- Existing player queries continue to work.
- RLS tests cover authorized and unauthorized access.
- Migration and type generation are documented and reproducible.
