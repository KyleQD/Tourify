-- Event Promoter Network foundation (additive)
--
-- This migration intentionally owns promoter campaign, attribution, and
-- commission semantics rather than overloading legacy ticket marketing tables.
-- It assumes the current native ticketing runtime contract uses events_v2; the
-- remote FK/type-generation verification recorded in docs/promoter-network/audit
-- remains a required deployment gate.

set client_min_messages = warning;
create extension if not exists pgcrypto;

create table if not exists public.event_promotion_programs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events_v2(id) on delete restrict,
  organizer_org_id uuid,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'open', 'paused', 'closed', 'cancelled')),
  application_mode text not null default 'approval_required'
    check (application_mode in ('open', 'approval_required', 'invite_only')),
  commission_type text not null default 'percentage'
    check (commission_type in ('percentage', 'fixed_per_ticket')),
  commission_rate_bps integer,
  commission_fixed_amount_minor bigint,
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  attribution_window_days integer not null default 30
    check (attribution_window_days between 1 and 90),
  starts_at timestamptz,
  ends_at timestamptz,
  promoter_cap integer check (promoter_cap is null or promoter_cap > 0),
  allow_promo_codes boolean not null default false,
  allow_native_post_attribution boolean not null default true,
  allow_external_links boolean not null default true,
  terms_markdown text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id),
  check (
    (commission_type = 'percentage'
      and commission_rate_bps between 0 and 10000
      and commission_fixed_amount_minor is null)
    or
    (commission_type = 'fixed_per_ticket'
      and commission_fixed_amount_minor >= 0
      and commission_rate_bps is null)
  ),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.event_promotion_program_versions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.event_promotion_programs(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  commission_type text not null check (commission_type in ('percentage', 'fixed_per_ticket')),
  commission_rate_bps integer,
  commission_fixed_amount_minor bigint,
  currency text not null check (currency ~ '^[a-z]{3}$'),
  attribution_window_days integer not null check (attribution_window_days between 1 and 90),
  eligible_ticket_rules jsonb not null default '{}'::jsonb,
  terms_markdown text,
  effective_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (program_id, version_number),
  check (
    (commission_type = 'percentage'
      and commission_rate_bps between 0 and 10000
      and commission_fixed_amount_minor is null)
    or
    (commission_type = 'fixed_per_ticket'
      and commission_fixed_amount_minor >= 0
      and commission_rate_bps is null)
  )
);

