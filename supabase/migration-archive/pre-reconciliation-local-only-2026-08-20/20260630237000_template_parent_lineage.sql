-- Track clone lineage for onboarding templates so employer-scoped copies can point back
-- to the global or employer template they were derived from.
--
-- Safety: additive only.

set client_min_messages = warning;

do $template_parent_lineage$
begin
  if to_regclass('public.staff_onboarding_templates') is null then
    return;
  end if;

  alter table public.staff_onboarding_templates
    add column if not exists parent_template_id uuid;

  if not exists (
    select 1
    from information_schema.key_column_usage kcu
    join information_schema.table_constraints tc
      on tc.constraint_name = kcu.constraint_name
     and tc.constraint_schema = kcu.constraint_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and kcu.table_schema = 'public'
      and kcu.table_name = 'staff_onboarding_templates'
      and kcu.column_name = 'parent_template_id'
  )
  then
    alter table public.staff_onboarding_templates
      add constraint staff_onboarding_templates_parent_template_id_fkey
      foreign key (parent_template_id)
      references public.staff_onboarding_templates(id) on delete set null;
  end if;
end $template_parent_lineage$;

create index if not exists idx_staff_onboarding_templates_parent
  on public.staff_onboarding_templates(parent_template_id);
