set client_min_messages = warning;

drop policy if exists tour_artists_all on public.tour_artists;
drop policy if exists tour_artists_select on public.tour_artists;
drop policy if exists tour_artists_insert on public.tour_artists;
drop policy if exists tour_artists_update on public.tour_artists;
drop policy if exists tour_artists_delete on public.tour_artists;

create policy tour_artists_select on public.tour_artists for select to authenticated using (public.can_access_tour(tour_id) or exists (select 1 from public.tours t where t.id = tour_id and t.org_id is not null and public.is_org_member(auth.uid(), t.org_id)));
create policy tour_artists_insert on public.tour_artists for insert to authenticated with check (public.is_tour_owner(tour_id) or exists (select 1 from public.tours t where t.id = tour_id and t.org_id is not null and public.has_perm(auth.uid(), t.org_id, 'event.manage')));
create policy tour_artists_update on public.tour_artists for update to authenticated using (public.is_tour_owner(tour_id) or exists (select 1 from public.tours t where t.id = tour_id and t.org_id is not null and public.has_perm(auth.uid(), t.org_id, 'event.manage'))) with check (public.is_tour_owner(tour_id) or exists (select 1 from public.tours t where t.id = tour_id and t.org_id is not null and public.has_perm(auth.uid(), t.org_id, 'event.manage')));
create policy tour_artists_delete on public.tour_artists for delete to authenticated using (public.is_tour_owner(tour_id) or exists (select 1 from public.tours t where t.id = tour_id and t.org_id is not null and public.has_perm(auth.uid(), t.org_id, 'event.manage')));

drop policy if exists tour_vendors_all on public.tour_vendors;
drop policy if exists tour_vendors_select on public.tour_vendors;
drop policy if exists tour_vendors_insert on public.tour_vendors;
drop policy if exists tour_vendors_update on public.tour_vendors;
drop policy if exists tour_vendors_delete on public.tour_vendors;

create policy tour_vendors_select on public.tour_vendors for select to authenticated using (public.can_access_tour(tour_id) or exists (select 1 from public.tours t where t.id = tour_id and t.org_id is not null and public.is_org_member(auth.uid(), t.org_id)));
create policy tour_vendors_insert on public.tour_vendors for insert to authenticated with check (public.is_tour_owner(tour_id) or exists (select 1 from public.tours t where t.id = tour_id and t.org_id is not null and public.has_perm(auth.uid(), t.org_id, 'event.manage')));
create policy tour_vendors_update on public.tour_vendors for update to authenticated using (public.is_tour_owner(tour_id) or exists (select 1 from public.tours t where t.id = tour_id and t.org_id is not null and public.has_perm(auth.uid(), t.org_id, 'event.manage'))) with check (public.is_tour_owner(tour_id) or exists (select 1 from public.tours t where t.id = tour_id and t.org_id is not null and public.has_perm(auth.uid(), t.org_id, 'event.manage')));
create policy tour_vendors_delete on public.tour_vendors for delete to authenticated using (public.is_tour_owner(tour_id) or exists (select 1 from public.tours t where t.id = tour_id and t.org_id is not null and public.has_perm(auth.uid(), t.org_id, 'event.manage')));

drop policy if exists tour_teams_all on public.tour_teams;
drop policy if exists tour_teams_select on public.tour_teams;
drop policy if exists tour_teams_insert on public.tour_teams;
drop policy if exists tour_teams_update on public.tour_teams;
drop policy if exists tour_teams_delete on public.tour_teams;

create policy tour_teams_select on public.tour_teams for select to authenticated using (public.can_access_tour(tour_id) or exists (select 1 from public.tours t where t.id = tour_id and t.org_id is not null and public.is_org_member(auth.uid(), t.org_id)));
create policy tour_teams_insert on public.tour_teams for insert to authenticated with check (public.is_tour_owner(tour_id) or exists (select 1 from public.tours t where t.id = tour_id and t.org_id is not null and public.has_perm(auth.uid(), t.org_id, 'event.manage')));
create policy tour_teams_update on public.tour_teams for update to authenticated using (public.is_tour_owner(tour_id) or exists (select 1 from public.tours t where t.id = tour_id and t.org_id is not null and public.has_perm(auth.uid(), t.org_id, 'event.manage'))) with check (public.is_tour_owner(tour_id) or exists (select 1 from public.tours t where t.id = tour_id and t.org_id is not null and public.has_perm(auth.uid(), t.org_id, 'event.manage')));
create policy tour_teams_delete on public.tour_teams for delete to authenticated using (public.is_tour_owner(tour_id) or exists (select 1 from public.tours t where t.id = tour_id and t.org_id is not null and public.has_perm(auth.uid(), t.org_id, 'event.manage')));

drop policy if exists tour_team_members_all on public.tour_team_members;
drop policy if exists tour_team_members_select_org on public.tour_team_members;
drop policy if exists tour_team_members_insert_org on public.tour_team_members;
drop policy if exists tour_team_members_update_org on public.tour_team_members;
drop policy if exists tour_team_members_delete_org on public.tour_team_members;

create policy tour_team_members_select_org on public.tour_team_members for select to authenticated using (exists (select 1 from public.tour_teams tt join public.tours t on t.id = tt.tour_id where tt.id = team_id and t.org_id is not null and public.is_org_member(auth.uid(), t.org_id)));
create policy tour_team_members_insert_org on public.tour_team_members for insert to authenticated with check (exists (select 1 from public.tour_teams tt join public.tours t on t.id = tt.tour_id where tt.id = team_id and t.org_id is not null and public.has_perm(auth.uid(), t.org_id, 'event.manage')));
create policy tour_team_members_update_org on public.tour_team_members for update to authenticated using (exists (select 1 from public.tour_teams tt join public.tours t on t.id = tt.tour_id where tt.id = team_id and t.org_id is not null and public.has_perm(auth.uid(), t.org_id, 'event.manage'))) with check (exists (select 1 from public.tour_teams tt join public.tours t on t.id = tt.tour_id where tt.id = team_id and t.org_id is not null and public.has_perm(auth.uid(), t.org_id, 'event.manage')));
create policy tour_team_members_delete_org on public.tour_team_members for delete to authenticated using (exists (select 1 from public.tour_teams tt join public.tours t on t.id = tt.tour_id where tt.id = team_id and t.org_id is not null and public.has_perm(auth.uid(), t.org_id, 'event.manage')));;
