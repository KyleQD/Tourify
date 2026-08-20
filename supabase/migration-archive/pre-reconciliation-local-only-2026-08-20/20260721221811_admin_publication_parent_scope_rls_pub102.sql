-- PUB-102 corrective ownership and RLS hardening.
-- Expand-only: deterministic parent-derived org_id repair; unresolved historical
-- relationships are recorded for review and remain present. No source row is deleted.
-- migration-validation: policies-replaced-by PUB-102-scoped-publication-read-policies

begin;

create table if not exists public.admin_publication_ownership_quarantine (
  id uuid primary key default gen_random_uuid(),
  org_id uuid null,
  source_table text not null,
  source_id uuid not null,
  issue_code text not null,
  observed jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz null,
  resolution_note text null,
  unique (source_table, source_id, issue_code)
);

alter table public.admin_publication_ownership_quarantine enable row level security;
alter table public.admin_publication_ownership_quarantine force row level security;
revoke all on public.admin_publication_ownership_quarantine from anon, authenticated;
grant select on public.admin_publication_ownership_quarantine to authenticated;
grant all on public.admin_publication_ownership_quarantine to service_role;

drop policy if exists pub102_ownership_quarantine_select on public.admin_publication_ownership_quarantine;
create policy pub102_ownership_quarantine_select
  on public.admin_publication_ownership_quarantine
  for select to authenticated
  using (
    org_id is not null
    and (
      public.can_publication(auth.uid(), org_id, 'audit.view')
      or public.can_publication(auth.uid(), org_id, 'tour.publish')
    )
  );

drop policy if exists pub102_ownership_quarantine_service on public.admin_publication_ownership_quarantine;
create policy pub102_ownership_quarantine_service
  on public.admin_publication_ownership_quarantine
  for all to service_role using (true) with check (true);

-- Record ambiguous/missing canonical parents before deterministic repair.
insert into public.admin_publication_ownership_quarantine (
  org_id, source_table, source_id, issue_code, observed
)
select s.org_id, 'admin_publication_snapshots', s.id, 'snapshot_parent_org_ambiguous',
       jsonb_build_object(
         'snapshot_org_id', s.org_id,
         'tour_id', s.tour_id,
         'tour_org_id', t.org_id,
         'event_id', s.event_id,
         'event_org_id', e.org_id
       )
from public.admin_publication_snapshots s
left join public.tours t on t.id = s.tour_id
left join public.events_v2 e on e.id = s.event_id
where (s.tour_id is not null and t.id is null)
   or (s.event_id is not null and e.id is null)
   or (t.org_id is not null and e.org_id is not null and t.org_id <> e.org_id)
on conflict (source_table, source_id, issue_code) do update
set observed = excluded.observed,
    detected_at = now();

-- A snapshot inherits organization ownership when its available canonical parents agree.
update public.admin_publication_snapshots s
set org_id = parent.parent_org_id
from (
  select s2.id,
         coalesce(t.org_id, e.org_id) as parent_org_id
  from public.admin_publication_snapshots s2
  left join public.tours t on t.id = s2.tour_id
  left join public.events_v2 e on e.id = s2.event_id
  where coalesce(t.org_id, e.org_id) is not null
    and (t.org_id is null or e.org_id is null or t.org_id = e.org_id)
) parent
where s.id = parent.id
  and s.org_id is distinct from parent.parent_org_id;

-- Child ownership is always derived from the immutable snapshot/recipient parent.
update public.admin_publication_sections child
set org_id = parent.org_id
from public.admin_publication_snapshots parent
where child.snapshot_id = parent.id
  and child.org_id is distinct from parent.org_id;

update public.admin_publication_audiences child
set org_id = parent.org_id
from public.admin_publication_snapshots parent
where child.snapshot_id = parent.id
  and child.org_id is distinct from parent.org_id;

update public.admin_publication_recipients child
set org_id = parent.org_id
from public.admin_publication_snapshots parent
where child.snapshot_id = parent.id
  and child.org_id is distinct from parent.org_id;

update public.admin_publication_deliveries child
set org_id = recipient.org_id,
    snapshot_id = recipient.snapshot_id
from public.admin_publication_recipients recipient
where child.recipient_id = recipient.id
  and (
    child.org_id is distinct from recipient.org_id
    or child.snapshot_id is distinct from recipient.snapshot_id
  );

update public.admin_publication_acknowledgements child
set org_id = recipient.org_id,
    snapshot_id = recipient.snapshot_id
from public.admin_publication_recipients recipient
where child.recipient_id = recipient.id
  and (
    child.org_id is distinct from recipient.org_id
    or child.snapshot_id is distinct from recipient.snapshot_id
  );

update public.admin_publication_share_tokens child
set org_id = parent.org_id
from public.admin_publication_snapshots parent
where child.snapshot_id = parent.id
  and child.org_id is distinct from parent.org_id;

