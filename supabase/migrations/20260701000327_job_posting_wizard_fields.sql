alter table public.job_posting_templates add column if not exists number_of_positions integer default 1, add column if not exists onboarding_template_id uuid, add column if not exists tour_id uuid;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='job_posting_templates' and column_name='venue_id') then
    alter table public.job_posting_templates alter column venue_id drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='job_posting_templates' and column_name='department') then
    alter table public.job_posting_templates alter column department drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='job_posting_templates' and column_name='position') then
    alter table public.job_posting_templates alter column position drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='job_posting_templates' and column_name='location') then
    alter table public.job_posting_templates alter column location drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='job_posting_templates' and column_name='experience_level') then
    alter table public.job_posting_templates alter column experience_level drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='job_posting_templates' and column_name='employment_type') then
    alter table public.job_posting_templates alter column employment_type drop not null;
  end if;
end $$;

create index if not exists idx_job_posting_templates_event on public.job_posting_templates (event_id);
create index if not exists idx_job_posting_templates_tour on public.job_posting_templates (tour_id);;
