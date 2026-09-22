set client_min_messages = warning;

-- The original admin_staffing_core migration defined job_applications.status with a
-- narrow CHECK ('pending','in_review','accepted','rejected').  Application-layer code
-- writes the full set used by the hiring pipeline:
--   pending → reviewed → shortlisted → approved → rejected / withdrawn
-- Drop the old constraint and replace it with the canonical set so that every
-- application-layer status transition can actually persist.

do $fix_check$
begin
  -- Drop any existing CHECK constraint on job_applications.status
  if to_regclass('public.job_applications') is not null then
    declare
      r record;
    begin
      for r in
        select conname
          from pg_constraint
         where conrelid = 'public.job_applications'::regclass
           and contype = 'c'
           and pg_get_constraintdef(oid) ilike '%status%'
      loop
        execute format('alter table public.job_applications drop constraint if exists %I', r.conname);
      end loop;
    end;

    -- Add the canonical constraint matching the hiring-pipeline TypeScript enum
    alter table public.job_applications
      add constraint job_applications_status_check
      check (status in ('pending','reviewed','shortlisted','approved','accepted','rejected','withdrawn'));
  end if;
end $fix_check$;
