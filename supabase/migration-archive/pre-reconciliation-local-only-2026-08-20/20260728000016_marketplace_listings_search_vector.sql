set client_min_messages = warning;

-- Full-text search vector for marketplace_listings.
--
-- GENERATED STORED is intentionally NOT used: to_tsvector() is STABLE, not
-- IMMUTABLE, so Postgres rejects it in a generated column expression.
-- Instead we use a regular tsvector column maintained by a BEFORE trigger.

alter table public.marketplace_listings
  add column if not exists search_vector tsvector;

-- Back-fill existing rows
update public.marketplace_listings
set search_vector = to_tsvector('english',
  coalesce(title, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(array_to_string(tags, ' '), '') || ' ' ||
  coalesce(category, '')
);

-- GIN index for fast full-text queries
create index if not exists idx_marketplace_listings_search_vector
  on public.marketplace_listings using gin(search_vector);

-- Trigger function: recalculates search_vector on insert or relevant update
create or replace function public.marketplace_listings_search_vector_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.search_vector := to_tsvector('english',
    coalesce(new.title, '') || ' ' ||
    coalesce(new.description, '') || ' ' ||
    coalesce(array_to_string(new.tags, ' '), '') || ' ' ||
    coalesce(new.category, '')
  );
  return new;
end;
$$;

drop trigger if exists marketplace_listings_search_vector_trigger
  on public.marketplace_listings;

create trigger marketplace_listings_search_vector_trigger
  before insert or update of title, description, tags, category
  on public.marketplace_listings
  for each row execute function public.marketplace_listings_search_vector_update();
