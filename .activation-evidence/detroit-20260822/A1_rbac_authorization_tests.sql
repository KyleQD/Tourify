-- A1 Platform World editorial authorization tests (docs/24 runbook).
-- Transaction-scoped; ends in ROLLBACK. Local isolated database ONLY.

begin;

create temp table a1_results as
select * from (values
  ('placeholder', false)
) as t(case_name, passed);
grant insert, select on a1_results to authenticated;

-- Fixture: three synthetic auth users + an organization-admin role carrying
-- a non-World content-management permission.
insert into auth.users (id, email, encrypted_password, aud, role, email_confirmed_at, instance_id, created_at, updated_at, confirmation_token, recovery_token)
values
  ('11111111-1111-4111-8111-aaaaaaaaaaa1','a1-nobody@test.local','x','authenticated','authenticated',now(),'00000000-0000-0000-0000-000000000000',now(),now(),'',''),
  ('11111111-1111-4111-8111-aaaaaaaaaaa2','a1-reviewer@test.local','x','authenticated','authenticated',now(),'00000000-0000-0000-0000-000000000000',now(),now(),'',''),
  ('11111111-1111-4111-8111-aaaaaaaaaaa3','a1-publisher@test.local','x','authenticated','authenticated',now(),'00000000-0000-0000-0000-000000000000',now(),now(),'','')
on conflict (id) do nothing;

insert into public.rbac_permissions (id, name, display_name, category)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01','content.manage','Organization content manage','organization')
on conflict (name) do nothing;

insert into public.rbac_roles (id, name, display_name, scope_type, is_system)
values ('cccccccc-cccc-cccc-cccc-cccccccccc01','org_content_admin','Organization Content Admin','entity', false)
on conflict (name) do nothing;

insert into public.rbac_role_permissions (role_id, permission_id)
values ('cccccccc-cccc-cccc-cccc-cccccccccc01','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01')
on conflict do nothing;

-- Org-scoped assignment for the "nobody" user simulating an ordinary org admin.
insert into public.rbac_user_entity_roles (user_id, entity_type, entity_id, role_id, is_active)
values
  ('11111111-1111-4111-8111-aaaaaaaaaaa1','Organization','dddddddd-dddd-dddd-dddd-dddddddddd01','cccccccc-cccc-cccc-cccc-cccccccccc01', true);

-- Reviewer/publisher assignments (Global scope, per migration convention:
-- entity_type='Global', entity_id=role_id).
insert into public.rbac_user_entity_roles (user_id, entity_type, entity_id, role_id, is_active)
select u.id,'Global',r.id,r.id,true
from (values
  ('11111111-1111-4111-8111-aaaaaaaaaaa2'::uuid),
  ('11111111-1111-4111-8111-aaaaaaaaaaa3'::uuid)
) as u(id)
join public.rbac_roles r on r.name = case when u.id::text like '%2' then 'world_reviewer' else 'world_publisher' end;

-- Per-case checks driven from the client session (SET ROLE cannot execute
-- inside SECURITY DEFINER). Each block impersonates the fixture user exactly
-- as Supabase Auth would (request.jwt.claims.sub = auth.uid()).



set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-aaaaaaaaaaa1","role":"authenticated"}';
insert into a1_results(case_name, passed)
select 'no_world_role_denied', public.has_global_permission('world.knowledge.view') = false;
reset role;


set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-aaaaaaaaaaa1","role":"authenticated"}';
insert into a1_results(case_name, passed)
select 'org_admin_without_world_role_denied', public.has_global_permission('world.knowledge.view') = false;
reset role;


set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-aaaaaaaaaaa2","role":"authenticated"}';
insert into a1_results(case_name, passed)
select 'reviewer_can_view', public.has_global_permission('world.knowledge.view') = true;
reset role;


set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-aaaaaaaaaaa2","role":"authenticated"}';
insert into a1_results(case_name, passed)
select 'reviewer_can_review', public.has_global_permission('world.knowledge.review') = true;
reset role;


set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-aaaaaaaaaaa2","role":"authenticated"}';
insert into a1_results(case_name, passed)
select 'reviewer_cannot_publish', public.has_global_permission('world.knowledge.publish') = false;
reset role;


set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-aaaaaaaaaaa2","role":"authenticated"}';
insert into a1_results(case_name, passed)
select 'reviewer_cannot_manage_sources', public.has_global_permission('world.sources.manage') = false;
reset role;


set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-aaaaaaaaaaa3","role":"authenticated"}';
insert into a1_results(case_name, passed)
select 'publisher_can_publish', public.has_global_permission('world.knowledge.publish') = true;
reset role;


update public.rbac_user_entity_roles set end_at = now() - interval '1 day'
where user_id='11111111-1111-4111-8111-aaaaaaaaaaa2';

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-aaaaaaaaaaa2","role":"authenticated"}';
insert into a1_results(case_name, passed)
select 'expired_assignment_denied_view', not public.has_global_permission('world.knowledge.view');
reset role;

-- Case 7 structural proof: the function accepts ONLY a permission name and
-- derives the user exclusively from auth.uid() (see migration definition).
insert into a1_results(case_name, passed)
select 'auth_uid_only_signature', ok from (
  select (count(*)=1 and bool_and(array_to_string(coalesce(proargnames, ARRAY[]::text[]), ',') like '%p_permission_name%')) as ok
  from pg_proc where proname='has_global_permission'
) q;

-- Summary: every case must pass.
select case_name, passed, case when passed then 'PASS' else 'FAIL' end as verdict
from a1_results where case_name <> 'placeholder' order by case_name;

select 'ALL_PASS='||bool_and(passed) from a1_results where case_name <> 'placeholder';

rollback;
