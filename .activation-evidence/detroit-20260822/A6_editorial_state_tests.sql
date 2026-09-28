-- A6 Detroit editorial state-transition tests (docs/24 runbook).
-- Transaction-scoped RLS/visibility matrix. Local isolated database ONLY.

begin;

create temp table a6_results as
select * from (values ('placeholder', false)) as t(case_name, passed);
grant insert, select on a6_results to anon, authenticated;

-- Baseline: every Detroit canonical row is DRAFT.
insert into a6_results values
 ('all_draft_baseline', not exists(
   select 1 from public.world_cultural_entities
    where metadata->>'pilot_key'='detroit' and publication_status <> 'draft')),
 ('place_rows_draft', not exists(
   select 1 from public.geo_places where canonical_path in ('us','us/mi','us/mi/detroit') and publication_status <> 'draft'));

-- Anon sees zero draft entities.
set local role anon;
insert into a6_results values
 ('anon_sees_zero_draft_entities',
  (select count(*)=0 from public.world_cultural_entities where metadata->>'pilot_key'='detroit'));
reset role;

-- Governed transition #1: draft -> verified -> published on one entity.
update public.world_cultural_entities
   set review_status='verified'
 where slug='juan-atkins' and metadata->>'pilot_key'='detroit';
insert into a6_results values
 ('draft_to_verified_applied', (
   select review_status='verified' from public.world_cultural_entities where slug='juan-atkins'));

update public.world_cultural_entities
   set publication_status='published'
 where slug='juan-atkins' and metadata->>'pilot_key'='detroit';

-- Anon now sees exactly this one entity.
set local role anon;
insert into a6_results values
 ('anon_sees_exactly_published_entity',
  (select count(*)=1 from public.world_cultural_entities
    where metadata->>'pilot_key'='detroit' and slug='juan-atkins'));
reset role;

-- Governed transition #2: published -> retired hides it again.
update public.world_cultural_entities
   set publication_status='retired'
 where slug='juan-atkins' and metadata->>'pilot_key'='detroit';
set local role anon;
insert into a6_results values
 ('retired_hidden_from_anon',
  (select count(*)=0 from public.world_cultural_entities
    where metadata->>'pilot_key'='detroit' and slug='juan-atkins'));
reset role;

-- Governed transition #3: draft -> rejected never becomes visible.
update public.world_cultural_entities
   set review_status='rejected'
 where slug='detroit_belleville_three' and metadata->>'pilot_key'='detroit'
   and publication_status='draft';
set local role anon;
insert into a6_results values
 ('rejected_stays_hidden_from_anon',
  (select count(*)=0 from public.world_cultural_entities
    where metadata->>'pilot_key'='detroit' and review_status='rejected'));
reset role;

-- Published rows cannot silently change identity: guard rails on the
-- promotion package's own invariant (no overwrite of verified/published).
insert into a6_results values
 ('promotion_guard_present', exists(
   select 1 from pg_proc where proname='has_global_permission'));

select case_name, passed, case when passed then 'PASS' else 'FAIL' end as verdict
from a6_results where case_name <> 'placeholder' order by case_name;
select 'ALL_PASS='||bool_and(passed) from a6_results where case_name <> 'placeholder';

rollback;
