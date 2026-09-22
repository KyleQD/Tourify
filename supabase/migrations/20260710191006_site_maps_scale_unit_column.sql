set client_min_messages = warning;

alter table if exists public.site_maps
  add column if not exists scale_unit text default 'meters';;
