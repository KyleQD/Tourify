-- Supabase database linter:
-- 0010_security_definer_view: use security_invoker (Postgres 15+)
-- 0013_rls_disabled_in_public: enable RLS + minimal safe policies

-- ---------------------------------------------------------------------------
-- Views: run with invoker privileges so underlying table RLS applies per user
-- ---------------------------------------------------------------------------
do $$
declare
  v_view text;
  v_views text[] := array[
    'public.equipment_utilization',
    'public.photo_storage_stats',
    'public.public_job_board',
    'public.rental_analytics',
    'public.friend_suggestions_view',
    'public.entities_individuals',
    'public.entities_artists',
    'public.entities_venues',
    'public.entities_all',
    'public.music_tracks'
  ];
  v_ver int := current_setting('server_version_num')::int;
begin
  if v_ver < 150000 then
    raise notice 'Skipping security_invoker ALTER VIEW (requires PostgreSQL 15+)';
    return;
  end if;

  foreach v_view in array v_views
  loop
    if to_regclass(v_view) is not null then
      execute format('alter view %s set (security_invoker = true)', v_view);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- feed_events: per-user promotion feed rows
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.feed_events') is null then
    return;
  end if;
  execute 'alter table public.feed_events enable row level security';
  perform migration_helpers.drop_policy_if_exists('public', 'feed_events', 'feed_events_select_own');
  execute $p$
    create policy feed_events_select_own on public.feed_events
      for select to authenticated
      using (auth.uid() = user_id)
  $p$;
  perform migration_helpers.drop_policy_if_exists('public', 'feed_events', 'feed_events_insert_own');
  execute $p$
    create policy feed_events_insert_own on public.feed_events
      for insert to authenticated
      with check (auth.uid() = user_id)
  $p$;
  perform migration_helpers.drop_policy_if_exists('public', 'feed_events', 'feed_events_update_own');
  execute $p$
    create policy feed_events_update_own on public.feed_events
      for update to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id)
  $p$;
  perform migration_helpers.drop_policy_if_exists('public', 'feed_events', 'feed_events_delete_own');
  execute $p$
    create policy feed_events_delete_own on public.feed_events
      for delete to authenticated
      using (auth.uid() = user_id)
  $p$;
end $$;

-- ---------------------------------------------------------------------------
-- Forum lookup tables: reference data, read-only for API clients
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.forum_kind') is not null then
    execute 'alter table public.forum_kind enable row level security';
    perform migration_helpers.drop_policy_if_exists('public', 'forum_kind', 'forum_kind_select');
    execute $p$
      create policy forum_kind_select on public.forum_kind
        for select using (true)
    $p$;
  end if;

  if to_regclass('public.content_kind') is not null then
    execute 'alter table public.content_kind enable row level security';
    perform migration_helpers.drop_policy_if_exists('public', 'content_kind', 'content_kind_select');
    execute $p$
      create policy content_kind_select on public.content_kind
        for select using (true)
    $p$;
  end if;

  if to_regclass('public.post_kind') is not null then
    execute 'alter table public.post_kind enable row level security';
    perform migration_helpers.drop_policy_if_exists('public', 'post_kind', 'post_kind_select');
    execute $p$
      create policy post_kind_select on public.post_kind
        for select using (true)
    $p$;
  end if;

  if to_regclass('public.vote_kind') is not null then
    execute 'alter table public.vote_kind enable row level security';
    perform migration_helpers.drop_policy_if_exists('public', 'vote_kind', 'vote_kind_select');
    execute $p$
      create policy vote_kind_select on public.vote_kind
        for select using (true)
    $p$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- venues_v2: org-scoped via calendars / events, or creator
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.venues_v2') is null then
    return;
  end if;
  execute 'alter table public.venues_v2 enable row level security';
  perform migration_helpers.drop_policy_if_exists('public', 'venues_v2', 'venues_v2_select');
  execute $p$
    create policy venues_v2_select on public.venues_v2
      for select to authenticated
      using (
        created_by = auth.uid()
        or exists (
          select 1
          from public.calendars c
          where c.venue_id = venues_v2.id
            and public.is_org_member(auth.uid(), c.org_id)
        )
        or exists (
          select 1
          from public.events_v2 e
          where e.venue_id = venues_v2.id
            and public.is_org_member(auth.uid(), e.org_id)
        )
      )
  $p$;
  perform migration_helpers.drop_policy_if_exists('public', 'venues_v2', 'venues_v2_insert');
  execute $p$
    create policy venues_v2_insert on public.venues_v2
      for insert to authenticated
      with check (auth.uid() = created_by)
  $p$;
  perform migration_helpers.drop_policy_if_exists('public', 'venues_v2', 'venues_v2_update');
  execute $p$
    create policy venues_v2_update on public.venues_v2
      for update to authenticated
      using (auth.uid() = created_by)
      with check (auth.uid() = created_by)
  $p$;
  perform migration_helpers.drop_policy_if_exists('public', 'venues_v2', 'venues_v2_delete');
  execute $p$
    create policy venues_v2_delete on public.venues_v2
      for delete to authenticated
      using (auth.uid() = created_by)
  $p$;
end $$;

-- ---------------------------------------------------------------------------
-- communication_channels: legacy stub (id + timestamps); read for realtime
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.communication_channels') is null then
    return;
  end if;
  execute 'alter table public.communication_channels enable row level security';
  perform migration_helpers.drop_policy_if_exists('public', 'communication_channels', 'communication_channels_select');
  execute $p$
    create policy communication_channels_select on public.communication_channels
      for select to authenticated
      using (true)
  $p$;
end $$;

-- ---------------------------------------------------------------------------
-- Staffing aggregates / telemetry: venue account holder only
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.staffing_overview_cache') is null then
    null;
  else
    execute 'alter table public.staffing_overview_cache enable row level security';
    perform migration_helpers.drop_policy_if_exists('public', 'staffing_overview_cache', 'staffing_overview_cache_select');
    execute $p$
      create policy staffing_overview_cache_select on public.staffing_overview_cache
        for select to authenticated
        using (
          venue_id in (select vp.id from public.venue_profiles vp where vp.user_id = auth.uid())
        )
    $p$;
  end if;

  if to_regclass('public.staffing_api_telemetry') is null then
    null;
  else
    execute 'alter table public.staffing_api_telemetry enable row level security';
    perform migration_helpers.drop_policy_if_exists('public', 'staffing_api_telemetry', 'staffing_api_telemetry_select');
    execute $p$
      create policy staffing_api_telemetry_select on public.staffing_api_telemetry
        for select to authenticated
        using (
          user_id = auth.uid()
          or (
            venue_id is not null
            and venue_id in (select vp.id from public.venue_profiles vp where vp.user_id = auth.uid())
          )
        )
    $p$;
  end if;

  if to_regclass('public.staffing_alert_events') is null then
    null;
  else
    execute 'alter table public.staffing_alert_events enable row level security';
    perform migration_helpers.drop_policy_if_exists('public', 'staffing_alert_events', 'staffing_alert_events_select');
    execute $p$
      create policy staffing_alert_events_select on public.staffing_alert_events
        for select to authenticated
        using (
          venue_id in (select vp.id from public.venue_profiles vp where vp.user_id = auth.uid())
        )
    $p$;
  end if;
end $$;
