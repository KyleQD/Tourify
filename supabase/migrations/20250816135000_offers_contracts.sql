set client_min_messages = warning;

-- Offers, signatures, and required docs
create extension if not exists pgcrypto;

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events_v2(id) on delete cascade,
  artist_contact_id uuid,
  currency text not null default 'USD',
  terms jsonb not null default '{}'::jsonb, -- fees, rev share, bonuses, per diems, expenses
  status text not null check (status in ('draft','sent','signed','declined')) default 'draft',
  pdf_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists signatures (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id) on delete cascade,
  signer_email text not null,
  signer_role text not null, -- agent/artist/promoter
  status text not null check (status in ('pending','signed','declined')) default 'pending',
  signed_at timestamptz,
  file_url text,
  created_at timestamptz not null default now()
);

create table if not exists required_docs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events_v2(id) on delete cascade,
  kind text not null check (kind in ('coi','permit','tax','licensing','nda')),
  party text not null, -- artist/vendor/venue/promoter
  status text not null check (status in ('missing','uploaded','approved','rejected')) default 'missing',
  file_url text,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_offers_event on offers(event_id);
create index if not exists idx_reqdocs_event on required_docs(event_id);

-- RLS
alter table offers enable row level security;
alter table signatures enable row level security;
alter table required_docs enable row level security;

drop policy if exists offers_select on offers;
create policy offers_select on offers for select using (
  public.is_org_member(auth.uid(), (select org_id from events_v2 e where e.id = offers.event_id))
);
drop policy if exists offers_cud on offers;
create policy offers_cud on offers for all using (
  public.has_perm(auth.uid(), (select org_id from events_v2 e where e.id = offers.event_id), 'event.manage')
) with check (
  public.has_perm(auth.uid(), (select org_id from events_v2 e where e.id = offers.event_id), 'event.manage')
);

drop policy if exists sigs_select on signatures;
create policy sigs_select on signatures for select using (
  public.is_org_member(auth.uid(), (select org_id from events_v2 e join offers o on o.id = signatures.offer_id and e.id = o.event_id))
);
drop policy if exists sigs_cud on signatures;
create policy sigs_cud on signatures for all using (
  public.has_perm(auth.uid(), (select org_id from events_v2 e join offers o on o.id = signatures.offer_id and e.id = o.event_id), 'event.manage')
) with check (
  public.has_perm(auth.uid(), (select org_id from events_v2 e join offers o on o.id = signatures.offer_id and e.id = o.event_id), 'event.manage')
);

drop policy if exists docs_select on required_docs;
create policy docs_select on required_docs for select using (
  public.is_org_member(auth.uid(), (select org_id from events_v2 e where e.id = required_docs.event_id))
);
drop policy if exists docs_cud on required_docs;
create policy docs_cud on required_docs for all using (
  public.has_perm(auth.uid(), (select org_id from events_v2 e where e.id = required_docs.event_id), 'event.manage')
) with check (
  public.has_perm(auth.uid(), (select org_id from events_v2 e where e.id = required_docs.event_id), 'event.manage')
);


