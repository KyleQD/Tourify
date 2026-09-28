-- SEC-004 isolated fixture preflight.
-- SELECT-only. Do not run the eventual synthetic fixture seed on Tourify Demo.

with required_relations(domain, relation_kind, relation_name) as (
  values
    ('tenancy', 'identity', 'organizer_accounts'),
    ('tenancy', 'membership', 'org_members'),
    ('tours', 'parent', 'tours'),
    ('tours', 'child', 'tour_stops'),
    ('events', 'parent', 'events_v2'),
    ('events', 'child', 'tasks'),
    ('travel', 'parent', 'travel_groups'),
    ('travel', 'child', 'travel_group_members'),
    ('lodging', 'parent', 'lodging_bookings'),
    ('lodging', 'child', 'lodging_guest_assignments'),
    ('equipment', 'parent', 'equipment_catalog'),
    ('equipment', 'child', 'equipment_instances'),
    ('ticketing', 'parent', 'event_ticketing_config'),
    ('ticketing', 'child', 'ticket_inventory_reservations'),
    ('finance', 'parent', 'events_v2'),
    ('finance', 'child', 'financial_transactions'),
    ('contracts', 'parent', 'contracts'),
    ('contracts', 'child', 'contract_obligations'),
    ('site_maps', 'parent', 'site_maps'),
    ('site_maps', 'child', 'site_map_zones'),
    ('publications', 'parent', 'admin_publication_snapshots'),
    ('publications', 'child', 'admin_publication_sections'),
    ('workforce', 'parent', 'staff_shifts'),
    ('workforce', 'child', 'staff_shift_assignments')
)
select
  required.domain,
  required.relation_kind,
  required.relation_name,
  to_regclass(format('public.%I', required.relation_name)) is not null as exists,
  coalesce(c.relrowsecurity, false) as rls_enabled,
  coalesce(c.relforcerowsecurity, false) as rls_forced,
  coalesce(policy_counts.policy_count, 0) as policy_count
from required_relations required
left join pg_namespace n on n.nspname = 'public'
left join pg_class c
  on c.relnamespace = n.oid
 and c.relname = required.relation_name
left join lateral (
  select count(*)::integer as policy_count
  from pg_policy p
  where p.polrelid = c.oid
) policy_counts on true
order by required.domain, required.relation_kind, required.relation_name;
