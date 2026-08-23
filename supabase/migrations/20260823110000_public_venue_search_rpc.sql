-- ═══════════════════════════════════════════════════════════════
-- VEN-286 — normalized, ranked, indexed public venue search.
--
-- One SECURITY DEFINER entry point for the /venues directory so ranking is
-- deterministic and computed in the database (index-friendly) instead of
-- ad-hoc PostgREST ordering:
--   rank 0  exact name match (case-insensitive)
--   rank 1  name starts with query
--   rank 2  name/city contains query
--   rank 3  no query (browse mode)
--   then verified-first, newest-first.
--
-- Authorization: definer rights are safe because every returned row is
-- filtered to is_public = true and the column list is the public card DTO —
-- no private field can leak regardless of caller. EXECUTE revoked from PUBLIC
-- and granted explicitly (anon + authenticated), mirroring the VEN-011/083
-- hardening pattern.
--
-- Supporting indexes cover browse mode and prefix searches. Idempotent;
-- rollback: drop function + indexes.
-- ═══════════════════════════════════════════════════════════════

create index if not exists idx_venue_profiles_public_created
  on public.venue_profiles (created_at desc)
  where is_public = true;

create index if not exists idx_venue_profiles_public_city
  on public.venue_profiles (lower(city))
  where is_public = true;

create or replace function public.search_public_venues(
  p_q             text    default null,
  p_type          text    default null,
  p_city          text    default null,
  p_min_capacity  integer default null,
  p_max_capacity  integer default null,
  p_amenities     text[]  default null,
  p_bookable      boolean default null,
  p_page          integer default 1,
  p_page_size     integer default 20
)
returns table (
  id                  uuid,
  venue_name          text,
  url_slug            text,
  description         text,
  city                text,
  state               text,
  capacity            integer,
  capacity_total      integer,
  venue_types         text[],
  avatar_url          text,
  verification_status text,
  total_count         bigint,
  rank                integer
)
language sql
security definer
set search_path = 'public'
stable
as $$
  WITH filtered AS (
    SELECT vp.*
    FROM public.venue_profiles vp
    WHERE vp.is_public = true
      AND (p_type IS NULL OR vp.venue_types @> ARRAY[p_type])
      AND (p_city IS NULL OR vp.city ILIKE '%' || p_city || '%')
      AND (
        p_min_capacity IS NULL
        OR COALESCE(vp.capacity_total, vp.capacity, 0) >= p_min_capacity
      )
      AND (
        p_max_capacity IS NULL
        OR COALESCE(vp.capacity_total, vp.capacity, 0) <= p_max_capacity
      )
      AND (p_amenities IS NULL OR vp.amenities @> p_amenities)
      AND (
        p_bookable IS DISTINCT FROM true
        OR vp.settings ->> 'allow_bookings' = 'true'
      )
      AND (
        p_q IS NULL OR btrim(p_q) = ''
        OR vp.venue_name ILIKE '%' || btrim(p_q) || '%'
        OR vp.description ILIKE '%' || btrim(p_q) || '%'
        OR vp.city ILIKE '%' || btrim(p_q) || '%'
      )
  ),
  ranked AS (
    SELECT f.*,
      count(*) OVER () AS total_count,
      CASE
        WHEN p_q IS NULL OR btrim(p_q) = ''                    THEN 3
        WHEN lower(f.venue_name)  =  lower(btrim(p_q))         THEN 0
        WHEN f.venue_name ILIKE btrim(p_q) || '%'              THEN 1
        WHEN f.venue_name ILIKE '%' || btrim(p_q) || '%'
          OR f.city       ILIKE btrim(p_q) || '%'              THEN 2
        ELSE 4
      END AS rank
    FROM filtered f
  )
  SELECT r.id, r.venue_name, r.url_slug, r.description, r.city, r.state,
         r.capacity, r.capacity_total, r.venue_types, r.avatar_url,
         r.verification_status, r.total_count, r.rank
  FROM ranked r
  ORDER BY r.rank ASC,
           (r.verification_status = 'verified') DESC NULLS LAST,
           r.created_at DESC
  LIMIT LEAST(GREATEST(p_page_size, 1), 50)
  OFFSET GREATEST(p_page - 1, 0) * LEAST(GREATEST(p_page_size, 1), 50);
$$;

revoke execute on function public.search_public_venues(text, text, text, integer, integer, text[], boolean, integer, integer) from public;
grant execute on function public.search_public_venues(text, text, text, integer, integer, text[], boolean, integer, integer) to anon;
grant execute on function public.search_public_venues(text, text, text, integer, integer, text[], boolean, integer, integer) to authenticated;

-- Validation notes (run after apply):
--   EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM public.search_public_venues('echo', NULL, NULL, NULL, NULL, NULL, NULL, 1, 20);
--   -- must show index usage on venue_profiles for the browse path and
--   -- deterministic ordering; rank 0 rows precede rank 1, etc.
--   SELECT search_public_venues(NULL, NULL, NULL, NULL, NULL, NULL, false, 1, 5);
