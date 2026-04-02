-- Ticketing schema tied to events_v2 (canonical event model)
create extension if not exists pgcrypto;

-- Ticket types per event
create table if not exists ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events_v2(id) on delete cascade,
  name text not null,
  description text,
  price numeric not null default 0 check (price >= 0),
  quantity_available integer not null check (quantity_available >= 0),
  quantity_sold integer not null default 0 check (quantity_sold >= 0),
  max_per_customer integer,
  sale_start timestamptz,
  sale_end timestamptz,
  category text not null default 'general' check (category in ('general','vip','premium','early_bird','student','senior','group','backstage')),
  benefits text[] default '{}',
  seating_section text,
  is_transferable boolean not null default true,
  transfer_fee numeric not null default 0,
  refund_policy text default 'No refunds',
  age_restriction integer,
  requires_id boolean not null default false,
  featured boolean not null default false,
  priority_order integer not null default 0,
  is_active boolean not null default true,
  ticket_code text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ticket sales / purchase records
create table if not exists ticket_sales (
  id uuid primary key default gen_random_uuid(),
  ticket_type_id uuid not null references ticket_types(id) on delete cascade,
  event_id uuid not null references events_v2(id) on delete cascade,
  buyer_user_id uuid references auth.users(id) on delete set null,
  buyer_name text,
  buyer_email text,
  quantity integer not null default 1 check (quantity >= 1),
  unit_price numeric not null check (unit_price >= 0),
  total_amount numeric not null check (total_amount >= 0),
  discount_amount numeric not null default 0,
  promo_code_id uuid,
  payment_status text not null default 'pending' check (payment_status in ('pending','completed','refunded','failed','cancelled')),
  payment_method text,
  payment_reference text,
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill missing columns for environments with legacy ticketing tables.
alter table ticket_sales
  add column if not exists ticket_type_id uuid,
  add column if not exists event_id uuid,
  add column if not exists buyer_user_id uuid,
  add column if not exists buyer_name text,
  add column if not exists buyer_email text,
  add column if not exists quantity integer not null default 1,
  add column if not exists unit_price numeric not null default 0,
  add column if not exists total_amount numeric not null default 0,
  add column if not exists discount_amount numeric not null default 0,
  add column if not exists promo_code_id uuid,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists checked_in boolean not null default false,
  add column if not exists checked_in_at timestamptz,
  add column if not exists metadata jsonb not null default '{}',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Promotional campaigns
create table if not exists ticket_campaigns (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events_v2(id) on delete cascade,
  name text not null,
  description text,
  campaign_type text not null check (campaign_type in ('early_bird','flash_sale','group_discount','loyalty','referral','social_media','email','influencer')),
  discount_type text not null check (discount_type in ('percentage','fixed','buy_one_get_one','free_upgrade')),
  discount_value numeric not null default 0,
  start_date timestamptz not null,
  end_date timestamptz not null,
  max_uses integer,
  current_uses integer not null default 0,
  applicable_ticket_types uuid[] default '{}',
  target_audience jsonb default '{}',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Promo codes
create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references ticket_campaigns(id) on delete set null,
  event_id uuid not null references events_v2(id) on delete cascade,
  code text not null,
  description text,
  discount_type text not null check (discount_type in ('percentage','fixed','free_shipping')),
  discount_value numeric not null default 0,
  min_purchase_amount numeric not null default 0,
  max_discount_amount numeric,
  max_uses integer,
  current_uses integer not null default 0,
  applicable_ticket_types uuid[] default '{}',
  start_date timestamptz not null,
  end_date timestamptz not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, code)
);

-- FK from ticket_sales to promo_codes
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'ticket_sales' and column_name = 'promo_code_id'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'fk_ticket_sales_promo_code'
  ) then
    alter table ticket_sales
      add constraint fk_ticket_sales_promo_code
      foreign key (promo_code_id) references promo_codes(id) on delete set null;
  end if;
end $$;

-- Indexes
create index if not exists idx_ticket_types_event on ticket_types(event_id);
create index if not exists idx_ticket_sales_event on ticket_sales(event_id);
create index if not exists idx_ticket_sales_type on ticket_sales(ticket_type_id);
create index if not exists idx_ticket_sales_buyer on ticket_sales(buyer_user_id);
create index if not exists idx_ticket_sales_status on ticket_sales(payment_status);
create index if not exists idx_ticket_campaigns_event on ticket_campaigns(event_id);
create index if not exists idx_promo_codes_event on promo_codes(event_id);
create index if not exists idx_promo_codes_code on promo_codes(code);

-- RLS
alter table ticket_types enable row level security;
alter table ticket_sales enable row level security;
alter table ticket_campaigns enable row level security;
alter table promo_codes enable row level security;

-- Permissive policies for authenticated users (org-level filtering done at the application layer)
do $$ begin
  drop policy if exists ticket_types_all on ticket_types;
  create policy ticket_types_all on ticket_types for all
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

  drop policy if exists ticket_sales_all on ticket_sales;
  create policy ticket_sales_all on ticket_sales for all
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

  drop policy if exists ticket_campaigns_all on ticket_campaigns;
  create policy ticket_campaigns_all on ticket_campaigns for all
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

  drop policy if exists promo_codes_all on promo_codes;
  create policy promo_codes_all on promo_codes for all
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');
end $$;
