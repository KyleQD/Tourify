-- TIX-102: Harden foundation ticketing RLS/functions.
-- Replace membership FOR ALL with has_perm(ticketing.*) + real grants.
-- Fix has_event_ticketing_grant (no longer treats every org member as granted).
-- Additive DROP + CREATE only. Never invent org_id.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.can_ticketing(uid uuid, oid uuid, perm text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $$
  select
    uid is not null
    and oid is not null
    and public.is_org_member(uid, oid)
    and public.has_perm(uid, oid, perm);
$$;

revoke all on function public.can_ticketing(uuid, uuid, text) from public;
grant execute on function public.can_ticketing(uuid, uuid, text) to authenticated, service_role;

comment on function public.can_ticketing(uuid, uuid, text) is
  'TIX-102: membership + has_perm for ticketing.* capabilities.';

create or replace function public.can_ticketing_on_event(p_event_id uuid, p_perm text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $$
  select exists (
    select 1
    from public.events_v2 e
    where e.id = p_event_id
      and e.org_id is not null
      and public.can_ticketing(auth.uid(), e.org_id, p_perm)
  );
$$;

revoke all on function public.can_ticketing_on_event(uuid, text) from public;
grant execute on function public.can_ticketing_on_event(uuid, text) to authenticated, service_role;

-- Grant row only — membership alone is NOT a grant (TIX-102).
create or replace function public.has_event_ticketing_grant(p_event_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $$
  select exists (
    select 1
    from public.event_ticketing_grants g
    where g.event_id = p_event_id
      and g.user_id = auth.uid()
      and g.permission = p_permission
  );
$$;

revoke all on function public.has_event_ticketing_grant(uuid, text) from public;
grant execute on function public.has_event_ticketing_grant(uuid, text) to authenticated, service_role;

comment on function public.has_event_ticketing_grant(uuid, text) is
  'TIX-102: true only when an event_ticketing_grants row exists for the caller.';

-- ---------------------------------------------------------------------------
-- Harden inventory RPC authorization (security definer)
-- ---------------------------------------------------------------------------
create or replace function public.reserve_ticket_inventory(
  p_ticket_type_id uuid,
  p_quantity integer,
  p_order_id uuid default null,
  p_ttl_seconds integer default 900,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_event_id uuid;
  v_available integer;
  v_reserved integer;
  v_sold integer;
  v_qty integer;
  v_reservation_id uuid;
begin
  if p_quantity is null or p_quantity < 1 then
    raise exception 'quantity must be >= 1';
  end if;

  perform public.expire_ticket_reservations();

  select event_id, quantity_available, quantity_reserved, quantity_sold
    into v_event_id, v_available, v_reserved, v_sold
  from public.ticket_types
  where id = p_ticket_type_id
  for update;

  if not found then
    raise exception 'ticket type not found';
  end if;

  -- Staff: manage/view + grants. Buyers: self-checkout when created_by = auth.uid().
  if auth.uid() is not null and coalesce(auth.jwt() ->> 'role', auth.role()) = 'authenticated' then
    if not (
      public.can_ticketing_on_event(v_event_id, 'ticketing.manage')
      or public.can_ticketing_on_event(v_event_id, 'ticketing.view')
      or public.has_event_ticketing_grant(v_event_id, 'operate_box_office')
      or public.has_event_ticketing_grant(v_event_id, 'manage_ticket_types')
      or (p_created_by is not null and p_created_by = auth.uid())
    ) then
      raise exception 'not authorized to reserve ticket inventory';
    end if;
  end if;

  v_qty := v_available - coalesce(v_sold, 0) - coalesce(v_reserved, 0);
  if v_qty < p_quantity then
    raise exception 'insufficient inventory: % available', greatest(v_qty, 0);
  end if;

  insert into public.ticket_inventory_reservations (
    ticket_type_id, event_id, order_id, quantity, status, expires_at, created_by
  ) values (
    p_ticket_type_id, v_event_id, p_order_id, p_quantity, 'active',
    now() + make_interval(secs => greatest(p_ttl_seconds, 60)),
    p_created_by
  ) returning id into v_reservation_id;

  update public.ticket_types
    set quantity_reserved = coalesce(quantity_reserved, 0) + p_quantity,
        updated_at = now()
    where id = p_ticket_type_id;

  return v_reservation_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Foundation table policies
-- ---------------------------------------------------------------------------
do $$
begin
  -- Config
  if to_regclass('public.event_ticketing_config') is not null then
    drop policy if exists event_ticketing_config_select on public.event_ticketing_config;
    drop policy if exists event_ticketing_config_write on public.event_ticketing_config;
    drop policy if exists tix102_event_ticketing_config_select on public.event_ticketing_config;
    drop policy if exists tix102_event_ticketing_config_write on public.event_ticketing_config;

    create policy tix102_event_ticketing_config_select on public.event_ticketing_config
      for select to authenticated
      using (
        public.can_ticketing_on_event(event_id, 'ticketing.view')
        or public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.has_event_ticketing_grant(event_id, 'view_overview')
      );

    create policy tix102_event_ticketing_config_write on public.event_ticketing_config
      for all to authenticated
      using (
        public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.has_event_ticketing_grant(event_id, 'manage_ticket_types')
      )
      with check (
        public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.has_event_ticketing_grant(event_id, 'manage_ticket_types')
      );
  end if;

  -- Tickets (customer/order protected fields live here + ticket_sales)
  if to_regclass('public.tickets') is not null then
    drop policy if exists tickets_select on public.tickets;
    drop policy if exists tickets_owner_update on public.tickets;
    drop policy if exists tix102_tickets_select on public.tickets;
    drop policy if exists tix102_tickets_update on public.tickets;

    create policy tix102_tickets_select on public.tickets
      for select to authenticated
      using (
        owner_user_id = auth.uid()
        or public.can_ticketing_on_event(event_id, 'ticketing.view')
        or public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.can_ticketing_on_event(event_id, 'ticketing.scan')
        or public.can_ticketing_on_event(event_id, 'ticketing.refund')
        or public.has_event_ticketing_grant(event_id, 'view_attendees')
        or public.has_event_ticketing_grant(event_id, 'scan_tickets')
        or public.has_event_ticketing_grant(event_id, 'operate_box_office')
        or public.has_event_ticketing_grant(event_id, 'view_attendee_contact')
      );

    create policy tix102_tickets_update on public.tickets
      for update to authenticated
      using (
        owner_user_id = auth.uid()
        or public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.has_event_ticketing_grant(event_id, 'transfer_reassign')
        or public.has_event_ticketing_grant(event_id, 'operate_box_office')
      )
      with check (
        owner_user_id = auth.uid()
        or public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.has_event_ticketing_grant(event_id, 'transfer_reassign')
        or public.has_event_ticketing_grant(event_id, 'operate_box_office')
      );
  end if;

  -- Credentials
  if to_regclass('public.ticket_credentials') is not null then
    drop policy if exists ticket_credentials_select on public.ticket_credentials;
    drop policy if exists tix102_ticket_credentials_select on public.ticket_credentials;

    create policy tix102_ticket_credentials_select on public.ticket_credentials
      for select to authenticated
      using (
        exists (
          select 1 from public.tickets t
          where t.id = ticket_id
            and (
              t.owner_user_id = auth.uid()
              or public.can_ticketing_on_event(t.event_id, 'ticketing.view')
              or public.can_ticketing_on_event(t.event_id, 'ticketing.manage')
              or public.can_ticketing_on_event(t.event_id, 'ticketing.scan')
              or public.has_event_ticketing_grant(t.event_id, 'scan_tickets')
              or public.has_event_ticketing_grant(t.event_id, 'operate_box_office')
            )
        )
      );
  end if;

  -- Transfers — party OR staff manage/grant
  if to_regclass('public.ticket_transfers') is not null then
    drop policy if exists ticket_transfers_select on public.ticket_transfers;
    drop policy if exists ticket_transfers_insert on public.ticket_transfers;
    drop policy if exists ticket_transfers_update on public.ticket_transfers;
    drop policy if exists tix102_ticket_transfers_select on public.ticket_transfers;
    drop policy if exists tix102_ticket_transfers_insert on public.ticket_transfers;
    drop policy if exists tix102_ticket_transfers_update on public.ticket_transfers;

    create policy tix102_ticket_transfers_select on public.ticket_transfers
      for select to authenticated
      using (
        from_user_id = auth.uid()
        or to_user_id = auth.uid()
        or exists (
          select 1 from public.tickets t
          where t.id = ticket_id
            and (
              public.can_ticketing_on_event(t.event_id, 'ticketing.manage')
              or public.has_event_ticketing_grant(t.event_id, 'transfer_reassign')
            )
        )
      );

    create policy tix102_ticket_transfers_insert on public.ticket_transfers
      for insert to authenticated
      with check (
        from_user_id = auth.uid()
        or exists (
          select 1 from public.tickets t
          where t.id = ticket_id
            and (
              public.can_ticketing_on_event(t.event_id, 'ticketing.manage')
              or public.has_event_ticketing_grant(t.event_id, 'transfer_reassign')
            )
        )
      );

    create policy tix102_ticket_transfers_update on public.ticket_transfers
      for update to authenticated
      using (
        from_user_id = auth.uid()
        or to_user_id = auth.uid()
        or exists (
          select 1 from public.tickets t
          where t.id = ticket_id
            and (
              public.can_ticketing_on_event(t.event_id, 'ticketing.manage')
              or public.has_event_ticketing_grant(t.event_id, 'transfer_reassign')
            )
        )
      );
  end if;

  -- Check-ins
  if to_regclass('public.ticket_checkins') is not null then
    drop policy if exists ticket_checkins_select on public.ticket_checkins;
    drop policy if exists ticket_checkins_insert on public.ticket_checkins;
    drop policy if exists tix102_ticket_checkins_select on public.ticket_checkins;
    drop policy if exists tix102_ticket_checkins_insert on public.ticket_checkins;

    create policy tix102_ticket_checkins_select on public.ticket_checkins
      for select to authenticated
      using (
        public.can_ticketing_on_event(event_id, 'ticketing.view')
        or public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.can_ticketing_on_event(event_id, 'ticketing.scan')
        or public.has_event_ticketing_grant(event_id, 'scan_tickets')
        or public.has_event_ticketing_grant(event_id, 'view_attendees')
      );

    create policy tix102_ticket_checkins_insert on public.ticket_checkins
      for insert to authenticated
      with check (
        public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.can_ticketing_on_event(event_id, 'ticketing.scan')
        or public.has_event_ticketing_grant(event_id, 'scan_tickets')
        or public.has_event_ticketing_grant(event_id, 'operate_box_office')
      );
  end if;

  -- Allocations
  if to_regclass('public.ticket_allocations') is not null then
    drop policy if exists ticket_allocations_all on public.ticket_allocations;
    drop policy if exists tix102_ticket_allocations_select on public.ticket_allocations;
    drop policy if exists tix102_ticket_allocations_write on public.ticket_allocations;

    create policy tix102_ticket_allocations_select on public.ticket_allocations
      for select to authenticated
      using (
        public.can_ticketing_on_event(event_id, 'ticketing.view')
        or public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.has_event_ticketing_grant(event_id, 'manage_guestlist')
        or public.has_event_ticketing_grant(event_id, 'view_overview')
      );

    create policy tix102_ticket_allocations_write on public.ticket_allocations
      for all to authenticated
      using (
        public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.has_event_ticketing_grant(event_id, 'manage_guestlist')
        or public.has_event_ticketing_grant(event_id, 'issue_comps')
      )
      with check (
        public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.has_event_ticketing_grant(event_id, 'manage_guestlist')
        or public.has_event_ticketing_grant(event_id, 'issue_comps')
      );
  end if;

  -- Revenue allocations (protected financial)
  if to_regclass('public.ticket_revenue_allocations') is not null then
    drop policy if exists ticket_revenue_allocations_all on public.ticket_revenue_allocations;
    drop policy if exists tix102_ticket_revenue_allocations_select on public.ticket_revenue_allocations;
    drop policy if exists tix102_ticket_revenue_allocations_write on public.ticket_revenue_allocations;

    create policy tix102_ticket_revenue_allocations_select on public.ticket_revenue_allocations
      for select to authenticated
      using (
        public.can_ticketing_on_event(event_id, 'ticketing.view')
        or public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.has_event_ticketing_grant(event_id, 'view_full_financials')
      );

    create policy tix102_ticket_revenue_allocations_write on public.ticket_revenue_allocations
      for all to authenticated
      using (
        public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.has_event_ticketing_grant(event_id, 'view_full_financials')
      )
      with check (
        public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.has_event_ticketing_grant(event_id, 'view_full_financials')
      );
  end if;

  -- Grants admin
  if to_regclass('public.event_ticketing_grants') is not null then
    drop policy if exists event_ticketing_grants_select on public.event_ticketing_grants;
    drop policy if exists event_ticketing_grants_write on public.event_ticketing_grants;
    drop policy if exists tix102_event_ticketing_grants_select on public.event_ticketing_grants;
    drop policy if exists tix102_event_ticketing_grants_write on public.event_ticketing_grants;

    create policy tix102_event_ticketing_grants_select on public.event_ticketing_grants
      for select to authenticated
      using (
        user_id = auth.uid()
        or public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.has_event_ticketing_grant(event_id, 'manage_grants')
      );

    create policy tix102_event_ticketing_grants_write on public.event_ticketing_grants
      for all to authenticated
      using (
        public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.has_event_ticketing_grant(event_id, 'manage_grants')
      )
      with check (
        public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.has_event_ticketing_grant(event_id, 'manage_grants')
      );
  end if;

  -- Reservations (inventory)
  if to_regclass('public.ticket_inventory_reservations') is not null then
    drop policy if exists ticket_reservations_select on public.ticket_inventory_reservations;
    drop policy if exists tix102_ticket_reservations_select on public.ticket_inventory_reservations;

    create policy tix102_ticket_reservations_select on public.ticket_inventory_reservations
      for select to authenticated
      using (
        created_by = auth.uid()
        or public.can_ticketing_on_event(event_id, 'ticketing.view')
        or public.can_ticketing_on_event(event_id, 'ticketing.manage')
        or public.has_event_ticketing_grant(event_id, 'operate_box_office')
      );
  end if;

  -- Ownership events
  if to_regclass('public.ticket_ownership_events') is not null then
    drop policy if exists ticket_ownership_events_select on public.ticket_ownership_events;
    drop policy if exists tix102_ticket_ownership_events_select on public.ticket_ownership_events;

    create policy tix102_ticket_ownership_events_select on public.ticket_ownership_events
      for select to authenticated
      using (
        exists (
          select 1 from public.tickets t
          where t.id = ticket_id
            and (
              t.owner_user_id = auth.uid()
              or public.can_ticketing_on_event(t.event_id, 'ticketing.view')
              or public.can_ticketing_on_event(t.event_id, 'ticketing.manage')
            )
        )
      );
  end if;

  -- Analytics foundation select (align with capability; insert already hardened in SEC-108/TIX-101)
  if to_regclass('public.ticket_analytics_events') is not null then
    drop policy if exists ticket_analytics_events_select on public.ticket_analytics_events;
    drop policy if exists tix102_ticket_analytics_events_select on public.ticket_analytics_events;

    create policy tix102_ticket_analytics_events_select on public.ticket_analytics_events
      for select to authenticated
      using (
        event_id is null
        or public.can_ticketing_on_event(event_id, 'ticketing.view')
        or public.can_ticketing_on_event(event_id, 'ticketing.manage')
      );
  end if;

  -- Webhook: keep deny for clients
  if to_regclass('public.ticket_stripe_webhook_events') is not null then
    drop policy if exists ticket_stripe_webhook_events_deny on public.ticket_stripe_webhook_events;
    drop policy if exists tix102_ticket_stripe_webhook_events_deny on public.ticket_stripe_webhook_events;
    create policy tix102_ticket_stripe_webhook_events_deny on public.ticket_stripe_webhook_events
      for all to authenticated
      using (false)
      with check (false);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Verify: membership-only *_all policies should be gone
-- ---------------------------------------------------------------------------
create or replace function public.admin_verify_tix102_foundation_rls()
returns table (
  table_name text,
  policy_name text,
  cmd text,
  qual text
)
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $$
  select
    p.tablename::text,
    p.policyname::text,
    p.cmd::text,
    coalesce(p.qual, '')::text
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename in (
      'event_ticketing_config',
      'tickets',
      'ticket_credentials',
      'ticket_transfers',
      'ticket_checkins',
      'ticket_allocations',
      'ticket_revenue_allocations',
      'event_ticketing_grants',
      'ticket_inventory_reservations',
      'ticket_ownership_events',
      'ticket_analytics_events',
      'ticket_stripe_webhook_events'
    )
    and (
      p.policyname in (
        'ticket_allocations_all',
        'ticket_revenue_allocations_all',
        'event_ticketing_config_write',
        'event_ticketing_grants_write',
        'tickets_select',
        'tickets_owner_update',
        'ticket_checkins_select',
        'ticket_checkins_insert',
        'ticket_reservations_select',
        'ticket_analytics_events_select'
      )
      or (
        coalesce(p.qual, '') like '%is_event_v2_org_member%'
        and coalesce(p.qual, '') not like '%can_ticketing%'
        and coalesce(p.qual, '') not like '%has_perm%'
      )
    );
$$;

revoke all on function public.admin_verify_tix102_foundation_rls() from public;
grant execute on function public.admin_verify_tix102_foundation_rls() to service_role;

comment on function public.admin_verify_tix102_foundation_rls() is
  'TIX-102: remaining membership-blanket foundation policies (must be empty after apply).';
