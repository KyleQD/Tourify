set client_min_messages = warning;

-- Restore authenticated/anon read + authenticated write on artist_jobs.
-- Lint migration 20260414223233 added service_role-only policies; original app policies
-- may be missing on some environments, blocking job posting via user-scoped clients.

select migration_helpers.drop_policy_if_exists(
  'public',
  'artist_jobs',
  'Anyone can view open jobs'
);
create policy "Anyone can view open jobs"
  on public.artist_jobs
  for select
  to anon, authenticated
  using (status = 'open');

select migration_helpers.drop_policy_if_exists(
  'public',
  'artist_jobs',
  'Users can view their own jobs'
);
create policy "Users can view their own jobs"
  on public.artist_jobs
  for select
  to authenticated
  using (auth.uid() = posted_by);

select migration_helpers.drop_policy_if_exists(
  'public',
  'artist_jobs',
  'Authenticated users can create jobs'
);
create policy "Authenticated users can create jobs"
  on public.artist_jobs
  for insert
  to authenticated
  with check (auth.uid() = posted_by);

select migration_helpers.drop_policy_if_exists(
  'public',
  'artist_jobs',
  'Users can update their own jobs'
);
create policy "Users can update their own jobs"
  on public.artist_jobs
  for update
  to authenticated
  using (auth.uid() = posted_by);

select migration_helpers.drop_policy_if_exists(
  'public',
  'artist_jobs',
  'Users can delete their own jobs'
);
create policy "Users can delete their own jobs"
  on public.artist_jobs
  for delete
  to authenticated
  using (auth.uid() = posted_by);
