-- REFERENCE ONLY. Audit actual schemas, UUID types, role/capability functions, and migration order.
-- Create with `supabase migration new` after repository audit. Never reset the database.

create schema if not exists music_marketplace;

create table if not exists music_marketplace.issuers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  legal_name text not null,
  entity_type text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists music_marketplace.offerings (
  id uuid primary key default gen_random_uuid(),
  issuer_id uuid not null references music_marketplace.issuers(id),
  pathway text,
  status text not null default 'draft',
  partner_id text,
  partner_offering_id text,
  current_disclosure_version_id uuid,
  feature_flag_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists music_marketplace.offering_versions (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references music_marketplace.offerings(id),
  version integer not null,
  manifest_hash text not null,
  status text not null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(offering_id, version)
);

create table if not exists music_marketplace.investor_partner_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  partner_id text not null,
  partner_account_id text not null,
  status text not null,
  eligibility_scope jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  observed_at timestamptz not null,
  payload_hash text not null,
  unique(partner_id, partner_account_id)
);

create table if not exists music_marketplace.subscriptions (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references music_marketplace.offerings(id),
  investor_user_id uuid not null,
  partner_subscription_id text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null,
  status text not null,
  disclosure_version_id uuid not null references music_marketplace.offering_versions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS and create repository-specific capability policies after audit.
