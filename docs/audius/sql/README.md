# Audius Integration — SQL Files for Manual Execution

Run these three files **in order** in the Supabase SQL Editor (or via `psql`).  
All changes are **additive** — no existing tables, columns, or rows are modified.

---

## Run Order

### Step 1 — Provider references table
**File:** `docs/audius/sql/01_music_provider_references.sql`

Creates the `music_provider_references` table, indexes, RLS policies, and the `updated_at` trigger.

```
Supabase Dashboard → SQL Editor → paste contents → Run
```

---

### Step 2 — Import audit table
**File:** `docs/audius/sql/02_music_provider_imports.sql`

Creates the `music_provider_imports` audit table, indexes, and RLS policies.  
**Must run after Step 1** (foreign key dependency on `music_provider_references`).

```
Supabase Dashboard → SQL Editor → paste contents → Run
```

---

### Step 3 — Validate
**File:** `docs/audius/sql/03_validate.sql`

Runs sanity-check queries. All result sets should be **empty** (0 rows), except:
- Query 5 (row counts by provider) — may be empty if no imports yet; that's fine.
- Query 7 (artist_music count) — should match your pre-migration count.
- Query 8 (engagement events count) — should match your pre-migration count.

```
Supabase Dashboard → SQL Editor → paste contents → Run
```

---

## What Each File Does

| File | Creates | Modifies | Drops |
|------|---------|----------|-------|
| `01_music_provider_references.sql` | `music_provider_references` table, 3 indexes, 4 RLS policies, 1 trigger function | Nothing | Nothing |
| `02_music_provider_imports.sql` | `music_provider_imports` table, 2 indexes, 3 RLS policies | Nothing | Nothing |
| `03_validate.sql` | Nothing | Nothing | Nothing (read-only validation) |

---

## Tables Created

### `public.music_provider_references`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `track_id` | `uuid` | FK → `artist_music.id` (cascade delete) |
| `provider` | `text` | `'tourify'` or `'audius'` |
| `external_track_id` | `text` | Audius track ID |
| `external_artist_id` | `text` | Audius artist ID (nullable) |
| `canonical_url` | `text` | Audius permalink (nullable) |
| `metadata` | `jsonb` | Bounded snapshot of provider metadata — **no stream URLs** |
| `metadata_version` | `integer` | Schema version for future migrations |
| `last_synced_at` | `timestamptz` | When metadata was last refreshed |
| `availability_status` | `text` | `'available'`, `'unavailable'`, `'unknown'` |
| `created_at` / `updated_at` | `timestamptz` | Auto-managed |

**Unique constraints:**
- `(provider, external_track_id)` — no two tracks can point to the same Audius ID
- `(track_id, provider)` — a track can only have one reference per provider

### `public.music_provider_imports`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `provider_reference_id` | `uuid` | FK → `music_provider_references.id` (cascade delete) |
| `imported_by` | `uuid` | FK → `auth.users.id` (nullable; set null on user delete) |
| `source_surface` | `text` | e.g. `'artist_music_manager'` |
| `import_context` | `jsonb` | Extra context — no PII, no stream URLs |
| `created_at` | `timestamptz` | Auto-managed |

---

## RLS Summary

| Table | Who can SELECT | Who can INSERT | Who can UPDATE |
|-------|---------------|----------------|----------------|
| `music_provider_references` | Public (for public tracks) + track owner | Track owner | Track owner |
| `music_provider_imports` | Importer + track owner | Authenticated user (own records) | — |

---

## Rollback

These migrations only **add** new tables. To roll back:

```sql
-- Only if needed to fully remove the integration tables.
-- Do NOT run this unless absolutely required — imported records will be lost.
drop table if exists public.music_provider_imports;
drop table if exists public.music_provider_references;
drop function if exists public.set_music_provider_references_updated_at();
```

The application rollback is flag-based: set `AUDIUS_ENABLED=false` in your environment.  
The tables can remain in place with no impact on native music playback.
