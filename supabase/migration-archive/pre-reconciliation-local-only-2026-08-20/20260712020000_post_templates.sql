-- Post templates for Cross-Platform Composer
set client_min_messages = warning;

create extension if not exists "pgcrypto";

create table if not exists public.post_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  template_name text not null,
  template_category text default 'general'
    check (template_category in ('general', 'promotion', 'announcement', 'event', 'personal', 'business')),
  content_template text not null,
  media_templates jsonb default '[]'::jsonb,
  hashtag_groups jsonb default '[]'::jsonb,
  account_types text[] default array[]::text[],
  variables jsonb default '{}'::jsonb,
  usage_count integer default 0,
  is_public boolean default false,
  is_active boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_post_templates_user
  on public.post_templates(user_id, is_active);

create index if not exists idx_post_templates_public
  on public.post_templates(is_public, is_active)
  where is_public = true;

alter table public.post_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'post_templates'
      and policyname = 'Users can select own or public post templates'
  ) then
    create policy "Users can select own or public post templates" on public.post_templates
      for select
      using (user_id = auth.uid() or is_public = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'post_templates'
      and policyname = 'Users can insert own post templates'
  ) then
    create policy "Users can insert own post templates" on public.post_templates
      for insert
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'post_templates'
      and policyname = 'Users can update own post templates'
  ) then
    create policy "Users can update own post templates" on public.post_templates
      for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'post_templates'
      and policyname = 'Users can delete own post templates'
  ) then
    create policy "Users can delete own post templates" on public.post_templates
      for delete
      using (user_id = auth.uid());
  end if;
end $$;

-- Soft-delete / update trigger for updated_at when helper exists
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'update_updated_at_column'
  ) then
    drop trigger if exists post_templates_updated_at on public.post_templates;
    create trigger post_templates_updated_at
      before update on public.post_templates
      for each row execute function public.update_updated_at_column();
  end if;
exception
  when others then
    raise notice 'post_templates updated_at trigger skipped: %', sqlerrm;
end $$;

create or replace function public.create_post_template(
  p_user_id uuid,
  p_template_name text,
  p_content_template text,
  p_template_category text default 'general',
  p_hashtag_groups jsonb default '[]'::jsonb,
  p_account_types text[] default array[]::text[],
  p_variables jsonb default '{}'::jsonb,
  p_is_public boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  template_id uuid;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  insert into public.post_templates (
    user_id,
    template_name,
    template_category,
    content_template,
    hashtag_groups,
    account_types,
    variables,
    is_public
  )
  values (
    p_user_id,
    p_template_name,
    coalesce(nullif(p_template_category, ''), 'general'),
    p_content_template,
    coalesce(p_hashtag_groups, '[]'::jsonb),
    coalesce(p_account_types, array[]::text[]),
    coalesce(p_variables, '{}'::jsonb),
    coalesce(p_is_public, false)
  )
  returning id into template_id;

  return template_id;
end;
$$;

grant execute on function public.create_post_template(
  uuid, text, text, text, jsonb, text[], jsonb, boolean
) to authenticated;

comment on table public.post_templates is
  'Reusable content templates for Cross-Platform Composer';
