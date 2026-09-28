-- Org-wide live calendar subscribe token (mirrors tours.calendar_token)
alter table public.organizations
  add column if not exists calendar_token uuid default gen_random_uuid();

alter table public.organizations
  add column if not exists calendar_feed_enabled boolean not null default true;

update public.organizations
set calendar_token = gen_random_uuid()
where calendar_token is null;

create unique index if not exists idx_organizations_calendar_token
  on public.organizations (calendar_token)
  where calendar_token is not null;
