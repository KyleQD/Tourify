-- =============================================================================
-- VEN-014 — Venue slug audit & repair (additive, idempotent)
--
-- The 20260721120000 backfill only filled NULL/empty url_slug values. This
-- migration repairs MALFORMED slugs (uppercase, spaces, punctuation, leading/
-- trailing dashes) to the canonical format ^[a-z0-9]+(-[a-z0-9]+)*$, records
-- every old→new mapping in venue_slug_history (redirect preservation, and the
-- foundation for VEN-289's public redirect table), and reports counts.
--
-- Never destructive: original slugs are preserved in history before rewrite.
-- =============================================================================

-- ── History / redirect mapping ───────────────────────────────────────────────
create table if not exists public.venue_slug_history (
  id               uuid primary key default gen_random_uuid(),
  venue_profile_id uuid not null references public.venue_profiles(id) on delete cascade,
  old_slug         text not null,
  new_slug         text not null,
  reason           text not null default 'repair' check (reason in ('repair','rename','manual')),
  created_at       timestamptz not null default now()
);

comment on table public.venue_slug_history is
  'Old→new slug mappings for Venue profiles (VEN-014 repairs, VEN-289 renames). Server-side redirect resolution reads this table; slugs are public data.';

create index if not exists idx_venue_slug_history_old_slug
  on public.venue_slug_history (old_slug);

alter table public.venue_slug_history enable row level security;

drop policy if exists venue_slug_history_public_read on public.venue_slug_history;
create policy venue_slug_history_public_read
  on public.venue_slug_history
  for select
  using (true);

-- Writes are service-role only (migrations + server-side rename service).

-- ── Repair pass: malformed slugs only ────────────────────────────────────────
DO $$
DECLARE
  rec        RECORD;
  base_slug  TEXT;
  candidate  TEXT;
  suffix     INT;
  repaired   INT := 0;
  skipped    INT := 0;
BEGIN
  FOR rec IN
    SELECT id, url_slug
    FROM public.venue_profiles
    WHERE url_slug IS NOT NULL
      AND btrim(url_slug) <> ''
      AND url_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ORDER BY created_at NULLS LAST, id
  LOOP
    -- Canonical normalization: lowercase, non-alnum runs → single dash, trim.
    base_slug := lower(regexp_replace(rec.url_slug, '[^a-z0-9]+', '-', 'g'));
    base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');

    IF base_slug IS NULL OR base_slug = '' THEN
      -- Nothing usable left after normalization (e.g. slug was "???").
      base_slug := 'venue-' || substr(replace(rec.id::text, '-', ''), 1, 8);
    END IF;

    candidate := base_slug;
    suffix    := 0;
    WHILE EXISTS (
      SELECT 1 FROM public.venue_profiles other
      WHERE other.url_slug = candidate AND other.id <> rec.id
    ) OR EXISTS (
      SELECT 1 FROM public.venue_slug_history h
      WHERE h.new_slug = candidate AND h.venue_profile_id <> rec.id
    ) LOOP
      suffix    := suffix + 1;
      candidate := base_slug || '-' || suffix::text;
    END LOOP;

    INSERT INTO public.venue_slug_history (venue_profile_id, old_slug, new_slug, reason)
    VALUES (rec.id, rec.url_slug, candidate, 'repair');

    UPDATE public.venue_profiles SET url_slug = candidate WHERE id = rec.id;
    repaired := repaired + 1;
  END LOOP;

  RAISE NOTICE 'VEN-014 slug repair: % repaired, % already-canonical rows untouched',
    repaired,
    (SELECT count(*) FROM public.venue_profiles
      WHERE url_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
  skipped := skipped; -- silence unused warning
END $$;

-- ── Validation queries (run after applying) ─────────────────────────────────
-- 1. Zero malformed remain:
--      select count(*) from venue_profiles
--      where url_slug is not null and url_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$';
-- 2. Uniqueness holds (unique index from 20260721120000 enforces):
--      select url_slug, count(*) from venue_profiles group by 1 having count(*) > 1;
-- 3. Every repair has a redirect mapping:
--      select count(*) from venue_slug_history where reason='repair';
-- 4. Double-run idempotency: re-execute migration; step counts unchanged.
--
-- Rollback: restore prior slugs via venue_slug_history (reverse mapping), then
-- drop the table. No other schema dependencies exist.
