set client_min_messages = warning;

-- artist_job_categories is public reference data for job posting filters and forms.
-- RLS lint migration added service_role-only access; restore read for app clients.

select migration_helpers.drop_policy_if_exists(
  'public',
  'artist_job_categories',
  'Anyone can view job categories'
);

create policy "Anyone can view job categories"
  on public.artist_job_categories
  for select
  to anon, authenticated
  using (is_active = true);
