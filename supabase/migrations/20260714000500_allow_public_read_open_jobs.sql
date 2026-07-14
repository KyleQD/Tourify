do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'artist_jobs'
      and policyname = 'public_read_open_artist_jobs'
  ) then
    create policy public_read_open_artist_jobs
      on public.artist_jobs
      for select
      to public
      using (status = 'open');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'job_posting_templates'
      and policyname = 'public_read_published_job_posting_templates'
  ) then
    create policy public_read_published_job_posting_templates
      on public.job_posting_templates
      for select
      to public
      using (status = 'published');
  end if;
end $$;
