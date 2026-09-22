set client_min_messages = warning;

-- P2 Migration 010: marketplace_fee_rules
-- Versioned platform fee rules with effective date ranges.
-- Admin-only writes. Fee calculations at checkout read the active rule.

create table if not exists public.marketplace_fee_rules (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  description text not null,
  percentage_fee numeric(5,4),
  fixed_fee_cents integer,
  minimum_fee_cents integer,
  maximum_fee_cents integer,
  scope text not null default 'all'
    check (scope in ('all', 'general', 'artist', 'venue', 'organization')),
  listing_kind_scope text
    check (listing_kind_scope in ('physical', 'service', 'external')),
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketplace_fee_rules enable row level security;

-- Admin-only write (service role or profiles.role = 'admin')
drop policy if exists "marketplace_fee_rules_admin_manage" on public.marketplace_fee_rules;
create policy "marketplace_fee_rules_admin_manage"
  on public.marketplace_fee_rules
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- No direct public read — projected fee is shown in checkout, not raw rules.

-- updated_at trigger
drop trigger if exists marketplace_fee_rules_touch_updated_at
  on public.marketplace_fee_rules;
create trigger marketplace_fee_rules_touch_updated_at
  before update on public.marketplace_fee_rules
  for each row execute procedure public.marketplace_touch_updated_at();

-- Seed a default 10% fee rule (inactive — must be explicitly enabled by admin)
insert into public.marketplace_fee_rules (
  version, description, percentage_fee, scope, is_active
) values (
  1, 'Default platform fee (10%)', 0.1000, 'all', false
) on conflict do nothing;

comment on table public.marketplace_fee_rules is
  'Versioned platform fee rules. Admin-only writes. Only active rules with matching scope are applied at checkout.';
comment on column public.marketplace_fee_rules.percentage_fee is
  'Decimal percentage, e.g. 0.1000 = 10%';
comment on column public.marketplace_fee_rules.fixed_fee_cents is
  'Fixed fee component in minor currency units (cents)';
comment on column public.marketplace_fee_rules.is_active is
  'Must be explicitly set to true by admin before the rule is applied';
