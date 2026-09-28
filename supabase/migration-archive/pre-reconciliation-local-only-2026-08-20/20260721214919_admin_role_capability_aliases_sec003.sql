-- ADR-003 / SEC-003 — canonical admin capability defaults and documented aliases.
--
-- MANUAL-PUSH MIGRATION: apply this file unchanged through the Supabase SQL
-- editor only after reviewing it. It is expand-only: it does not reset the
-- database, remove data, replace customized permission arrays, or weaken RLS.
-- Existing permissions are retained and canonical defaults are unioned in.

begin;

insert into public.org_role_permissions as role_permissions (role, perms)
values
  (
    'owner',
    array[
      'org.roles.manage','org.settings.manage','audit.view',
      'tour.view','tour.manage','tour.publish','tour.archive','tour.delete',
      'event.view','event.manage','event.publish','event.live_ops',
      'routing.manage','advance.manage',
      'logistics.view','logistics.manage','logistics.sensitive',
      'workforce.view','workforce.manage','workforce.publish','hiring.manage',
      'vendor.view','vendor.manage','vendor.sensitive',
      'contract.view','contract.manage','contract.sign',
      'finance.view','finance.manage','finance.approve','finance.pay',
      'ticketing.view','ticketing.manage','ticketing.scan','ticketing.refund',
      'site_map.view','site_map.edit','site_map.share',
      'communications.send','communications.broadcast',
      'content.view','content.manage'
    ]::text[]
  ),
  (
    'admin',
    array[
      'org.roles.manage','org.settings.manage','audit.view',
      'tour.view','tour.manage','tour.publish','tour.archive','tour.delete',
      'event.view','event.manage','event.publish','event.live_ops',
      'routing.manage','advance.manage',
      'logistics.view','logistics.manage','logistics.sensitive',
      'workforce.view','workforce.manage','workforce.publish','hiring.manage',
      'vendor.view','vendor.manage','vendor.sensitive',
      'contract.view','contract.manage',
      'finance.view','finance.manage','finance.approve',
      'ticketing.view','ticketing.manage','ticketing.scan','ticketing.refund',
      'site_map.view','site_map.edit','site_map.share',
      'communications.send','communications.broadcast',
      'content.view','content.manage'
    ]::text[]
  ),
  (
    'tour_manager',
    array[
      'audit.view',
      'tour.view','tour.manage','tour.publish','tour.archive',
      'event.view','event.manage','event.publish','event.live_ops',
      'routing.manage','advance.manage',
      'logistics.view','logistics.manage','logistics.sensitive',
      'workforce.view','workforce.manage','workforce.publish','hiring.manage',
      'vendor.view','vendor.manage','contract.view','finance.view',
      'ticketing.view','site_map.view','site_map.edit','site_map.share',
      'communications.send','communications.broadcast',
      'content.view','content.manage'
    ]::text[]
  ),
  (
    'production',
    array[
      'audit.view',
      'tour.view','tour.manage',
      'event.view','event.manage','event.publish','event.live_ops',
      'routing.manage','advance.manage',
      'logistics.view','logistics.manage','logistics.sensitive',
      'workforce.view','workforce.manage','workforce.publish',
      'vendor.view','vendor.manage','contract.view','finance.view',
      'ticketing.view','site_map.view','site_map.edit','site_map.share',
      'communications.send','communications.broadcast',
      'content.view','content.manage'
    ]::text[]
  ),
  (
    'production_manager',
    array[
      'audit.view',
      'tour.view','tour.manage',
      'event.view','event.manage','event.publish','event.live_ops',
      'routing.manage','advance.manage',
      'logistics.view','logistics.manage','logistics.sensitive',
      'workforce.view','workforce.manage','workforce.publish',
      'vendor.view','vendor.manage','contract.view','finance.view',
      'ticketing.view','site_map.view','site_map.edit','site_map.share',
      'communications.send','communications.broadcast',
      'content.view','content.manage'
    ]::text[]
  ),
  (
    'department_manager',
    array[
      'audit.view',
      'tour.view','event.view','logistics.view',
      'workforce.view','workforce.manage','workforce.publish',
      'vendor.view','contract.view','finance.view','ticketing.view',
      'site_map.view','content.view','communications.send'
    ]::text[]
  ),
  (
    'finance',
    array[
      'audit.view','tour.view','event.view','logistics.view','workforce.view',
      'vendor.view','vendor.sensitive','contract.view',
      'finance.view','finance.manage','finance.approve','finance.pay',
      'ticketing.view','site_map.view','content.view'
    ]::text[]
  ),
  (
    'finance_manager',
    array[
      'audit.view','tour.view','event.view','logistics.view','workforce.view',
      'vendor.view','vendor.sensitive','contract.view',
      'finance.view','finance.manage','finance.approve','finance.pay',
      'ticketing.view','site_map.view','content.view'
    ]::text[]
  ),
  (
    'ticketing',
    array[
      'tour.view','event.view','ticketing.view','ticketing.manage',
      'ticketing.scan','ticketing.refund','communications.send'
    ]::text[]
  ),
  (
    'ticketing_manager',
    array[
      'tour.view','event.view','ticketing.view','ticketing.manage',
      'ticketing.scan','ticketing.refund','communications.send'
    ]::text[]
  ),
  (
    'viewer',
    array[
      'tour.view','event.view','logistics.view','workforce.view','vendor.view',
      'contract.view','finance.view','ticketing.view','site_map.view','content.view'
    ]::text[]
  ),
  ('worker', '{}'::text[])
on conflict (role) do update
set perms = (
  select coalesce(array_agg(distinct capability order by capability), '{}'::text[])
  from unnest(
    coalesce(role_permissions.perms, '{}'::text[])
    || coalesce(excluded.perms, '{}'::text[])
  ) as capability
);

-- Fail the transaction if documented aliases are missing their minimum gates.
do $$
declare
  missing_aliases text[];
begin
  select array_agg(required.role order by required.role)
  into missing_aliases
  from (
    values
      ('production_manager', 'event.live_ops'),
      ('department_manager', 'workforce.manage'),
      ('finance_manager', 'finance.approve'),
      ('ticketing_manager', 'ticketing.scan')
  ) as required(role, capability)
  left join public.org_role_permissions configured on configured.role = required.role
  where configured.role is null
     or not (required.capability = any(coalesce(configured.perms, '{}'::text[])));

  if missing_aliases is not null then
    raise exception 'ADR-003 capability alias validation failed for roles: %', missing_aliases;
  end if;
end
$$;

commit;
