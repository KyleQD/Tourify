set client_min_messages = warning;

-- Add cover_image to profiles and backfill from existing sources

begin;

alter table profiles
  add column if not exists cover_image text;

-- Backfill from existing header_url column if present
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' and table_schema = 'public' and column_name = 'header_url'
  ) then
    update profiles
      set cover_image = header_url
    where cover_image is null and header_url is not null;
  end if;
end$$;

-- Backfill from metadata.header_url if available
update profiles
  set cover_image = metadata ->> 'header_url'
where cover_image is null and metadata is not null and (metadata ->> 'header_url') is not null;

commit;


