-- Phase 10 RLS/grant contract. Run in an isolated project after all promoter
-- migrations are applied. This test does not read or write customer data.
begin;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'promoter_risk_flags',
    'promoter_attribution_touchpoints',
    'promoter_checkout_shadow_attributions',
    'ticket_sale_attributions',
    'promoter_payout_batches',
    'promoter_payout_batch_events',
    'promoter_commission_hold_events',
    'promoter_risk_flag_events',
    'promoter_network_operational_events'
  ] loop
    if not exists (
      select 1 from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public' and relation.relname = v_table and relation.relrowsecurity
    ) then
      raise exception 'expected RLS on public.%', v_table;
    end if;
    if has_table_privilege('anon', 'public.' || v_table, 'select')
      or has_table_privilege('authenticated', 'public.' || v_table, 'insert')
      or has_table_privilege('authenticated', 'public.' || v_table, 'update')
      or has_table_privilege('authenticated', 'public.' || v_table, 'delete') then
      raise exception 'unexpected direct client privilege on public.%', v_table;
    end if;
  end loop;

  if has_function_privilege('authenticated', 'public.create_event_promoter_payout_batch(uuid,uuid,text,integer,text)', 'execute')
    or has_function_privilege('authenticated', 'public.transition_event_promoter_payout_batch(uuid,uuid,text,text,text,text)', 'execute')
    or has_function_privilege('authenticated', 'public.create_event_promoter_risk_flag(uuid,uuid,uuid,uuid,uuid,text,text,uuid,text,jsonb)', 'execute')
    or has_function_privilege('authenticated', 'public.transition_event_promoter_risk_flag(uuid,uuid,text,text,text)', 'execute') then
    raise exception 'authenticated role can execute a privileged promoter financial/risk function';
  end if;

  if not has_function_privilege('authenticated', 'public.get_my_event_promoter_payouts()', 'execute') then
    raise exception 'authenticated role lost the scoped promoter payout read RPC';
  end if;
end;
$$;

rollback;
