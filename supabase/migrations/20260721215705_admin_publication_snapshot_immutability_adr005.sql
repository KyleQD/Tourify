-- ADR-005 — enforce publication snapshot immutability at the database boundary.
--
-- MANUAL-PUSH MIGRATION: review and apply unchanged after PUB-102/PUB-204.
-- Expand-only and non-destructive: no rows, tables, or columns are removed.

begin;

create or replace function public.guard_admin_publication_snapshot_update()
returns trigger
language plpgsql
set search_path to 'public', 'auth', 'extensions'
as $$
declare
  successor_ok boolean;
begin
  if new.id is distinct from old.id
     or new.org_id is distinct from old.org_id
     or new.created_at is distinct from old.created_at
     or new.idempotency_key is distinct from old.idempotency_key
     or new.correlation_id is distinct from old.correlation_id then
    raise exception 'Publication snapshot identity fields are immutable'
      using errcode = '55000';
  end if;

  if old.status in ('superseded', 'retracted') then
    raise exception 'Terminal publication snapshots are immutable'
      using errcode = '55000';
  end if;

  if old.status = 'draft' then
    if new.status <> 'draft' then
      raise exception 'Committed publications must be created by the transactional publish command'
        using errcode = '55000';
    end if;
    return new;
  end if;

  if old.status <> 'committed' then
    raise exception 'Unsupported publication snapshot state: %', old.status
      using errcode = '55000';
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
     and not public.has_perm(auth.uid(), old.org_id, 'tour.publish') then
    raise exception 'tour.publish capability is required for publication lifecycle changes'
      using errcode = '42501';
  end if;

  -- A committed snapshot may change only lifecycle metadata. Payload, checksum,
  -- audience classification, source version, subject, and publisher remain fixed.
  if (
    to_jsonb(new)
      - array['status', 'superseded_by', 'retracted_at', 'retracted_reason', 'updated_at']
  ) is distinct from (
    to_jsonb(old)
      - array['status', 'superseded_by', 'retracted_at', 'retracted_reason', 'updated_at']
  ) then
    raise exception 'Committed publication snapshot content is immutable; publish a correction version'
      using errcode = '55000';
  end if;

  if new.status = 'superseded' then
    if new.superseded_by is null or new.superseded_by = old.id then
      raise exception 'Superseding a publication requires a distinct successor snapshot'
        using errcode = '23514';
    end if;

    select exists (
      select 1
      from public.admin_publication_snapshots successor
      where successor.id = new.superseded_by
        and successor.org_id = old.org_id
        and successor.status = 'committed'
    ) into successor_ok;

    if not successor_ok then
      raise exception 'Successor publication must be committed and belong to the same organization'
        using errcode = '23514';
    end if;

    if new.retracted_at is not null or new.retracted_reason is not null then
      raise exception 'Superseded publications cannot also carry retraction metadata'
        using errcode = '23514';
    end if;
  elsif new.status = 'retracted' then
    if new.retracted_at is null
       or nullif(btrim(coalesce(new.retracted_reason, '')), '') is null then
      raise exception 'Retracted publications require timestamp and reason'
        using errcode = '23514';
    end if;
    if new.superseded_by is not null then
      raise exception 'Retracted publications cannot also be superseded'
        using errcode = '23514';
    end if;
  else
    raise exception 'Committed publications may transition only to superseded or retracted'
      using errcode = '23514';
  end if;

  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists guard_admin_publication_snapshot_update
  on public.admin_publication_snapshots;
create trigger guard_admin_publication_snapshot_update
before update on public.admin_publication_snapshots
for each row execute function public.guard_admin_publication_snapshot_update();

create or replace function public.guard_admin_publication_child_update()
returns trigger
language plpgsql
set search_path to 'public', 'extensions'
as $$
declare
  parent_status text;
  parent_id uuid := coalesce(new.snapshot_id, old.snapshot_id);
begin
  if tg_op = 'UPDATE' and new.snapshot_id is distinct from old.snapshot_id then
    raise exception 'Publication child snapshot_id is immutable'
      using errcode = '55000';
  end if;

  select snapshot.status
  into parent_status
  from public.admin_publication_snapshots snapshot
  where snapshot.id = parent_id;

  if parent_status is distinct from 'draft' then
    raise exception 'Committed publication children are immutable'
      using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;

drop trigger if exists guard_admin_publication_sections_update
  on public.admin_publication_sections;
create trigger guard_admin_publication_sections_update
before update or delete on public.admin_publication_sections
for each row execute function public.guard_admin_publication_child_update();

drop trigger if exists guard_admin_publication_audiences_update
  on public.admin_publication_audiences;
