begin;

do $$
begin
  if not exists (select 1 from pg_class where relname = 'music_upload_declarations' and relrowsecurity) then
    raise exception 'music_upload_declarations must have RLS enabled';
  end if;
  if not exists (select 1 from pg_class where relname = 'music_certification_evidence' and relrowsecurity) then
    raise exception 'music_certification_evidence must have RLS enabled';
  end if;
  if has_table_privilege('anon', 'public.music_certification_evidence', 'select') then
    raise exception 'anonymous evidence access must be denied';
  end if;
  if has_table_privilege('authenticated', 'public.music_certification_reviews', 'select') then
    raise exception 'reviewer rows must remain server-mediated';
  end if;
  if has_table_privilege('authenticated', 'public.music_certification_evidence', 'insert')
     or has_table_privilege('authenticated', 'public.music_certification_cases', 'update') then
    raise exception 'certification mutations must remain server-mediated';
  end if;
  if has_table_privilege('authenticated', 'public.music_origin_records', 'update')
     or has_table_privilege('authenticated', 'public.music_origin_records', 'delete') then
    raise exception 'origin records must be append-only for clients';
  end if;
  if has_table_privilege('authenticated', 'public.music_certification_events', 'insert')
     or has_table_privilege('authenticated', 'public.content_report_events', 'update') then
    raise exception 'audit event writes must remain server-mediated and append-only';
  end if;
  if not has_table_privilege('service_role', 'public.music_certification_evidence', 'select,insert,update,delete') then
    raise exception 'service role requires evidence mediation privileges';
  end if;
end $$;

do $$
declare
  update_policy record;
begin
  select * into update_policy from pg_policies
  where schemaname = 'public' and tablename = 'artist_music'
    and policyname = 'Users can update their own music';
  if update_policy.qual is null or update_policy.with_check is null then
    raise exception 'artist_music UPDATE policy requires USING and WITH CHECK';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename = 'music_upload_declarations' and cmd = 'SELECT'
      and qual ilike '%auth.uid%user_id%'
  ) then
    raise exception 'declarations require owner-scoped SELECT';
  end if;
  if exists (
    select 1 from pg_policies where schemaname = 'public'
      and tablename in ('music_origin_records', 'music_origin_events', 'music_certification_reviews', 'music_certification_events', 'content_report_events')
      and roles @> array['authenticated']::name[] and cmd in ('UPDATE', 'DELETE')
  ) then
    raise exception 'immutable history exposes a client mutation policy';
  end if;
end $$;

rollback;
