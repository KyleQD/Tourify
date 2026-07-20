-- Admin ticketing deployment checks.
-- Run after migrations in a preview environment. Every query should return
-- zero rows.

-- No ticketing policy may grant blanket access based only on authentication.
select schemaname, tablename, policyname, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'ticket_types',
    'ticket_sales',
    'ticket_campaigns',
    'promo_codes',
    'ticket_shares',
    'ticket_referrals',
    'ticket_analytics',
    'social_media_performance',
    'ticket_analytics_events'
  )
  and (
    coalesce(qual, '') ilike '%auth.role()%'
    or coalesce(with_check, '') ilike '%auth.role()%'
  );

-- All protected ticketing tables must have RLS enabled and not forced off.
select n.nspname as schema_name, c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'ticket_types',
    'ticket_sales',
    'ticket_campaigns',
    'promo_codes',
    'ticket_shares',
    'ticket_referrals',
    'ticket_analytics',
    'social_media_performance',
    'ticket_analytics_events'
  )
  and not c.relrowsecurity;

-- Order, ticket type, promo, and campaign references may not cross events.
select ts.id as sale_id, ts.event_id as sale_event_id, tt.event_id as type_event_id
from public.ticket_sales ts
join public.ticket_types tt on tt.id = ts.ticket_type_id
where ts.event_id <> tt.event_id;

select pc.id as promo_id, pc.event_id as promo_event_id, tc.event_id as campaign_event_id
from public.promo_codes pc
join public.ticket_campaigns tc on tc.id = pc.campaign_id
where pc.event_id <> tc.event_id;

-- Counters must remain inside their defined bounds.
select id, quantity_available, quantity_sold
from public.ticket_types
where quantity_available < 0
   or quantity_sold < 0;

select id, current_uses, max_uses
from public.promo_codes
where current_uses < 0
   or (max_uses is not null and current_uses > max_uses);

-- Browser roles must not be able to invoke service-only mutation RPCs.
select 'increment_promo_code_usage_exposed' as violation
where has_function_privilege(
  'authenticated',
  'public.increment_promo_code_usage(uuid, uuid)',
  'execute'
);

select 'apply_ticket_refund_exposed' as violation
where has_function_privilege(
  'authenticated',
  'public.apply_ticket_refund(uuid, uuid, numeric, uuid[])',
  'execute'
);
