begin;

drop policy if exists "post_style_flags_read" on public.feature_flags;
create policy "post_style_flags_read"
  on public.feature_flags
  for select
  to anon, authenticated
  using (key like 'post_styles_%');

grant select on public.feature_flags to anon, authenticated;

alter table public.post_appearances
  drop constraint if exists post_appearances_schema_version_check;

alter table public.post_appearances
  add constraint post_appearances_schema_version_check
  check (schema_version in (1, 2));

alter table public.post_appearances
  drop constraint if exists post_appearances_source_profile_id_fkey;

alter table public.post_appearances
  add constraint post_appearances_source_profile_id_fkey
  foreign key (source_profile_id)
  references public.post_style_profiles(id)
  on delete set null;

create or replace function public.guard_post_appearance_snapshot_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.post_id is distinct from old.post_id
    or new.author_type is distinct from old.author_type
    or new.author_id is distinct from old.author_id
    or new.source_profile_id is distinct from old.source_profile_id
    or new.template_id is distinct from old.template_id
    or new.template_version is distinct from old.template_version
    or new.schema_version is distinct from old.schema_version
    or new.snapshot is distinct from old.snapshot
    or new.snapshot_hash is distinct from old.snapshot_hash
  then
    raise exception 'Published post appearance snapshots are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_post_appearance_snapshot_immutability
  on public.post_appearances;
create trigger guard_post_appearance_snapshot_immutability
  before update on public.post_appearances
  for each row execute function public.guard_post_appearance_snapshot_immutability();

create or replace function public.record_initial_post_appearance_revision()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.post_appearance_revisions (
    post_id,
    revision,
    snapshot,
    changed_by,
    change_reason
  )
  values (
    new.post_id,
    1,
    new.snapshot,
    auth.uid(),
    'published'
  );
  return new;
end;
$$;

drop trigger if exists record_initial_post_appearance_revision
  on public.post_appearances;
create trigger record_initial_post_appearance_revision
  after insert on public.post_appearances
  for each row execute function public.record_initial_post_appearance_revision();

drop policy if exists "post_appearances_select_public" on public.post_appearances;
create policy "post_appearances_select_visible_parent"
  on public.post_appearances
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_id
        and (
          p.visibility = 'public'
          or p.user_id = auth.uid()
          or (
            p.visibility = 'followers'
            and exists (
              select 1
              from public.follows f
              where f.follower_id = auth.uid()
                and f.following_id = p.user_id
            )
          )
        )
    )
  );

create or replace function public.set_post_style_profile_default(
  p_profile_id uuid
)
returns void
language plpgsql
set search_path = public
as $$
declare
  target public.post_style_profiles%rowtype;
begin
  select *
    into target
  from public.post_style_profiles
  where id = p_profile_id
    and created_by = auth.uid()
    and status = 'active'
  for update;

  if target.id is null then
    raise exception 'Style profile not found or unauthorized';
  end if;

  update public.post_style_profiles
  set is_default = false
  where owner_type = target.owner_type
    and owner_id = target.owner_id
    and is_default = true;

  update public.post_style_profiles
  set is_default = true
  where id = target.id;
end;
$$;

revoke all on function public.set_post_style_profile_default(uuid) from public, anon;
grant execute on function public.set_post_style_profile_default(uuid) to authenticated;

commit;
