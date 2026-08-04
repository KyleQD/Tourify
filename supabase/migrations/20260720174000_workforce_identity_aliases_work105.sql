-- WORK-105: Identity merge aliases + audit (expand-only).
-- Never invent org_id; merges stamp acting org from the authorized command.

create table if not exists public.workforce_identity_aliases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  canonical_staff_member_id uuid not null references public.staff_members (id) on delete cascade,
  alias_staff_member_id uuid not null references public.staff_members (id) on delete cascade,
  signal text not null,
  strength text not null check (strength in ('strong', 'weak')),
  merged_by uuid null references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, alias_staff_member_id)
);

create index if not exists idx_workforce_identity_aliases_org
  on public.workforce_identity_aliases (org_id);

create index if not exists idx_workforce_identity_aliases_canonical
  on public.workforce_identity_aliases (canonical_staff_member_id);

comment on table public.workforce_identity_aliases is
  'WORK-105 retained aliases after authorized identity merges; weak signals never auto-merge.';

alter table public.workforce_identity_aliases enable row level security;

drop policy if exists work105_aliases_select on public.workforce_identity_aliases;
drop policy if exists work105_aliases_insert on public.workforce_identity_aliases;

create policy work105_aliases_select on public.workforce_identity_aliases
  for select to authenticated
  using (
    public.can_workforce(auth.uid(), org_id, 'workforce.view')
    or public.can_workforce(auth.uid(), org_id, 'workforce.manage')
  );

create policy work105_aliases_insert on public.workforce_identity_aliases
  for insert to authenticated
  with check (public.can_workforce(auth.uid(), org_id, 'workforce.manage'));

revoke all on public.workforce_identity_aliases from anon;
grant select, insert on public.workforce_identity_aliases to authenticated;
grant all on public.workforce_identity_aliases to service_role;