update public.admin_publication_access_logs child
set org_id = parent.org_id
from public.admin_publication_snapshots parent
where child.snapshot_id = parent.id
  and child.org_id is distinct from parent.org_id;

update public.admin_publication_access_logs child
set org_id = parent.org_id
from public.admin_publication_share_tokens parent
where child.snapshot_id is null
  and child.share_token_id = parent.id
  and child.org_id is distinct from parent.org_id;

update public.admin_publication_access_logs child
set org_id = parent.org_id
from public.admin_publication_recipients parent
where child.snapshot_id is null
  and child.share_token_id is null
  and child.recipient_id = parent.id
  and child.org_id is distinct from parent.org_id;

update public.admin_publication_outbox child
set org_id = parent.org_id
from public.admin_publication_snapshots parent
where child.snapshot_id = parent.id
  and child.org_id is distinct from parent.org_id;

-- Composite uniqueness supports organization-preserving foreign keys.
create unique index if not exists uq_tours_id_org
  on public.tours (id, org_id);
create unique index if not exists uq_events_v2_id_org
  on public.events_v2 (id, org_id);
create unique index if not exists uq_admin_domain_transactions_id_org
  on public.admin_domain_transactions (id, org_id);
create unique index if not exists uq_admin_publication_snapshots_id_org
  on public.admin_publication_snapshots (id, org_id);
create unique index if not exists uq_admin_publication_audiences_id_org
  on public.admin_publication_audiences (id, org_id);
create unique index if not exists uq_admin_publication_recipients_id_org
  on public.admin_publication_recipients (id, org_id);
create unique index if not exists uq_admin_publication_share_tokens_id_org
  on public.admin_publication_share_tokens (id, org_id);
create unique index if not exists uq_admin_publication_outbox_id_org
  on public.admin_publication_outbox (id, org_id);

-- NOT VALID prevents table rewrites; each constraint still protects all new writes.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'admin_publication_snapshots_tour_org_fk') then
    alter table public.admin_publication_snapshots
      add constraint admin_publication_snapshots_tour_org_fk
      foreign key (tour_id, org_id) references public.tours (id, org_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'admin_publication_snapshots_event_org_fk') then
    alter table public.admin_publication_snapshots
      add constraint admin_publication_snapshots_event_org_fk
      foreign key (event_id, org_id) references public.events_v2 (id, org_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'admin_publication_snapshots_tx_org_fk') then
    alter table public.admin_publication_snapshots
      add constraint admin_publication_snapshots_tx_org_fk
      foreign key (domain_transaction_id, org_id)
      references public.admin_domain_transactions (id, org_id) not valid;
  end if;
end $$;

do $$
declare
  v_table text;
  v_constraint text;
begin
  for v_table, v_constraint in values
    ('admin_publication_sections', 'admin_publication_sections_snapshot_org_fk'),
    ('admin_publication_audiences', 'admin_publication_audiences_snapshot_org_fk'),
    ('admin_publication_recipients', 'admin_publication_recipients_snapshot_org_fk'),
    ('admin_publication_deliveries', 'admin_publication_deliveries_snapshot_org_fk'),
    ('admin_publication_acknowledgements', 'admin_publication_acks_snapshot_org_fk'),
    ('admin_publication_share_tokens', 'admin_publication_share_tokens_snapshot_org_fk'),
    ('admin_publication_access_logs', 'admin_publication_access_logs_snapshot_org_fk'),
    ('admin_publication_outbox', 'admin_publication_outbox_snapshot_org_fk')
  loop
    if not exists (select 1 from pg_constraint where conname = v_constraint) then
      execute format(
        'alter table public.%I add constraint %I foreign key (snapshot_id, org_id) references public.admin_publication_snapshots (id, org_id) not valid',
        v_table,
        v_constraint
      );
    end if;
  end loop;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'admin_publication_recipients_audience_org_fk') then
    alter table public.admin_publication_recipients
      add constraint admin_publication_recipients_audience_org_fk
      foreign key (audience_id, org_id)
      references public.admin_publication_audiences (id, org_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'admin_publication_deliveries_recipient_org_fk') then
    alter table public.admin_publication_deliveries
      add constraint admin_publication_deliveries_recipient_org_fk
      foreign key (recipient_id, org_id)
      references public.admin_publication_recipients (id, org_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'admin_publication_acks_recipient_org_fk') then
    alter table public.admin_publication_acknowledgements
      add constraint admin_publication_acks_recipient_org_fk
      foreign key (recipient_id, org_id)
      references public.admin_publication_recipients (id, org_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'admin_publication_access_logs_token_org_fk') then
    alter table public.admin_publication_access_logs
      add constraint admin_publication_access_logs_token_org_fk
      foreign key (share_token_id, org_id)
      references public.admin_publication_share_tokens (id, org_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'admin_publication_access_logs_recipient_org_fk') then
    alter table public.admin_publication_access_logs
      add constraint admin_publication_access_logs_recipient_org_fk
      foreign key (recipient_id, org_id)
      references public.admin_publication_recipients (id, org_id) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'admin_publication_outbox_tx_org_fk') then
    alter table public.admin_publication_outbox
      add constraint admin_publication_outbox_tx_org_fk
      foreign key (domain_transaction_id, org_id)
      references public.admin_domain_transactions (id, org_id) not valid;
  end if;
