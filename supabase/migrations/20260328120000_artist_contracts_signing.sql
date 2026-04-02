-- Artist contracts: counterparty, template metadata, send + sign RPCs, RLS for counterparties

alter table public.artist_contracts
  add column if not exists counterparty_user_id uuid references auth.users(id) on delete set null,
  add column if not exists template_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists sent_at timestamptz;

create index if not exists idx_artist_contracts_counterparty on public.artist_contracts(counterparty_user_id);

-- Replace single-owner policy with owner (full access) + counterparty (read sent/signed only)
drop policy if exists "Artists can manage their own contracts" on public.artist_contracts;

create policy "artist_contracts_owner_all"
  on public.artist_contracts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "artist_contracts_counterparty_select"
  on public.artist_contracts
  for select
  using (
    counterparty_user_id is not null
    and auth.uid() = counterparty_user_id
    and status in ('sent', 'signed')
  );

-- Case-insensitive username -> profile id (authenticated callers)
create or replace function public.lookup_profile_id_by_username(p_username text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.profiles
  where username is not null
    and lower(trim(username)) = lower(trim(p_username))
  limit 1;
$$;

grant execute on function public.lookup_profile_id_by_username(text) to authenticated;

-- Notify counterparty (bypasses notifications RLS)
create or replace function public.notify_contract_counterparty(p_contract_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select id, user_id, counterparty_user_id, title
  into r
  from public.artist_contracts
  where id = p_contract_id;

  if r.id is null or r.counterparty_user_id is null then
    return;
  end if;

  insert into public.notifications (user_id, type, title, content, metadata)
  values (
    r.counterparty_user_id,
    'collaboration_request',
    'Contract pending your signature',
    coalesce(nullif(trim(r.title), ''), 'A contract needs your review'),
    jsonb_build_object(
      'contract_id', p_contract_id,
      'from_user_id', r.user_id,
      'path', '/contracts/' || p_contract_id::text
    )
  );
end;
$$;

-- Owner sends draft -> sent + notification
create or replace function public.send_artist_contract(p_contract_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.artist_contracts where id = p_contract_id;
  if r.id is null then
    raise exception 'Contract not found';
  end if;
  if r.user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;
  if r.status <> 'draft' then
    raise exception 'Only drafts can be sent';
  end if;
  if r.counterparty_user_id is null then
    raise exception 'Counterparty required';
  end if;
  if r.terms is null or length(trim(r.terms)) < 10 then
    raise exception 'Terms required';
  end if;

  update public.artist_contracts
  set
    status = 'sent',
    sent_at = coalesce(sent_at, now()),
    updated_at = now()
  where id = p_contract_id;

  perform public.notify_contract_counterparty(p_contract_id);
end;
$$;

grant execute on function public.send_artist_contract(uuid) to authenticated;

-- Both parties sign after status = sent; when both present -> signed
create or replace function public.sign_artist_contract(
  p_contract_id uuid,
  p_signer_role text,
  p_legal_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  m jsonb;
  sigs jsonb;
  owner_done boolean;
  cp_done boolean;
  new_status text;
begin
  if length(trim(coalesce(p_legal_name, ''))) < 2 then
    raise exception 'Legal name required';
  end if;
  if p_signer_role not in ('owner', 'counterparty') then
    raise exception 'Invalid role';
  end if;

  select * into r from public.artist_contracts where id = p_contract_id for update;
  if r.id is null then
    raise exception 'Contract not found';
  end if;
  if r.status <> 'sent' then
    raise exception 'Contract must be sent before signing';
  end if;

  if p_signer_role = 'owner' and auth.uid() <> r.user_id then
    raise exception 'Not authorized';
  end if;
  if p_signer_role = 'counterparty' and auth.uid() <> r.counterparty_user_id then
    raise exception 'Not authorized';
  end if;

  m := coalesce(r.metadata, '{}'::jsonb);
  sigs := coalesce(m->'signatures', '{}'::jsonb);

  if p_signer_role = 'owner' then
    if sigs ? 'owner' then
      raise exception 'Already signed as artist';
    end if;
    sigs := sigs || jsonb_build_object(
      'owner',
      jsonb_build_object(
        'user_id', auth.uid(),
        'legal_name', p_legal_name,
        'signed_at', to_jsonb(now())
      )
    );
  else
    if sigs ? 'counterparty' then
      raise exception 'Already signed as counterparty';
    end if;
    sigs := sigs || jsonb_build_object(
      'counterparty',
      jsonb_build_object(
        'user_id', auth.uid(),
        'legal_name', p_legal_name,
        'signed_at', to_jsonb(now())
      )
    );
  end if;

  m := jsonb_set(m, '{signatures}', sigs, true);

  owner_done := (sigs ? 'owner');
  cp_done := (sigs ? 'counterparty');

  if owner_done and cp_done then
    new_status := 'signed';
  else
    new_status := r.status;
  end if;

  update public.artist_contracts
  set
    metadata = m,
    status = new_status,
    updated_at = now()
  where id = p_contract_id;
end;
$$;

grant execute on function public.sign_artist_contract(uuid, text, text) to authenticated;
