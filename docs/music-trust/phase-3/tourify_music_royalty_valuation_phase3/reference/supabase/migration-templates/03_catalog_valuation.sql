-- REFERENCE ONLY. Valuation must remain separate from royalty accounting.

create schema if not exists music_valuation;

create table if not exists music_valuation.valuation_model_versions (
  id uuid primary key default gen_random_uuid(),
  model_key text not null,
  version text not null,
  status text not null check (status in ('draft','validated','active','retired')),
  methodology_uri text not null,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (model_key, version)
);

create table if not exists music_valuation.catalog_valuations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id),
  valued_interest_snapshot jsonb not null,
  input_snapshot_sha256 text not null,
  model_version_id uuid not null references music_valuation.valuation_model_versions(id),
  valuation_date date not null,
  currency text not null,
  downside_minor bigint not null,
  base_minor bigint not null,
  upside_minor bigint not null,
  confidence_score numeric(5,2) not null,
  assumptions jsonb not null,
  exclusions jsonb not null default '[]'::jsonb,
  status text not null check (status in ('draft','review','issued','superseded','withdrawn')),
  created_at timestamptz not null default now()
);

alter table music_valuation.valuation_model_versions enable row level security;
alter table music_valuation.catalog_valuations enable row level security;
