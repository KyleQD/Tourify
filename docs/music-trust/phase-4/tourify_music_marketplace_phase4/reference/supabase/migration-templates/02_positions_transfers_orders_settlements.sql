-- REFERENCE ONLY. Official ownership remains with the approved transfer agent/partner.

create table if not exists music_marketplace.security_classes (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references music_marketplace.offerings(id),
  official_source text not null,
  partner_security_id text not null,
  quantity_scale integer not null default 0,
  status text not null,
  unique(official_source, partner_security_id)
);

create table if not exists music_marketplace.positions (
  id uuid primary key default gen_random_uuid(),
  security_class_id uuid not null references music_marketplace.security_classes(id),
  investor_user_id uuid not null,
  official_position_id text not null,
  quantity_minor numeric(78,0) not null,
  restriction_status text not null,
  reconciliation_status text not null default 'pending',
  observed_at timestamptz not null,
  payload_hash text not null,
  unique(security_class_id, official_position_id)
);

create table if not exists music_marketplace.transfer_requests (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references music_marketplace.positions(id),
  requested_by uuid not null,
  status text not null,
  eligibility_snapshot jsonb not null,
  partner_transfer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists music_marketplace.partner_orders (
  id uuid primary key default gen_random_uuid(),
  investor_user_id uuid not null,
  security_class_id uuid not null references music_marketplace.security_classes(id),
  partner_id text not null,
  partner_order_id text,
  side text not null check (side in ('buy','sell')),
  quantity_minor numeric(78,0) not null,
  price_minor bigint,
  currency text,
  status text not null,
  observed_at timestamptz,
  payload_hash text,
  created_at timestamptz not null default now()
);

create table if not exists music_marketplace.executions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references music_marketplace.partner_orders(id),
  partner_execution_id text not null,
  quantity_minor numeric(78,0) not null,
  price_minor bigint not null,
  fee_minor bigint not null default 0,
  executed_at timestamptz not null,
  payload_hash text not null,
  unique(partner_execution_id)
);

create table if not exists music_marketplace.settlements (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references music_marketplace.executions(id),
  partner_settlement_id text,
  status text not null,
  expected jsonb not null,
  actual jsonb,
  reconciliation_status text not null default 'pending',
  settled_at timestamptz
);
