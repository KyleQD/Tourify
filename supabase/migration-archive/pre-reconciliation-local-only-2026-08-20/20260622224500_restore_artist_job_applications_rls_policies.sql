set client_min_messages = warning;

-- Restore authenticated access on artist_job_applications after lint migration
-- left service_role-only policies on some environments.

select migration_helpers.drop_policy_if_exists(
  'public',
  'artist_job_applications',
  'Users can view applications to their jobs'
);
create policy "Users can view applications to their jobs"
  on public.artist_job_applications
  for select
  to authenticated
  using (
    auth.uid() = applicant_id
    or auth.uid() in (
      select posted_by from public.artist_jobs where id = job_id
    )
  );

select migration_helpers.drop_policy_if_exists(
  'public',
  'artist_job_applications',
  'Users can create applications'
);
create policy "Users can create applications"
  on public.artist_job_applications
  for insert
  to authenticated
  with check (auth.uid() = applicant_id);

select migration_helpers.drop_policy_if_exists(
  'public',
  'artist_job_applications',
  'Users can update their own applications'
);
create policy "Users can update their own applications"
  on public.artist_job_applications
  for update
  to authenticated
  using (auth.uid() = applicant_id);

select migration_helpers.drop_policy_if_exists(
  'public',
  'artist_job_applications',
  'Job posters can update application status'
);
create policy "Job posters can update application status"
  on public.artist_job_applications
  for update
  to authenticated
  using (
    auth.uid() in (
      select posted_by from public.artist_jobs where id = job_id
    )
  );