create trigger guard_admin_publication_audiences_update
before update or delete on public.admin_publication_audiences
for each row execute function public.guard_admin_publication_child_update();

drop trigger if exists guard_admin_publication_recipients_update
  on public.admin_publication_recipients;
create trigger guard_admin_publication_recipients_update
before update or delete on public.admin_publication_recipients
for each row execute function public.guard_admin_publication_child_update();

-- Authenticated clients may assemble and edit drafts. The SECURITY DEFINER
-- transactional publish function remains the only route that inserts committed
-- snapshots and their immutable section/audience/recipient rows.
drop policy if exists pub102_snapshots_insert on public.admin_publication_snapshots;
create policy pub102_snapshots_insert on public.admin_publication_snapshots
  for insert to authenticated
  with check (
    status = 'draft'
    and public.can_publication(auth.uid(), org_id, 'tour.manage')
  );

drop policy if exists pub102_sections_insert on public.admin_publication_sections;
create policy pub102_sections_insert on public.admin_publication_sections
  for insert to authenticated
  with check (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    and exists (
      select 1
      from public.admin_publication_snapshots snapshot
      where snapshot.id = admin_publication_sections.snapshot_id
        and snapshot.org_id = admin_publication_sections.org_id
        and snapshot.status = 'draft'
    )
  );

drop policy if exists pub102_sections_update on public.admin_publication_sections;
create policy pub102_sections_update on public.admin_publication_sections
  for update to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    and exists (
      select 1
      from public.admin_publication_snapshots snapshot
      where snapshot.id = admin_publication_sections.snapshot_id
        and snapshot.org_id = admin_publication_sections.org_id
        and snapshot.status = 'draft'
    )
  )
  with check (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    and exists (
      select 1
      from public.admin_publication_snapshots snapshot
      where snapshot.id = admin_publication_sections.snapshot_id
        and snapshot.org_id = admin_publication_sections.org_id
        and snapshot.status = 'draft'
    )
  );

drop policy if exists pub102_audiences_insert on public.admin_publication_audiences;
create policy pub102_audiences_insert on public.admin_publication_audiences
  for insert to authenticated
  with check (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    and exists (
      select 1
      from public.admin_publication_snapshots snapshot
      where snapshot.id = admin_publication_audiences.snapshot_id
        and snapshot.org_id = admin_publication_audiences.org_id
        and snapshot.status = 'draft'
    )
  );

drop policy if exists pub102_audiences_update on public.admin_publication_audiences;
create policy pub102_audiences_update on public.admin_publication_audiences
  for update to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    and exists (
      select 1
      from public.admin_publication_snapshots snapshot
      where snapshot.id = admin_publication_audiences.snapshot_id
        and snapshot.org_id = admin_publication_audiences.org_id
        and snapshot.status = 'draft'
    )
  )
  with check (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    and exists (
      select 1
      from public.admin_publication_snapshots snapshot
      where snapshot.id = admin_publication_audiences.snapshot_id
        and snapshot.org_id = admin_publication_audiences.org_id
        and snapshot.status = 'draft'
    )
  );

drop policy if exists pub102_recipients_insert on public.admin_publication_recipients;
create policy pub102_recipients_insert on public.admin_publication_recipients
  for insert to authenticated
  with check (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    and exists (
      select 1
      from public.admin_publication_snapshots snapshot
      where snapshot.id = admin_publication_recipients.snapshot_id
        and snapshot.org_id = admin_publication_recipients.org_id
        and snapshot.status = 'draft'
    )
  );

drop policy if exists pub102_recipients_update on public.admin_publication_recipients;
create policy pub102_recipients_update on public.admin_publication_recipients
  for update to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    and exists (
      select 1
      from public.admin_publication_snapshots snapshot
      where snapshot.id = admin_publication_recipients.snapshot_id
        and snapshot.org_id = admin_publication_recipients.org_id
        and snapshot.status = 'draft'
    )
  )
  with check (
    public.can_publication(auth.uid(), org_id, 'tour.manage')
    and exists (
      select 1
      from public.admin_publication_snapshots snapshot
      where snapshot.id = admin_publication_recipients.snapshot_id
        and snapshot.org_id = admin_publication_recipients.org_id
        and snapshot.status = 'draft'
    )
  );

comment on function public.guard_admin_publication_snapshot_update() is
  'ADR-005: committed snapshot content is immutable; only validated supersede/retract transitions are allowed.';
comment on function public.guard_admin_publication_child_update() is
  'ADR-005: sections, audiences, and recipients cannot be changed after their snapshot leaves draft.';

commit;
