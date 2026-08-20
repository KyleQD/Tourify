set client_min_messages = warning;

begin;

-- Trigger-only coordinator helpers must never be callable through the Data API.
revoke all on function public.ensure_workforce_coordinator_channel(uuid)
  from public, anon, authenticated;
revoke all on function public.sync_workforce_coordinator_channel_from_roster()
  from public, anon, authenticated;

-- The worker response RPC performs its own auth.uid()/ownership check.
revoke all on function public.respond_to_work_assignment(uuid, text)
  from public, anon;
grant execute on function public.respond_to_work_assignment(uuid, text)
  to authenticated;

create index if not exists workforce_channel_links_created_by_idx
  on public.workforce_channel_links (created_by)
  where created_by is not null;

create index if not exists work_mode_publication_audiences_assigned_by_idx
  on public.work_mode_publication_audiences (assigned_by)
  where assigned_by is not null;

commit;