create table if not exists public.event_promotion_ticket_eligibility (
  program_id uuid not null references public.event_promotion_programs(id) on delete restrict,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  commission_type_override text check (commission_type_override in ('percentage', 'fixed_per_ticket')),
  commission_rate_bps_override integer check (commission_rate_bps_override between 0 and 10000),
  commission_fixed_amount_minor_override bigint check (commission_fixed_amount_minor_override >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (program_id, ticket_type_id),
  check (
    (commission_type_override is null
      and commission_rate_bps_override is null
      and commission_fixed_amount_minor_override is null)
    or
    (commission_type_override = 'percentage'
      and commission_rate_bps_override is not null
      and commission_fixed_amount_minor_override is null)
    or
    (commission_type_override = 'fixed_per_ticket'
      and commission_fixed_amount_minor_override is not null
      and commission_rate_bps_override is null)
  )
);

create table if not exists public.event_promoter_applications (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.event_promotion_programs(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  source text not null check (source in ('application', 'invite')),
  status text not null check (status in ('invited', 'applied', 'approved', 'rejected', 'withdrawn', 'expired')),
  application_message text,
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((source = 'application' and status in ('applied', 'approved', 'rejected', 'withdrawn'))
    or (source = 'invite' and status in ('invited', 'approved', 'rejected', 'expired')))
);

create unique index if not exists event_promoter_applications_one_active
  on public.event_promoter_applications(program_id, user_id)
  where status in ('invited', 'applied');

create table if not exists public.event_promoter_memberships (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.event_promotion_programs(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  application_id uuid references public.event_promoter_applications(id) on delete set null,
  status text not null default 'approved'
    check (status in ('approved', 'suspended', 'revoked', 'completed')),
  approved_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  suspended_at timestamptz,
  revoked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, user_id)
);

create table if not exists public.promoter_tracking_links (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.event_promoter_memberships(id) on delete restrict,
  program_id uuid not null references public.event_promotion_programs(id) on delete restrict,
  event_id uuid not null references public.events_v2(id) on delete restrict,
  token_hash text not null unique,
  label text,
  destination_path text not null default '/tickets/purchase',
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (destination_path like '/%')
);

create table if not exists public.promoter_attribution_touchpoints (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.event_promotion_programs(id) on delete restrict,
  membership_id uuid not null references public.event_promoter_memberships(id) on delete restrict,
  event_id uuid not null references public.events_v2(id) on delete restrict,
  source_type text not null check (source_type in ('tracking_link', 'promo_code', 'tourify_post', 'tourify_share')),
  source_id uuid,
  anonymous_session_id text,
  buyer_user_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (expires_at > occurred_at)
);

create table if not exists public.ticket_sale_attributions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ticket_sales(id) on delete restrict,
  ticket_type_id uuid references public.ticket_types(id) on delete restrict,
  event_id uuid not null references public.events_v2(id) on delete restrict,
  program_id uuid not null references public.event_promotion_programs(id) on delete restrict,
  program_version_id uuid not null references public.event_promotion_program_versions(id) on delete restrict,
  membership_id uuid not null references public.event_promoter_memberships(id) on delete restrict,
  touchpoint_id uuid references public.promoter_attribution_touchpoints(id) on delete set null,
  source_type text not null check (source_type in ('promo_code', 'tracking_link', 'tourify_post', 'tourify_share')),
  source_id uuid,
  attribution_rule text not null,
  attributed_at timestamptz not null default now(),
  eligible_revenue_minor bigint not null check (eligible_revenue_minor >= 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  snapshot_metadata jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.promoter_commission_ledger (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.event_promoter_memberships(id) on delete restrict,
  program_id uuid not null references public.event_promotion_programs(id) on delete restrict,
  attribution_id uuid references public.ticket_sale_attributions(id) on delete restrict,
  entry_type text not null
    check (entry_type in ('earned', 'refund_reversal', 'chargeback_reversal', 'dispute_reinstatement', 'admin_adjustment')),
  status text not null default 'pending'
    check (status in ('pending', 'available', 'allocated', 'paid', 'held')),
  amount_minor bigint not null check (amount_minor <> 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  eligible_revenue_minor bigint not null default 0 check (eligible_revenue_minor >= 0),
  commission_type text check (commission_type in ('percentage', 'fixed_per_ticket')),
  commission_rate_bps integer check (commission_rate_bps between 0 and 10000),
  commission_fixed_amount_minor bigint check (commission_fixed_amount_minor >= 0),
  originating_entry_id uuid references public.promoter_commission_ledger(id) on delete restrict,
  payment_reference text,
  ticket_reference uuid references public.tickets(id) on delete restrict,
  idempotency_key text not null unique,
  reason text,
  occurred_at timestamptz not null default now(),
  available_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (entry_type in ('earned', 'dispute_reinstatement') and amount_minor > 0)
    or (entry_type in ('refund_reversal', 'chargeback_reversal') and amount_minor < 0)
    or entry_type = 'admin_adjustment'
  )
);

create table if not exists public.promoter_payout_allocations (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.event_promoter_memberships(id) on delete restrict,
  commission_ledger_id uuid not null unique references public.promoter_commission_ledger(id) on delete restrict,
  settlement_reference text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  status text not null default 'pending' check (status in ('pending', 'allocated', 'paid', 'failed', 'reversed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.promoter_risk_flags (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.event_promotion_programs(id) on delete restrict,
  membership_id uuid references public.event_promoter_memberships(id) on delete restrict,
  attribution_id uuid references public.ticket_sale_attributions(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  risk_type text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  details jsonb not null default '{}'::jsonb,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_promotion_programs_event_status_idx
  on public.event_promotion_programs(event_id, status, starts_at, ends_at);
create index if not exists event_promotion_program_versions_program_effective_idx
  on public.event_promotion_program_versions(program_id, effective_at desc);
create index if not exists event_promoter_applications_program_status_idx
  on public.event_promoter_applications(program_id, status, created_at desc);
create index if not exists event_promoter_memberships_user_status_idx
  on public.event_promoter_memberships(user_id, status, created_at desc);
create index if not exists promoter_tracking_links_membership_status_idx
  on public.promoter_tracking_links(membership_id, status, created_at desc);
create index if not exists promoter_touchpoints_session_event_idx
  on public.promoter_attribution_touchpoints(anonymous_session_id, event_id, occurred_at desc)
  where anonymous_session_id is not null;
create index if not exists promoter_touchpoints_membership_occurred_idx
  on public.promoter_attribution_touchpoints(membership_id, occurred_at desc);
create index if not exists ticket_sale_attributions_order_idx
  on public.ticket_sale_attributions(order_id, created_at desc);
create index if not exists promoter_commission_ledger_membership_idx
  on public.promoter_commission_ledger(membership_id, status, occurred_at desc);
create index if not exists promoter_commission_ledger_program_idx
  on public.promoter_commission_ledger(program_id, status, occurred_at desc);
create index if not exists promoter_payout_allocations_membership_idx
  on public.promoter_payout_allocations(membership_id, status, created_at desc);
create index if not exists promoter_risk_flags_program_status_idx
  on public.promoter_risk_flags(program_id, status, created_at desc);

create or replace function public.prevent_promoter_commission_ledger_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'promoter_commission_ledger is append-only';
end;
$$;

drop trigger if exists prevent_promoter_commission_ledger_update on public.promoter_commission_ledger;
create trigger prevent_promoter_commission_ledger_update
  before update or delete on public.promoter_commission_ledger
  for each row execute function public.prevent_promoter_commission_ledger_mutation();

alter table public.event_promotion_programs enable row level security;
alter table public.event_promotion_program_versions enable row level security;
alter table public.event_promotion_ticket_eligibility enable row level security;
alter table public.event_promoter_applications enable row level security;
alter table public.event_promoter_memberships enable row level security;
alter table public.promoter_tracking_links enable row level security;
alter table public.promoter_attribution_touchpoints enable row level security;
alter table public.ticket_sale_attributions enable row level security;
alter table public.promoter_commission_ledger enable row level security;
alter table public.promoter_payout_allocations enable row level security;
alter table public.promoter_risk_flags enable row level security;

-- Keep promoter-domain RLS deployable on projects where the newer ticketing
-- capability helper has not yet been applied. This mirrors the active
-- application-level organizer predicate without depending on can_ticketing_on_event.
-- It stays in a non-exposed schema because it is SECURITY DEFINER.
create schema if not exists private;

create or replace function private.can_manage_event_promoter_program(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.events_v2 e
    where e.id = p_event_id
      and (
        e.created_by = auth.uid()
        or exists (
          select 1
          from public.org_members m
          where m.org_id = e.org_id
            and m.user_id = auth.uid()
            and m.role in ('owner', 'admin', 'production', 'tour_manager')
        )
      )
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;
revoke all on function private.can_manage_event_promoter_program(uuid) from public;
grant execute on function private.can_manage_event_promoter_program(uuid) to authenticated, service_role;

revoke all on public.event_promotion_programs, public.event_promotion_program_versions,
  public.event_promotion_ticket_eligibility, public.event_promoter_applications,
  public.event_promoter_memberships, public.promoter_tracking_links,
  public.promoter_attribution_touchpoints, public.ticket_sale_attributions,
  public.promoter_commission_ledger, public.promoter_payout_allocations,
  public.promoter_risk_flags from anon, authenticated;

grant select on public.event_promotion_programs, public.event_promotion_program_versions,
  public.event_promotion_ticket_eligibility to anon, authenticated;
grant select, insert on public.event_promoter_applications to authenticated;
grant select on public.event_promoter_memberships, public.promoter_tracking_links,
  public.promoter_commission_ledger, public.promoter_payout_allocations to authenticated;

drop policy if exists promoter_program_public_read on public.event_promotion_programs;
drop policy if exists promoter_program_organizer_read on public.event_promotion_programs;
drop policy if exists promoter_program_version_public_read on public.event_promotion_program_versions;
drop policy if exists promoter_program_version_organizer_read on public.event_promotion_program_versions;
drop policy if exists promoter_ticket_eligibility_public_read on public.event_promotion_ticket_eligibility;
drop policy if exists promoter_ticket_eligibility_organizer_read on public.event_promotion_ticket_eligibility;
drop policy if exists promoter_application_owner_read on public.event_promoter_applications;
drop policy if exists promoter_application_organizer_read on public.event_promoter_applications;
drop policy if exists promoter_application_self_insert on public.event_promoter_applications;
drop policy if exists promoter_membership_owner_read on public.event_promoter_memberships;
drop policy if exists promoter_membership_organizer_read on public.event_promoter_memberships;
drop policy if exists promoter_tracking_link_owner_read on public.promoter_tracking_links;
drop policy if exists promoter_tracking_link_organizer_read on public.promoter_tracking_links;
drop policy if exists promoter_ledger_owner_read on public.promoter_commission_ledger;
drop policy if exists promoter_ledger_organizer_read on public.promoter_commission_ledger;
drop policy if exists promoter_payout_owner_read on public.promoter_payout_allocations;

create policy promoter_program_public_read on public.event_promotion_programs
  for select to anon, authenticated
  using (status = 'open' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy promoter_program_organizer_read on public.event_promotion_programs
  for select to authenticated
  using (private.can_manage_event_promoter_program(event_id));

create policy promoter_program_version_public_read on public.event_promotion_program_versions
  for select to anon, authenticated
  using (exists (
    select 1 from public.event_promotion_programs p
    where p.id = program_id and p.status = 'open'
      and (p.starts_at is null or p.starts_at <= now())
      and (p.ends_at is null or p.ends_at > now())
  ));
create policy promoter_program_version_organizer_read on public.event_promotion_program_versions
  for select to authenticated
  using (exists (
    select 1 from public.event_promotion_programs p
    where p.id = program_id and private.can_manage_event_promoter_program(p.event_id)
  ));

create policy promoter_ticket_eligibility_public_read on public.event_promotion_ticket_eligibility
  for select to anon, authenticated
  using (exists (
    select 1 from public.event_promotion_programs p
    where p.id = program_id and p.status = 'open'
      and (p.starts_at is null or p.starts_at <= now())
      and (p.ends_at is null or p.ends_at > now())
  ));
create policy promoter_ticket_eligibility_organizer_read on public.event_promotion_ticket_eligibility
  for select to authenticated
  using (exists (
    select 1 from public.event_promotion_programs p
    where p.id = program_id and private.can_manage_event_promoter_program(p.event_id)
  ));

create policy promoter_application_owner_read on public.event_promoter_applications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy promoter_application_organizer_read on public.event_promoter_applications
  for select to authenticated using (exists (
    select 1 from public.event_promotion_programs p
    where p.id = program_id and private.can_manage_event_promoter_program(p.event_id)
  ));
create policy promoter_application_self_insert on public.event_promoter_applications
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and source = 'application'
    and status = 'applied'
    and exists (
      select 1 from public.event_promotion_programs p
      where p.id = program_id
        and p.status = 'open'
        and p.application_mode in ('open', 'approval_required')
        and (p.starts_at is null or p.starts_at <= now())
        and (p.ends_at is null or p.ends_at > now())
    )
  );

create policy promoter_membership_owner_read on public.event_promoter_memberships
  for select to authenticated using ((select auth.uid()) = user_id);
create policy promoter_membership_organizer_read on public.event_promoter_memberships
  for select to authenticated using (exists (
    select 1 from public.event_promotion_programs p
    where p.id = program_id and private.can_manage_event_promoter_program(p.event_id)
  ));

create policy promoter_tracking_link_owner_read on public.promoter_tracking_links
  for select to authenticated using (exists (
    select 1 from public.event_promoter_memberships m
    where m.id = membership_id and m.user_id = (select auth.uid())
  ));
create policy promoter_tracking_link_organizer_read on public.promoter_tracking_links
  for select to authenticated using (private.can_manage_event_promoter_program(event_id));

create policy promoter_ledger_owner_read on public.promoter_commission_ledger
  for select to authenticated using (exists (
    select 1 from public.event_promoter_memberships m
    where m.id = membership_id and m.user_id = (select auth.uid())
  ));
create policy promoter_ledger_organizer_read on public.promoter_commission_ledger
  for select to authenticated using (exists (
    select 1 from public.event_promotion_programs p
    where p.id = program_id and private.can_manage_event_promoter_program(p.event_id)
  ));

create policy promoter_payout_owner_read on public.promoter_payout_allocations
  for select to authenticated using (exists (
    select 1 from public.event_promoter_memberships m
    where m.id = membership_id and m.user_id = (select auth.uid())
  ));

comment on table public.event_promotion_programs is 'Promoter Network event program configuration. Financial terms are snapshotted in versions.';
comment on table public.ticket_sale_attributions is 'Immutable promoter attribution decision written only by trusted server payment/checkout flows.';
comment on table public.promoter_commission_ledger is 'Append-only promoter financial entitlement ledger. Never update or delete rows; create reversal entries.';

-- Use the long-lived platform feature-flag table rather than assuming the
-- optional admin-governance migration is already present in every environment.
do $$
begin
  if to_regclass('public.feature_flags') is null then
    raise notice 'Promoter Network flags were not seeded because public.feature_flags is absent.';
    return;
  end if;

  insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
  values
    ('event_promoter_program_enabled', 'Event Promoter program controls', 'Enable organizer Promoter Network program configuration.', false, 0),
    ('event_promoter_applications_enabled', 'Event Promoter applications', 'Enable promoter applications and invitations.', false, 0),
    ('event_promoter_attribution_capture_enabled', 'Event Promoter attribution', 'Enable server-resolved promoter attribution capture.', false, 0),
    ('event_promoter_shadow_commissions_enabled', 'Event Promoter shadow commissions', 'Calculate non-payable promoter commission outcomes.', false, 0),
    ('event_promoter_payable_commissions_enabled', 'Event Promoter payable commissions', 'Permit verified payment events to create promoter commission entries.', false, 0),
    ('event_promoter_payouts_enabled', 'Event Promoter payouts', 'Permit promoter commission payout allocation.', false, 0)
  on conflict (key) do nothing;
end;
$$;
