set client_min_messages = warning;

-- Baseline capture: profiles.url_slug existed on the live reference
-- databases (referenced by the global search vector rebuild) but was never
-- captured by a tracked migration. Guarded, additive.

alter table public.profiles
  add column if not exists url_slug text;

create unique index if not exists profiles_url_slug_key
  on public.profiles (url_slug)
  where url_slug is not null;
