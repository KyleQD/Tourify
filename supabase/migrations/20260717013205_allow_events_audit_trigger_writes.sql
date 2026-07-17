set client_min_messages = warning;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

-- events_v2 writes should not fail because the audit trigger cannot insert
-- into audit_log under the caller's RLS context. Keep audit_log closed to
-- direct client inserts, but let a private table-owned trigger record changes.
create or replace function private.audit_event_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.audit_log(org_id, actor_id, entity_kind, entity_id, action, diff)
  values (
    new.org_id,
    auth.uid(),
    'event',
    new.id,
    TG_OP,
    jsonb_build_object('old', row_to_json(old), 'new', row_to_json(new))
  );

  return new;
end;
$$;

revoke all on function private.audit_event_update() from public;
revoke all on function private.audit_event_update() from anon;
revoke all on function private.audit_event_update() from authenticated;

drop trigger if exists trg_events_audit on public.events_v2;
drop function if exists public.audit_event_update();
create trigger trg_events_audit
  after insert or update on public.events_v2
  for each row execute function private.audit_event_update();
