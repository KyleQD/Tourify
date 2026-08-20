-- Tourify Staff Operations P0 baseline integrity counts
-- Read-only against application data. Uses only temp tables for result capture.
-- Do not run with db reset.

create temp table if not exists staff_ops_integrity_results (
  check_name text not null,
  bucket text,
  row_count bigint,
  status text not null,
  details text
) on commit drop;

truncate table staff_ops_integrity_results;

do $$
declare
  target text;
  targets text[] := array[
    'job_applications',
    'staff_onboarding_candidates',
    'staff_members',
    'employment_assignments',
    'staff_shifts',
    'staff_shift_assignments',
    'work_mode_publications',
    'attendance_entries',
    'staff_documents',
    'staff_invitations'
  ];
begin
  foreach target in array targets loop
    insert into staff_ops_integrity_results(check_name, bucket, row_count, status, details)
    values (
      'table_exists',
      target,
      null,
      case when to_regclass('public.' || target) is null then 'missing' else 'ok' end,
      'public.' || target
    );
  end loop;
end $$;

do $$
declare
  item record;
  result_count bigint;
begin
  for item in
    select *
    from (
      values
        (
          'job_applications_missing_employer_scope',
          'select count(*) from public.job_applications where employer_entity_type is null or employer_entity_id is null'
        ),
        (
          'staff_onboarding_candidates_missing_employer_scope',
          'select count(*) from public.staff_onboarding_candidates where employer_entity_type is null or employer_entity_id is null'
        ),
        (
          'staff_members_missing_employer_scope',
          'select count(*) from public.staff_members where employer_entity_type is null or employer_entity_id is null'
        ),
        (
          'employment_assignments_missing_employer_scope',
          'select count(*) from public.employment_assignments where employer_entity_type is null or employer_entity_id is null'
        ),
        (
          'approved_applications_without_candidate',
          'select count(*) from public.job_applications applications left join public.staff_onboarding_candidates candidates on candidates.job_application_id = applications.id where applications.status = ''approved'' and candidates.id is null'
        ),
        (
          'staff_members_without_employment_assignment',
          'select count(*) from public.staff_members staff left join public.employment_assignments assignments on assignments.staff_member_id = staff.id where staff.status in (''pending'', ''active'', ''suspended'') and assignments.id is null'
        ),
        (
          'employment_assignments_without_staff_member',
          'select count(*) from public.employment_assignments assignments left join public.staff_members staff on staff.id = assignments.staff_member_id where assignments.staff_member_id is not null and staff.id is null'
        ),
        (
          'cross_employer_staff_employment_links',
          'select count(*) from public.employment_assignments assignments join public.staff_members staff on staff.id = assignments.staff_member_id where assignments.employer_entity_type is distinct from staff.employer_entity_type or assignments.employer_entity_id is distinct from staff.employer_entity_id'
        ),
        (
          'staff_shifts_without_staff_member',
          'select count(*) from public.staff_shifts shifts left join public.staff_members staff on staff.id = shifts.staff_member_id where shifts.staff_member_id is not null and staff.id is null'
        ),
        (
          'future_non_cancelled_shifts_for_inactive_staff',
          'select count(*) from public.staff_shifts shifts join public.staff_members staff on staff.id = shifts.staff_member_id where shifts.shift_date >= current_date and coalesce(shifts.status, '''') not in (''cancelled'', ''canceled'') and coalesce(staff.status, '''') not in (''active'', ''pending'')'
        )
    ) as checks(check_name, sql_text)
  loop
    begin
      execute item.sql_text into result_count;
      insert into staff_ops_integrity_results(check_name, bucket, row_count, status, details)
      values (item.check_name, 'all', result_count, 'ok', null);
    exception when others then
      insert into staff_ops_integrity_results(check_name, bucket, row_count, status, details)
      values (item.check_name, 'all', null, 'skipped', sqlerrm);
    end;
  end loop;
end $$;

do $$
declare
  item record;
begin
  for item in
    select *
    from (
      values
        (
          'work_mode_publications_by_status',
          'select coalesce(status, ''unknown'') as bucket, count(*) as row_count from public.work_mode_publications group by coalesce(status, ''unknown'')'
        ),
        (
          'staff_documents_by_status',
          'select coalesce(status, ''unknown'') as bucket, count(*) as row_count from public.staff_documents group by coalesce(status, ''unknown'')'
        )
    ) as grouped_checks(check_name, sql_text)
  loop
    begin
      execute format(
        'insert into staff_ops_integrity_results(check_name, bucket, row_count, status, details) select %L, bucket, row_count, %L, null from (%s) grouped',
        item.check_name,
        'ok',
        item.sql_text
      );
    exception when others then
      insert into staff_ops_integrity_results(check_name, bucket, row_count, status, details)
      values (item.check_name, 'all', null, 'skipped', sqlerrm);
    end;
  end loop;
end $$;

select check_name, bucket, row_count, status, details
from staff_ops_integrity_results
order by check_name, bucket;