end $$;

-- Validate every clean relation. Ambiguous historical rows remain quarantined and
-- the NOT VALID constraint still rejects any new mismatch.
do $$
declare
  item record;
begin
  for item in
    select c.conrelid::regclass as table_name, c.conname
    from pg_constraint c
    where c.conname in (
      'admin_publication_snapshots_tour_org_fk',
      'admin_publication_snapshots_event_org_fk',
      'admin_publication_snapshots_tx_org_fk',
      'admin_publication_sections_snapshot_org_fk',
      'admin_publication_audiences_snapshot_org_fk',
      'admin_publication_recipients_snapshot_org_fk',
      'admin_publication_deliveries_snapshot_org_fk',
      'admin_publication_acks_snapshot_org_fk',
      'admin_publication_share_tokens_snapshot_org_fk',
      'admin_publication_access_logs_snapshot_org_fk',
      'admin_publication_outbox_snapshot_org_fk',
      'admin_publication_recipients_audience_org_fk',
      'admin_publication_deliveries_recipient_org_fk',
      'admin_publication_acks_recipient_org_fk',
      'admin_publication_access_logs_token_org_fk',
      'admin_publication_access_logs_recipient_org_fk',
      'admin_publication_outbox_tx_org_fk'
    ) and not c.convalidated
  loop
    begin
      execute format('alter table %s validate constraint %I', item.table_name, item.conname);
    exception when foreign_key_violation then
      null;
    end;
  end loop;
end $$;

-- Snapshot payloads, recipient PII, delivery evidence, and token hashes are manager
-- data. Worker/vendor/public projections are served by scoped viewer APIs.
drop policy if exists pub102_snapshots_select on public.admin_publication_snapshots;
create policy pub102_snapshots_select on public.admin_publication_snapshots
  for select to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    or public.can_publication(auth.uid(), org_id, 'tour.publish')
  );

drop policy if exists pub102_sections_select on public.admin_publication_sections;
create policy pub102_sections_select on public.admin_publication_sections
  for select to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    or public.can_publication(auth.uid(), org_id, 'tour.publish')
  );

drop policy if exists pub102_audiences_select on public.admin_publication_audiences;
create policy pub102_audiences_select on public.admin_publication_audiences
  for select to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    or public.can_publication(auth.uid(), org_id, 'tour.publish')
  );

drop policy if exists pub102_recipients_select on public.admin_publication_recipients;
create policy pub102_recipients_select on public.admin_publication_recipients
  for select to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    or public.can_publication(auth.uid(), org_id, 'tour.publish')
  );

drop policy if exists pub102_deliveries_select on public.admin_publication_deliveries;
create policy pub102_deliveries_select on public.admin_publication_deliveries
  for select to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    or public.can_publication(auth.uid(), org_id, 'tour.publish')
  );

drop policy if exists pub102_acks_select on public.admin_publication_acknowledgements;
create policy pub102_acks_select on public.admin_publication_acknowledgements
  for select to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    or public.can_publication(auth.uid(), org_id, 'tour.publish')
    or actor_user_id = auth.uid()
  );

drop policy if exists pub102_acks_insert on public.admin_publication_acknowledgements;
create policy pub102_acks_insert on public.admin_publication_acknowledgements
  for insert to authenticated
  with check (
    actor_user_id = auth.uid()
    and exists (
      select 1
      from public.admin_publication_recipients r
      where r.id = recipient_id
        and r.snapshot_id = snapshot_id
        and r.org_id = org_id
        and r.subject_type = 'user'
        and r.subject_key = auth.uid()::text
    )
  );

drop policy if exists pub102_share_tokens_select on public.admin_publication_share_tokens;
create policy pub102_share_tokens_select on public.admin_publication_share_tokens
  for select to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    or public.can_publication(auth.uid(), org_id, 'tour.publish')
  );

drop policy if exists pub102_access_logs_select on public.admin_publication_access_logs;
create policy pub102_access_logs_select on public.admin_publication_access_logs
  for select to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'audit.view')
    or public.can_publication(auth.uid(), org_id, 'tour.publish')
  );

drop policy if exists pub102_access_logs_insert on public.admin_publication_access_logs;
create policy pub102_access_logs_insert on public.admin_publication_access_logs
  for insert to authenticated
  with check (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    or public.can_publication(auth.uid(), org_id, 'tour.publish')
  );

commit;
