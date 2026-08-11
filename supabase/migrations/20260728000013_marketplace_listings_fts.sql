set client_min_messages = warning;

-- P4 Migration: Full-text search on marketplace_listings
-- Adds a tsvector column + GIN index over title, description, category, and
-- tags so the discover route can use to_tsquery instead of ILIKE for ranked
-- full-text search.

alter table public.marketplace_listings
  add column if not exists search_vector tsvector;

create or replace function public.update_marketplace_listings_search_vector()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(coalesce(new.tags, '{}'), ' ')), 'D');
  return new;
end;
$$;

update public.marketplace_listings
set search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('english', array_to_string(coalesce(tags, '{}'), ' ')), 'D')
where search_vector is null;

drop trigger if exists trg_marketplace_listings_search_vector on public.marketplace_listings;
create trigger trg_marketplace_listings_search_vector
  before insert or update of title, category, description, tags
  on public.marketplace_listings
  for each row
  execute function public.update_marketplace_listings_search_vector();

create index if not exists idx_marketplace_listings_search_vector
  on public.marketplace_listings using gin (search_vector);

comment on column public.marketplace_listings.search_vector is
  'Maintained tsvector for full-text search. Weighted: title=A, category=B, description=C, tags=D';
