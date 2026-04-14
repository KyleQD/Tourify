-- Marketplace expansion: universal seller support, external links, seller agreement tracking

alter table public.marketplace_storefronts
  add column if not exists external_links jsonb not null default '[]'::jsonb,
  add column if not exists seller_type text,
  add column if not exists accepted_seller_agreement_at timestamptz,
  add column if not exists seller_agreement_version text;

comment on column public.marketplace_storefronts.external_links is 'Array of {label, url} objects for linking external websites';
comment on column public.marketplace_storefronts.seller_type is 'artist | venue | photographer | painter | individual | company';
comment on column public.marketplace_storefronts.accepted_seller_agreement_at is 'When seller accepted the marketplace seller agreement';
comment on column public.marketplace_storefronts.seller_agreement_version is 'Version string of the seller agreement accepted';

create index if not exists idx_marketplace_storefronts_seller_type
  on public.marketplace_storefronts(seller_type);
