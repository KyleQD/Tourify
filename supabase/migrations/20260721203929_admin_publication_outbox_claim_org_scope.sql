-- SEC-109 / PUB-101 — organization-scoped outbox claiming.
-- Additive only: preserves the existing global RPC for compatibility.

create or replace function public.admin_publication_outbox_claim_for_org(
  p_org_id uuid,
  p_worker_id text,
  p_limit integer default 25
)
returns setof public.admin_publication_outbox
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
begin
  if p_org_id is null then
    raise exception 'org_id is required';
  end if;

  return query
  with claimed as (
    select o.id
    from public.admin_publication_outbox o
    where o.org_id = p_org_id
      and o.status in ('pending', 'failed')
      and o.available_at <= now()
    order by o.available_at asc
    for update skip locked
    limit greatest(coalesce(p_limit, 25), 1)
  )
  update public.admin_publication_outbox o
  set status = 'processing',
      locked_at = now(),
      locked_by = p_worker_id,
      attempts = o.attempts + 1
  from claimed
  where o.id = claimed.id
  returning o.*;
end;
$$;

revoke all on function public.admin_publication_outbox_claim_for_org(uuid, text, integer) from public;
grant execute on function public.admin_publication_outbox_claim_for_org(uuid, text, integer) to service_role;
