set client_min_messages = warning;

-- Enforce max 6 top skills on profiles

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_profiles_top_skills_len'
  ) then
    alter table profiles
      add constraint chk_profiles_top_skills_len
      check (top_skills is null or coalesce(cardinality(top_skills), 0) <= 6);
  end if;
end$$;


