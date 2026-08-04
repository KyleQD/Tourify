set client_min_messages = warning;

-- P4 Migration: Full-text search on marketplace_listings
-- Adds a generated tsvector column + GIN index over title, description,
-- category, and tags so the discover route can use to_tsquery instead of
-- ILIKE for ranked full-text search.

alter table public.marketplace_listings
  add column if not exists search_vector tsvector
    generated always as (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
      setweight(to_tsvector('english', array_to_string(coalesce(tags, '{}'), ' ')), 'D')
    ) stored;

create index if not exists idx_marketplace_listings_search_vector
  on public.marketplace_listings using gin (search_vector);

comment on column public.marketplace_listings.search_vector is
  'Generated tsvector for full-text search. Weighted: title=A, category=B, description=C, tags=D';
