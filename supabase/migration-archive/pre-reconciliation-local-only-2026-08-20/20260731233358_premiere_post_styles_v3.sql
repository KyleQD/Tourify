begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.post_appearances
  drop constraint if exists post_appearances_schema_version_check;

alter table public.post_appearances
  add constraint post_appearances_schema_version_check
  check (schema_version in (1, 2, 3))
  not valid;

alter table public.post_appearances
  validate constraint post_appearances_schema_version_check;

commit;
