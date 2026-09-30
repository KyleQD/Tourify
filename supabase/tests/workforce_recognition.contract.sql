\set ON_ERROR_STOP on
begin;
create function public.test_uuid(n int) returns uuid language sql immutable as $$select md5(n::text)::uuid$$;
create function public.test_assert(ok boolean,msg text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'ASSERT: %',msg; end if; end$$;
create function public.test_denied(statement text,expected text) returns void language plpgsql as $$
begin begin execute statement; exception when others then
 if sqlstate=expected then return; end if; raise; end;
 raise exception 'Expected denial %: %',expected,statement;
end;$$;
insert into auth.users select test_uuid(n) from generate_series(1,6)n;
insert into test_hiring_managers select test_uuid(n),'organization',test_uuid(10+n) from generate_series(1,4)n;
insert into staff_members select test_uuid(20+n),test_uuid(5),'organization',test_uuid(10+n),'active' from generate_series(1,4)n;
-- 60 authentic, ended contexts across four employers.
insert into events_v2 select test_uuid(100+n),'settled',now()-interval '2 days',test_uuid(1+(n-1)%4),test_uuid(11+(n-1)%4),null from generate_series(1,60)n;
insert into events select test_uuid(100+n),null,'published' from generate_series(1,60)n;
insert into employment_assignments(id,user_id,employer_entity_type,employer_entity_id,staff_member_id,role_key,role_title,starts_at,ends_at,status,event_id)
 select test_uuid(200+n),test_uuid(5),'organization',test_uuid(11+(n-1)%4),test_uuid(21+(n-1)%4),
 'stage-manager','Stage Manager',now()-interval '3 days',now()-interval '2 days','active',test_uuid(100+n) from generate_series(1,60)n;
set local role authenticated;
select set_config('request.jwt.claim.sub',test_uuid(5)::text,true);
select test_denied($q$select verify_workforce_assignment(test_uuid(201),'Excellent role delivery','Signed attendance and closeout')$q$,'42501');
select test_denied($q$update employment_assignments set role_key='audio-engineer' where id=test_uuid(201)$q$,'42501');
select test_denied($q$update employment_assignments set status='completed' where id=test_uuid(201)$q$,'42501');
select test_denied($q$insert into workforce_role_credits(id) values(gen_random_uuid())$q$,'42501');
select test_denied($q$select workforce_recognition_private.badges(test_uuid(5))$q$,'42501');
select set_config('request.jwt.claim.sub',test_uuid(6)::text,true);
select test_denied($q$select verify_workforce_assignment(test_uuid(201),'Excellent role delivery','Signed attendance and closeout')$q$,'42501');
select set_config('request.jwt.claim.sub',test_uuid(1)::text,true);
select verify_workforce_assignment(test_uuid(201),'Excellent role delivery','Signed attendance and closeout');
select verify_workforce_assignment(test_uuid(201),'Excellent role delivery','Signed attendance and closeout');
select test_assert((select count(*)=1 from workforce_role_credits),'Retry must not duplicate credit');
select test_assert((select status='completed' from employment_assignments where id=test_uuid(201)),'Verified work marked completed');
select test_denied($q$update employment_assignments set event_id=test_uuid(102) where id=test_uuid(201)$q$,'22023');
select set_config('request.jwt.claim.sub',test_uuid(5)::text,true);
select test_assert((workforce_recognition_profile(test_uuid(5))->'badges'->0->>'level')::int=1,'First verified assignment unlocks Qualified');
select test_assert((select count(*)=2 from workforce_advancement_history),'Role and family history');
select test_assert(workforce_recognition_profile(test_uuid(5))->'is_public'='false'::jsonb,'Private by default');
select set_config('request.jwt.claim.sub',test_uuid(6)::text,true);
select test_assert(workforce_recognition_profile(test_uuid(5))->'badges'='[]'::jsonb,'Unshared profile hidden');
select test_assert((select count(*)=0 from workforce_role_credits),'Outsider cannot read provenance');
select set_config('request.jwt.claim.sub',test_uuid(5)::text,true);
insert into workforce_recognition_visibility values(test_uuid(5),true);
select set_config('request.jwt.claim.sub',test_uuid(6)::text,true);
select test_assert(jsonb_array_length(workforce_recognition_profile(test_uuid(5))->'badges')=2,'Opt-in profile exposes safe badges');
select test_assert(not(workforce_recognition_profile(test_uuid(5))->'endorsements'->0 ? 'verified_by'),'No verifier identity in public projection');
reset role;
-- A second assignment in the same event/role must not increase credit.
insert into employment_assignments select test_uuid(999),user_id,employer_entity_type,employer_entity_id,staff_member_id,staff_shift_id,role_key,role_title,role_definition_snapshot,starts_at,ends_at,status,event_id,tour_id,updated_at from employment_assignments where id=test_uuid(201);
set local role authenticated;
select set_config('request.jwt.claim.sub',test_uuid(1)::text,true);
select test_denied($q$select verify_workforce_assignment(test_uuid(999),'Excellent role delivery','Signed attendance and closeout')$q$,'23505');
reset role;
-- Cancellation, future windows, missing hire, mismatched employer, and unknown catalog role.
update events_v2 set status='archived' where id=test_uuid(102);
set local role authenticated;
select set_config('request.jwt.claim.sub',test_uuid(2)::text,true);
select test_denied($q$select verify_workforce_assignment(test_uuid(202),'Excellent role delivery','Signed attendance and closeout')$q$,'22023');
reset role;
update events_v2 set status='settled' where id=test_uuid(102);
update employment_assignments set ends_at=now()+interval '1 day' where id=test_uuid(202);
set local role authenticated;
select test_denied($q$select verify_workforce_assignment(test_uuid(202),'Excellent role delivery','Signed attendance and closeout')$q$,'22023');
reset role;
update employment_assignments set ends_at=now()-interval '2 days',staff_member_id=null where id=test_uuid(202);
set local role authenticated;
select test_denied($q$select verify_workforce_assignment(test_uuid(202),'Excellent role delivery','Signed attendance and closeout')$q$,'22023');
reset role;
update employment_assignments set staff_member_id=test_uuid(21) where id=test_uuid(202);
set local role authenticated;
select test_denied($q$select verify_workforce_assignment(test_uuid(202),'Excellent role delivery','Signed attendance and closeout')$q$,'22023');
reset role;
update employment_assignments set staff_member_id=test_uuid(22),role_key='bogus' where id=test_uuid(202);
set local role authenticated;
select test_denied($q$select verify_workforce_assignment(test_uuid(202),'Excellent role delivery','Signed attendance and closeout')$q$,'22023');
reset role;
update employment_assignments set role_key='stage-manager' where id=test_uuid(202);
-- Verify remaining events, checking every level boundary in the real DB projection.
do $$declare n int; target int;
begin for n in 2..60 loop
 perform set_config('request.jwt.claim.sub',test_uuid(1+(n-1)%4)::text,true);
 perform verify_workforce_assignment(test_uuid(200+n),'Successful role execution','Checked attendance, credentials and handoff records');
 if n in(4,5,14,15,29,30,59,60) then
 target:=case when n<5 then 1 when n<15 then 2 when n<30 then 3 when n<60 then 4 else 5 end;
 perform test_assert((workforce_recognition_private.badges(test_uuid(5))->0->>'level')::int=target,'Level boundary '||n);
 end if;
 end loop;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',test_uuid(5)::text,true);
select test_assert((select count(*)=10 from workforce_advancement_history),'Five role and family advancements');
select test_denied($q$select revoke_workforce_credit((select id from workforce_role_credits limit 1),'False evidence found')$q$,'42501');
select set_config('request.jwt.claim.sub',test_uuid(2)::text,true);
select test_denied($q$select revoke_workforce_credit((select id from workforce_role_credits where assignment_id=test_uuid(201)),'False evidence found')$q$,'P0002');
reset role;
-- Provenance not visible across employer scopes; known credit UUID still cannot be revoked.
do $$declare c uuid;begin select id into c from workforce_role_credits where assignment_id=test_uuid(201);
 perform test_denied(format('select revoke_workforce_credit(%L,''False evidence found'')',c),'42501');end$$;
select set_config('request.jwt.claim.sub',test_uuid(1)::text,true);
select revoke_workforce_credit((select id from workforce_role_credits where assignment_id=test_uuid(201)),'Closeout review found fabricated attendance');
select test_assert((workforce_recognition_private.badges(test_uuid(5))->0->>'level')::int=4,'Revocation demotes live projection');
select test_assert((select count(*)=12 from workforce_advancement_history),'Demotion history preserved');
select verify_workforce_assignment(test_uuid(201),'Excellent role delivery','Signed attendance and closeout');
select test_assert((select count(*)=60 from workforce_role_credits),'Revoked retry cannot restore credit');
update workforce_role_credits set endorsement_expires_at=now()-interval '1 day';
set local role authenticated;
select set_config('request.jwt.claim.sub',test_uuid(5)::text,true);
select test_assert(workforce_recognition_profile(test_uuid(5))->'endorsements'='[]'::jsonb,'Expired endorsements omitted');
select test_assert(jsonb_array_length(workforce_recognition_profile(test_uuid(5))->'badges')=2,'Experience does not expire');
reset role;
select test_assert((select count(*)=74 from workforce_recognition_roles),'All 74 catalog roles seeded');
select test_assert((select count(distinct family)=8 from workforce_recognition_roles),'All eight populated families seeded');
-- Counts alone cannot reach Advanced/Veteran/Expert without employer diversity.
update workforce_role_credits set employer_entity_type='organization',employer_entity_id=test_uuid(11) where user_id=test_uuid(5);
select test_assert((workforce_recognition_private.badges(test_uuid(5))->0->>'level')::int=2,'Single-employer diversity gate');
-- Distinct roles within a family/event produce two endorsements but one family unit.
insert into staff_members values(test_uuid(800),test_uuid(6),'organization',test_uuid(11),'active');
insert into events_v2 values(test_uuid(801),'settled',now()-interval '1 day',test_uuid(1),test_uuid(11),null);
insert into events values(test_uuid(801),null,'published');
insert into employment_assignments(id,user_id,employer_entity_type,employer_entity_id,staff_member_id,role_key,role_title,starts_at,ends_at,status,event_id)
 select test_uuid((810+n)::int),test_uuid(6),'organization',test_uuid(11),test_uuid(800),role_key,label,
 now()-interval '2 days',now()-interval '1 day','active',test_uuid(801)
 from (select role_key,label,row_number()over(order by role_key)n from workforce_recognition_roles where family='technical' limit 2)r;
select set_config('request.jwt.claim.sub',test_uuid(1)::text,true);
select verify_workforce_assignment(test_uuid(811),'Excellent role execution','Checked operational closeout');
select verify_workforce_assignment(test_uuid(812),'Excellent role execution','Checked operational closeout');
select test_assert((select (value->>'credits')::int=1 from jsonb_array_elements(workforce_recognition_private.badges(test_uuid(6))) where value->>'badge_key'='family:technical'),'Family context deduplicated across roles');
-- Completion of tour-wide work cannot also credit its individual stops.
insert into tours values(test_uuid(900),'completed',current_date-2,test_uuid(1),test_uuid(11));
insert into events_v2 values(test_uuid(901),'settled',now()-interval '1 day',test_uuid(1),test_uuid(11),null);
insert into events values(test_uuid(901),null,'published');
insert into tour_events values(test_uuid(901),test_uuid(900));
insert into employment_assignments(id,user_id,employer_entity_type,employer_entity_id,staff_member_id,role_key,role_title,starts_at,ends_at,status,tour_id)
 values(test_uuid(902),test_uuid(6),'organization',test_uuid(11),test_uuid(800),'stage-manager','Stage Manager',now()-interval '3 days',now()-interval '2 days','active',test_uuid(900));
insert into employment_assignments(id,user_id,employer_entity_type,employer_entity_id,staff_member_id,role_key,role_title,starts_at,ends_at,status,event_id)
 values(test_uuid(903),test_uuid(6),'organization',test_uuid(11),test_uuid(800),'stage-manager','Stage Manager',now()-interval '3 days',now()-interval '2 days','active',test_uuid(901));
select verify_workforce_assignment(test_uuid(902),'Excellent tour execution','Checked all tour closeout records');
select test_denied($q$select verify_workforce_assignment(test_uuid(903),'Excellent role execution','Checked operational closeout')$q$,'23505');
-- Ended assignment alone does not prove completion of future or cancelled event.
update events_v2 set end_at=now()+interval '1 day' where id=test_uuid(901);
select test_denied($q$select verify_workforce_assignment(test_uuid(903),'Excellent role execution','Checked operational closeout')$q$,'22023');
-- An unrelated employer cannot attach credit to a real completed event.
update events_v2 set end_at=now()-interval '1 day',created_by=test_uuid(4),org_id=test_uuid(14) where id=test_uuid(901);
select test_denied($q$select verify_workforce_assignment(test_uuid(903),'Excellent role execution','Checked operational closeout')$q$,'42501');
set local role anon;
select test_denied($q$select workforce_recognition_profile(test_uuid(5))$q$,'42501');
select test_denied($q$select * from workforce_role_credits$q$,'42501');
reset role;
rollback;
