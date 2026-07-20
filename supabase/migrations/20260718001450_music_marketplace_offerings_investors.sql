-- Phase 4 P4-00/P4-01/P4-02: marketplace offerings, investors, subscriptions.
-- Partner-led shell. Tourify is not BD/ATS/custody/escrow. Additive only.

begin;

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  enabled boolean not null default false,
  rollout_percentage int not null default 0 check (rollout_percentage between 0 and 100),
  target_org_ids uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_issuers (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  legal_name text not null,
  entity_type text not null default 'llc',
  status text not null default 'draft' check (status in (
    'draft', 'review', 'eligible', 'blocked', 'suspended'
  )),
  authority_attested boolean not null default false,
  readiness_score integer not null default 0 check (readiness_score between 0 and 100),
  deficiency_codes jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_issuer_parties (
  id uuid primary key default gen_random_uuid(),
  issuer_id uuid not null references public.music_marketplace_issuers(id) on delete cascade,
  party_role text not null check (party_role in (
    'beneficial_owner', 'affiliate', 'control_person', 'officer', 'counsel'
  )),
  display_name text not null,
  ownership_bps integer check (ownership_bps is null or (ownership_bps >= 0 and ownership_bps <= 10000)),
  partner_party_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Phase 3 valuation/finance FKs are added conditionally below so Phase 4 can apply
-- even when 20260717242000_music_valuation_and_finance.sql is not yet present.
create table if not exists public.music_marketplace_issuer_catalog_links (
  id uuid primary key default gen_random_uuid(),
  issuer_id uuid not null references public.music_marketplace_issuers(id) on delete cascade,
  artist_music_id uuid references public.artist_music(id) on delete set null,
  passport_version_id uuid,
  royalty_snapshot_ref text,
  valuation_id uuid,
  finance_offering_id uuid,
  status text not null default 'candidate' check (status in ('candidate', 'eligible', 'blocked')),
  deficiency_codes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_pathway_decisions (
  id uuid primary key default gen_random_uuid(),
  issuer_id uuid not null references public.music_marketplace_issuers(id) on delete cascade,
  pathway text not null check (pathway in (
    'reg_cf', 'reg_d_506b', 'reg_d_506c', 'reg_a_tier_2', 'registered_or_other'
  )),
  status text not null default 'planning' check (status in (
    'planning', 'counsel_review', 'approved', 'rejected', 'superseded'
  )),
  planning_facts jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  counsel_approved boolean not null default false,
  partner_approved boolean not null default false,
  approved_partner_id text,
  decision_notes text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_offerings (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  issuer_id uuid not null references public.music_marketplace_issuers(id) on delete restrict,
  pathway_decision_id uuid references public.music_marketplace_pathway_decisions(id) on delete set null,
  finance_offering_id uuid,
  pathway text,
  status text not null default 'draft' check (status in (
    'draft', 'preflight', 'partner_due_diligence', 'filed', 'live',
    'accepting_subscriptions', 'closing_pending', 'closed', 'active_reporting',
    'suspended', 'withdrawn', 'matured', 'terminated'
  )),
  partner_id text,
  partner_offering_id text,
  current_disclosure_version_id uuid,
  feature_flag_key text not null default 'music_marketplace_offerings_enabled',
  target_raise_minor bigint,
  currency text not null default 'USD',
  instrument_terms jsonb not null default '{}'::jsonb,
  liquidity_label text not null default 'illiquid_partner_controlled' check (liquidity_label in (
    'illiquid_partner_controlled', 'restricted_secondary_possible', 'no_liquidity_guarantee'
  )),
  accepts_subscriptions boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_offering_versions (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.music_marketplace_offerings(id) on delete cascade,
  version integer not null check (version > 0),
  manifest_hash text not null check (length(manifest_hash) = 64),
  status text not null check (status in ('draft', 'approved', 'published', 'superseded', 'withdrawn')),
  marketing_projection jsonb not null default '{}'::jsonb,
  risk_factors jsonb not null default '[]'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (offering_id, version)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'music_marketplace_offerings_disclosure_fk'
  ) then
    alter table public.music_marketplace_offerings
      add constraint music_marketplace_offerings_disclosure_fk
      foreign key (current_disclosure_version_id)
      references public.music_marketplace_offering_versions(id)
      on delete set null;
  end if;

  if to_regclass('public.music_valuation_catalog_valuations') is not null
     and not exists (
       select 1 from pg_constraint where conname = 'mm_catalog_links_valuation_fk'
     ) then
    alter table public.music_marketplace_issuer_catalog_links
      add constraint mm_catalog_links_valuation_fk
      foreign key (valuation_id)
      references public.music_valuation_catalog_valuations(id)
      on delete set null;
  end if;

  if to_regclass('public.music_finance_offerings') is not null then
    if not exists (
      select 1 from pg_constraint where conname = 'mm_catalog_links_finance_offering_fk'
    ) then
      alter table public.music_marketplace_issuer_catalog_links
        add constraint mm_catalog_links_finance_offering_fk
        foreign key (finance_offering_id)
        references public.music_finance_offerings(id)
        on delete set null;
    end if;
    if not exists (
      select 1 from pg_constraint where conname = 'mm_offerings_finance_offering_fk'
    ) then
      alter table public.music_marketplace_offerings
        add constraint mm_offerings_finance_offering_fk
        foreign key (finance_offering_id)
        references public.music_finance_offerings(id)
        on delete set null;
    end if;
  end if;
end $$;

create table if not exists public.music_marketplace_disclosure_documents (
  id uuid primary key default gen_random_uuid(),
  offering_version_id uuid not null references public.music_marketplace_offering_versions(id) on delete cascade,
  document_type text not null,
  storage_bucket text not null default 'music-marketplace-disclosures',
  storage_path text not null,
  sha256 text not null check (length(sha256) = 64),
  visibility text not null default 'data_room' check (visibility in (
    'data_room', 'investor', 'public_summary', 'admin'
  )),
  redaction_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_document_access_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.music_marketplace_disclosure_documents(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_investor_partner_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id text not null,
  partner_account_id text not null,
  status text not null check (status in (
    'pending', 'approved', 'restricted', 'rejected', 'expired', 'review'
  )),
  eligibility_scope jsonb not null default '{}'::jsonb,
  kyc_status text not null default 'unknown',
  sanctions_status text not null default 'unknown',
  tax_profile_status text not null default 'unknown',
  accreditation_status text not null default 'unknown',
  jurisdiction text,
  investor_type text,
  expires_at timestamptz,
  observed_at timestamptz not null,
  payload_hash text not null check (length(payload_hash) = 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, partner_account_id)
);

create table if not exists public.music_marketplace_investor_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  investor_user_id uuid not null references auth.users(id) on delete cascade,
  offering_id uuid not null references public.music_marketplace_offerings(id) on delete cascade,
  disclosure_version_id uuid not null references public.music_marketplace_offering_versions(id) on delete restrict,
  acknowledgement_type text not null,
  payload_hash text not null check (length(payload_hash) = 64),
  acknowledged_at timestamptz not null default now(),
  unique (investor_user_id, offering_id, disclosure_version_id, acknowledgement_type)
);

create table if not exists public.music_marketplace_subscriptions (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  offering_id uuid not null references public.music_marketplace_offerings(id) on delete restrict,
  investor_user_id uuid not null references auth.users(id) on delete cascade,
  partner_subscription_id text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null,
  status text not null default 'draft_local' check (status in (
    'draft_local', 'submitted_to_partner', 'partner_received', 'payment_pending',
    'escrowed', 'accepted', 'allocated', 'rejected', 'cancelled', 'refund_pending',
    'refunded', 'cooling_off', 'compliance_hold'
  )),
  escrow_status text not null default 'none' check (escrow_status in (
    'none', 'pending', 'held', 'released', 'refunded', 'failed'
  )),
  disclosure_version_id uuid not null references public.music_marketplace_offering_versions(id) on delete restrict,
  allocation_quantity_minor numeric(78, 0),
  idempotency_key text,
  partner_payload_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offering_id, investor_user_id, idempotency_key)
);

create table if not exists public.music_marketplace_subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.music_marketplace_subscriptions(id) on delete cascade,
  from_status text,
  to_status text not null,
  reason_code text,
  partner_event_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_compliance_holds (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in (
    'issuer', 'offering', 'investor', 'subscription', 'position', 'transfer', 'order'
  )),
  subject_id uuid not null,
  hold_type text not null,
  status text not null default 'open' check (status in ('open', 'released', 'expired')),
  reason_code text not null,
  opened_by uuid references auth.users(id) on delete set null,
  opened_at timestamptz not null default now(),
  released_at timestamptz
);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('music_marketplace_offerings_enabled', 'Music marketplace offerings', 'Issuer offering workspace and pathway-gated launches.', false, 0),
  ('music_marketplace_investor_portal_enabled', 'Music marketplace investor portal', 'Investor eligibility and portfolio read models.', false, 0),
  ('music_marketplace_subscriptions_enabled', 'Music marketplace subscriptions', 'Partner-routed primary subscriptions.', false, 0),
  ('music_marketplace_transfers_enabled', 'Music marketplace transfers', 'Deny-default transfer requests via partners.', false, 0),
  ('music_marketplace_secondary_sync_enabled', 'Music marketplace secondary sync', 'Partner ATS order/execution receipts only.', false, 0),
  ('music_marketplace_tokenization_enabled', 'Music marketplace tokenization', 'Optional token mirrors; never legal SOT.', false, 0),
  ('music_marketplace_admin_ops_enabled', 'Music marketplace admin ops', 'Admin market ops and kill switches.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.music_marketplace_issuers enable row level security;
alter table public.music_marketplace_issuer_parties enable row level security;
alter table public.music_marketplace_issuer_catalog_links enable row level security;
alter table public.music_marketplace_pathway_decisions enable row level security;
alter table public.music_marketplace_offerings enable row level security;
alter table public.music_marketplace_offering_versions enable row level security;
alter table public.music_marketplace_disclosure_documents enable row level security;
alter table public.music_marketplace_document_access_logs enable row level security;
alter table public.music_marketplace_investor_partner_accounts enable row level security;
alter table public.music_marketplace_investor_acknowledgements enable row level security;
alter table public.music_marketplace_subscriptions enable row level security;
alter table public.music_marketplace_subscription_events enable row level security;
alter table public.music_marketplace_compliance_holds enable row level security;

revoke all on
  public.music_marketplace_issuers,
  public.music_marketplace_issuer_parties,
  public.music_marketplace_issuer_catalog_links,
  public.music_marketplace_pathway_decisions,
  public.music_marketplace_offerings,
  public.music_marketplace_offering_versions,
  public.music_marketplace_disclosure_documents,
  public.music_marketplace_document_access_logs,
  public.music_marketplace_investor_partner_accounts,
  public.music_marketplace_investor_acknowledgements,
  public.music_marketplace_subscriptions,
  public.music_marketplace_subscription_events,
  public.music_marketplace_compliance_holds
from anon, authenticated;

grant select, insert, update on public.music_marketplace_issuers to authenticated;
grant select, insert, update on public.music_marketplace_issuer_parties to authenticated;
grant select, insert, update on public.music_marketplace_issuer_catalog_links to authenticated;
grant select, insert on public.music_marketplace_pathway_decisions to authenticated;
grant select, insert, update on public.music_marketplace_offerings to authenticated;
grant select, insert on public.music_marketplace_offering_versions to authenticated;
grant select, insert on public.music_marketplace_disclosure_documents to authenticated;
grant select, insert on public.music_marketplace_document_access_logs to authenticated;
grant select on public.music_marketplace_investor_partner_accounts to authenticated;
grant select, insert on public.music_marketplace_investor_acknowledgements to authenticated;
grant select, insert, update on public.music_marketplace_subscriptions to authenticated;
grant select on public.music_marketplace_subscription_events to authenticated;
grant select on public.music_marketplace_compliance_holds to authenticated;

grant all on
  public.music_marketplace_issuers,
  public.music_marketplace_issuer_parties,
  public.music_marketplace_issuer_catalog_links,
  public.music_marketplace_pathway_decisions,
  public.music_marketplace_offerings,
  public.music_marketplace_offering_versions,
  public.music_marketplace_disclosure_documents,
  public.music_marketplace_document_access_logs,
  public.music_marketplace_investor_partner_accounts,
  public.music_marketplace_investor_acknowledgements,
  public.music_marketplace_subscriptions,
  public.music_marketplace_subscription_events,
  public.music_marketplace_compliance_holds
to service_role;

drop policy if exists mm_issuers_owner on public.music_marketplace_issuers;
create policy mm_issuers_owner on public.music_marketplace_issuers
for all to authenticated using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

drop policy if exists mm_issuer_parties_owner on public.music_marketplace_issuer_parties;
create policy mm_issuer_parties_owner on public.music_marketplace_issuer_parties
for all to authenticated using (exists (
  select 1 from public.music_marketplace_issuers i where i.id = issuer_id and i.owner_user_id = (select auth.uid())
)) with check (exists (
  select 1 from public.music_marketplace_issuers i where i.id = issuer_id and i.owner_user_id = (select auth.uid())
));

drop policy if exists mm_catalog_links_owner on public.music_marketplace_issuer_catalog_links;
create policy mm_catalog_links_owner on public.music_marketplace_issuer_catalog_links
for all to authenticated using (exists (
  select 1 from public.music_marketplace_issuers i where i.id = issuer_id and i.owner_user_id = (select auth.uid())
)) with check (exists (
  select 1 from public.music_marketplace_issuers i where i.id = issuer_id and i.owner_user_id = (select auth.uid())
));

drop policy if exists mm_pathway_owner on public.music_marketplace_pathway_decisions;
create policy mm_pathway_owner on public.music_marketplace_pathway_decisions
for all to authenticated using (exists (
  select 1 from public.music_marketplace_issuers i where i.id = issuer_id and i.owner_user_id = (select auth.uid())
)) with check (exists (
  select 1 from public.music_marketplace_issuers i where i.id = issuer_id and i.owner_user_id = (select auth.uid())
));

drop policy if exists mm_offerings_owner on public.music_marketplace_offerings;
create policy mm_offerings_owner on public.music_marketplace_offerings
for all to authenticated using (exists (
  select 1 from public.music_marketplace_issuers i where i.id = issuer_id and i.owner_user_id = (select auth.uid())
)) with check (exists (
  select 1 from public.music_marketplace_issuers i where i.id = issuer_id and i.owner_user_id = (select auth.uid())
));

drop policy if exists mm_offering_versions_owner on public.music_marketplace_offering_versions;
create policy mm_offering_versions_owner on public.music_marketplace_offering_versions
for all to authenticated using (exists (
  select 1 from public.music_marketplace_offerings o
  join public.music_marketplace_issuers i on i.id = o.issuer_id
  where o.id = offering_id and i.owner_user_id = (select auth.uid())
)) with check (exists (
  select 1 from public.music_marketplace_offerings o
  join public.music_marketplace_issuers i on i.id = o.issuer_id
  where o.id = offering_id and i.owner_user_id = (select auth.uid())
));

drop policy if exists mm_disclosure_docs_owner on public.music_marketplace_disclosure_documents;
create policy mm_disclosure_docs_owner on public.music_marketplace_disclosure_documents
for select to authenticated using (exists (
  select 1 from public.music_marketplace_offering_versions v
  join public.music_marketplace_offerings o on o.id = v.offering_id
  join public.music_marketplace_issuers i on i.id = o.issuer_id
  where v.id = offering_version_id and i.owner_user_id = (select auth.uid())
));

drop policy if exists mm_disclosure_docs_insert on public.music_marketplace_disclosure_documents;
create policy mm_disclosure_docs_insert on public.music_marketplace_disclosure_documents
for insert to authenticated with check (exists (
  select 1 from public.music_marketplace_offering_versions v
  join public.music_marketplace_offerings o on o.id = v.offering_id
  join public.music_marketplace_issuers i on i.id = o.issuer_id
  where v.id = offering_version_id and i.owner_user_id = (select auth.uid())
));

drop policy if exists mm_doc_access_insert on public.music_marketplace_document_access_logs;
create policy mm_doc_access_insert on public.music_marketplace_document_access_logs
for insert to authenticated with check (actor_user_id = (select auth.uid()));
drop policy if exists mm_doc_access_select on public.music_marketplace_document_access_logs;
create policy mm_doc_access_select on public.music_marketplace_document_access_logs
for select to authenticated using (actor_user_id = (select auth.uid()));

drop policy if exists mm_investor_accounts_self on public.music_marketplace_investor_partner_accounts;
create policy mm_investor_accounts_self on public.music_marketplace_investor_partner_accounts
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists mm_acks_self on public.music_marketplace_investor_acknowledgements;
create policy mm_acks_self on public.music_marketplace_investor_acknowledgements
for all to authenticated using ((select auth.uid()) = investor_user_id)
with check ((select auth.uid()) = investor_user_id);

drop policy if exists mm_subscriptions_self on public.music_marketplace_subscriptions;
create policy mm_subscriptions_self on public.music_marketplace_subscriptions
for all to authenticated using ((select auth.uid()) = investor_user_id)
with check ((select auth.uid()) = investor_user_id);

drop policy if exists mm_subscriptions_issuer_select on public.music_marketplace_subscriptions;
create policy mm_subscriptions_issuer_select on public.music_marketplace_subscriptions
for select to authenticated using (exists (
  select 1 from public.music_marketplace_offerings o
  join public.music_marketplace_issuers i on i.id = o.issuer_id
  where o.id = offering_id and i.owner_user_id = (select auth.uid())
));

drop policy if exists mm_sub_events_self on public.music_marketplace_subscription_events;
create policy mm_sub_events_self on public.music_marketplace_subscription_events
for select to authenticated using (exists (
  select 1 from public.music_marketplace_subscriptions s
  where s.id = subscription_id and s.investor_user_id = (select auth.uid())
));

drop policy if exists mm_holds_self_select on public.music_marketplace_compliance_holds;
create policy mm_holds_self_select on public.music_marketplace_compliance_holds
for select to authenticated using (true);

drop policy if exists mm_issuers_service on public.music_marketplace_issuers;
create policy mm_issuers_service on public.music_marketplace_issuers for all to service_role using (true) with check (true);
drop policy if exists mm_issuer_parties_service on public.music_marketplace_issuer_parties;
create policy mm_issuer_parties_service on public.music_marketplace_issuer_parties for all to service_role using (true) with check (true);
drop policy if exists mm_catalog_links_service on public.music_marketplace_issuer_catalog_links;
create policy mm_catalog_links_service on public.music_marketplace_issuer_catalog_links for all to service_role using (true) with check (true);
drop policy if exists mm_pathway_service on public.music_marketplace_pathway_decisions;
create policy mm_pathway_service on public.music_marketplace_pathway_decisions for all to service_role using (true) with check (true);
drop policy if exists mm_offerings_service on public.music_marketplace_offerings;
create policy mm_offerings_service on public.music_marketplace_offerings for all to service_role using (true) with check (true);
drop policy if exists mm_offering_versions_service on public.music_marketplace_offering_versions;
create policy mm_offering_versions_service on public.music_marketplace_offering_versions for all to service_role using (true) with check (true);
drop policy if exists mm_disclosure_docs_service on public.music_marketplace_disclosure_documents;
create policy mm_disclosure_docs_service on public.music_marketplace_disclosure_documents for all to service_role using (true) with check (true);
drop policy if exists mm_doc_access_service on public.music_marketplace_document_access_logs;
create policy mm_doc_access_service on public.music_marketplace_document_access_logs for all to service_role using (true) with check (true);
drop policy if exists mm_investor_accounts_service on public.music_marketplace_investor_partner_accounts;
create policy mm_investor_accounts_service on public.music_marketplace_investor_partner_accounts for all to service_role using (true) with check (true);
drop policy if exists mm_acks_service on public.music_marketplace_investor_acknowledgements;
create policy mm_acks_service on public.music_marketplace_investor_acknowledgements for all to service_role using (true) with check (true);
drop policy if exists mm_subscriptions_service on public.music_marketplace_subscriptions;
create policy mm_subscriptions_service on public.music_marketplace_subscriptions for all to service_role using (true) with check (true);
drop policy if exists mm_sub_events_service on public.music_marketplace_subscription_events;
create policy mm_sub_events_service on public.music_marketplace_subscription_events for all to service_role using (true) with check (true);
drop policy if exists mm_holds_service on public.music_marketplace_compliance_holds;
create policy mm_holds_service on public.music_marketplace_compliance_holds for all to service_role using (true) with check (true);

comment on table public.music_marketplace_offerings is 'Partner-led securities offerings; Tourify does not match orders or hold escrow.';
comment on table public.music_marketplace_subscriptions is 'Subscription read/write shell; legal acceptance and escrow controlled by partners.';

commit;
