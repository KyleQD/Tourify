-- Harden band roster acceptance updates.
--
-- organization_artist_members is the canonical public roster link between
-- band/label organization personas and individual artist_profiles. Artists
-- may accept/decline/remove their own invite, but that should not let them
-- rewrite the organization, role, invited_by, or linked artist profile.

set client_min_messages = warning;

create or replace function public.enforce_artist_roster_member_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  is_artist_owner boolean := false;
  is_org_manager boolean := false;
begin
  if auth.uid() is null then
    return new;
  end if;

  select exists (
    select 1
    from public.artist_profiles ap
    where ap.id = old.artist_profile_id
      and ap.user_id = auth.uid()
  ) into is_artist_owner;

  select exists (
    select 1
    from public.organizer_accounts oa
    where oa.id = old.organizer_account_id
      and (
        oa.user_id = auth.uid()
        or exists (
          select 1
          from public.org_members m
          where m.org_id = oa.ops_org_id
            and m.user_id = auth.uid()
            and m.role in ('owner', 'admin', 'tour_manager')
        )
      )
  ) into is_org_manager;

  if is_artist_owner and not is_org_manager then
    if new.status not in ('accepted', 'declined', 'removed') then
      raise exception 'Artists may only accept, decline, or remove roster membership';
    end if;

    if new.organizer_account_id is distinct from old.organizer_account_id
      or new.artist_profile_id is distinct from old.artist_profile_id
      or new.role is distinct from old.role
      or new.invited_by is distinct from old.invited_by
      or new.created_at is distinct from old.created_at then
      raise exception 'Artists may only update roster membership status';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_artist_roster_member_update_trigger
  on public.organization_artist_members;

create trigger enforce_artist_roster_member_update_trigger
  before update on public.organization_artist_members
  for each row
  execute function public.enforce_artist_roster_member_update();
