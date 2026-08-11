# Venue Account Creation 500 Error — Fix Plan

## Top-Level Overview

Creating a venue account from `/create` fails with a 500 because the service layer attempts to insert a `url_slug` column into `venue_profiles` that does not exist in the live database. The `generateUniqueSlug` utility also SELECTs against that same non-existent column, so the error surfaces before the INSERT even runs.

The fix is a single Supabase migration that adds the `url_slug` column (plus unique index) to `venue_profiles`, matching the pattern already applied to `artist_profiles`.

---

## Sub-Tasks

### Task 1 — Add `url_slug` column to `venue_profiles`

- **Intent:** Provide the missing column so that both the uniqueness-check query inside `generateUniqueSlug` and the subsequent INSERT in `createVenueAccount` succeed.
- **Expected Outcomes:**
  - `venue_profiles.url_slug TEXT` column exists, nullable, with a unique partial index (matching `artist_profiles`).
  - Existing rows are backfilled with a slug derived from `venue_name` (or a `venue-<id>` fallback), so no existing rows have a NULL slug after migration.
  - A new venue account can be created from `/create` without a 500 error.
- **Todo List:**
  1. Apply a migration named `venue_profiles_url_slug` using `mcp__supabase__apply_migration`.
  2. Migration SQL:
     - `ALTER TABLE public.venue_profiles ADD COLUMN IF NOT EXISTS url_slug TEXT;`
     - Backfill existing rows: set `url_slug` = slugified `venue_name` with numeric suffix on collision (same algorithm as `20260711013130_artist_profiles_url_slug.sql`).
     - `CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_profiles_url_slug ON public.venue_profiles (url_slug) WHERE url_slug IS NOT NULL;`
- **Relevant Context:**
  - Column is inserted by [`createVenueAccount`](lib/services/account-management.service.ts:698)
  - Uniqueness is checked by [`generateUniqueSlug`](lib/accounts/generate-unique-slug.ts:41) — queries `venue_profiles.url_slug`
  - Identical pattern (add column + backfill + unique index) is in [`20260711013130_artist_profiles_url_slug.sql`](supabase/migrations/20260711013130_artist_profiles_url_slug.sql)
  - Live `venue_profiles` columns confirmed via `information_schema.columns` — no `url_slug` present
- **Status:** [ ] pending

---

## Notes

- No application code changes are needed. The service and slug utility are correct; only the schema is behind.
- `venue_name` is `NOT NULL` in the live schema, so the backfill will always produce a usable base slug.
- The migration is fully idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS`).
