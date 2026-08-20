-- Link employment assignments to tours so hire→roster tour filters and ops
-- pickers can resolve crew by tour without requiring an event_id.

set client_min_messages = warning;

begin;

alter table if exists public.employment_assignments
  add column if not exists tour_id uuid;

do $$
begin
  if to_regclass('public.tours') is not null
     and to_regclass('public.employment_assignments') is not null
     and not exists (
       select 1
       from information_schema.table_constraints
       where table_schema = 'public'
         and table_name = 'employment_assignments'
         and constraint_name = 'employment_assignments_tour_id_fkey'
     ) then
    alter table public.employment_assignments
      add constraint employment_assignments_tour_id_fkey
      foreign key (tour_id)
      references public.tours(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_employment_assignments_tour
  on public.employment_assignments (tour_id)
  where tour_id is not null;

create index if not exists idx_employment_assignments_employer_tour
  on public.employment_assignments (employer_entity_type, employer_entity_id, tour_id)
  where tour_id is not null;

commit;
