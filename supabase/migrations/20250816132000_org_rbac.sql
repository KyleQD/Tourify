set client_min_messages = warning;

-- Organizations, RBAC, Invites
create extension if not exists pgcrypto;

-- Core tables
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  settings jsonb not null default '{}',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists org_members (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null,
  token text not null unique,
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete set null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Role → permissions matrix
create table if not exists org_role_permissions (
  role text primary key,
  perms text[] not null
);

insert into org_role_permissions(role, perms) values
  ('owner',      array['org.manage','org.invite','event.manage','offer.manage','task.manage','schedule.manage','staff.manage','finance.manage','report.view','storage.read','storage.write']),
  ('admin',      array['org.invite','event.manage','offer.manage','task.manage','schedule.manage','staff.manage','finance.manage','report.view','storage.read','storage.write']),
  ('production', array['event.manage','task.manage','schedule.manage','staff.manage','report.view','storage.read','storage.write']),
  ('finance',    array['finance.manage','report.view','storage.read'])
on conflict (role) do nothing;

-- Helper functions
create or replace function public.is_org_member(uid uuid, oid uuid) returns boolean language sql stable as $$
  select exists(select 1 from org_members m where m.org_id = oid and m.user_id = uid)
$$;

create or replace function public.has_perm(uid uuid, oid uuid, perm text) returns boolean language plpgsql stable as $$
declare r text; p text[]; begin
  select role into r from org_members where org_id = oid and user_id = uid;
  if r is null then return false; end if;
  select perms into p from org_role_permissions where role = r;
  if p is null then return false; end if;
  return perm = any(p);
end$$;

-- RLS
alter table organizations enable row level security;
alter table org_members enable row level security;
alter table org_invites enable row level security;
alter table org_role_permissions enable row level security;

-- Organizations policies
drop policy if exists orgs_select on organizations;
create policy orgs_select on organizations for select using (public.is_org_member(auth.uid(), id));

drop policy if exists orgs_insert on organizations;
create policy orgs_insert on organizations for insert with check (auth.uid() = created_by);

drop policy if exists orgs_update on organizations;
create policy orgs_update on organizations for update using (public.has_perm(auth.uid(), id, 'org.manage'));

-- Members policies
drop policy if exists members_select on org_members;
create policy members_select on org_members for select using (public.is_org_member(auth.uid(), org_id));

drop policy if exists members_insert on org_members;
create policy members_insert on org_members for insert with check (
  public.has_perm(auth.uid(), org_id, 'org.manage') or public.has_perm(auth.uid(), org_id, 'org.invite')
);

drop policy if exists members_update on org_members;
create policy members_update on org_members for update using (
  public.has_perm(auth.uid(), org_id, 'org.manage')
);

drop policy if exists members_delete on org_members;
create policy members_delete on org_members for delete using (
  public.has_perm(auth.uid(), org_id, 'org.manage')
);

-- Invites
drop policy if exists invites_select on org_invites;
create policy invites_select on org_invites for select using (public.has_perm(auth.uid(), org_id, 'org.invite'));

drop policy if exists invites_insert on org_invites;
create policy invites_insert on org_invites for insert with check (public.has_perm(auth.uid(), org_id, 'org.invite'));

drop policy if exists invites_update on org_invites;
create policy invites_update on org_invites for update using (public.has_perm(auth.uid(), org_id, 'org.invite'));

-- Role permissions read-only to members
drop policy if exists roleperms_select on org_role_permissions;
create policy roleperms_select on org_role_permissions for select using (true);


