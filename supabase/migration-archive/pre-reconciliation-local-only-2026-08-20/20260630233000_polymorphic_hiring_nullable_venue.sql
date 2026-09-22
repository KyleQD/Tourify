set client_min_messages = warning;

-- Organization and artist employers do not have a venue_id. The approval pipeline
-- creates onboarding candidates, workflows, and staff members scoped by
-- employer_entity_type/employer_entity_id, so venue_id must be optional for the
-- polymorphic hiring flow to succeed (mirrors the earlier job_applications fix).
--
-- Safety: additive/loosening only. Does not drop, rename, or reset data.

do $polymorphic_hiring_nullable_venue$
begin
  if to_regclass('public.staff_onboarding_candidates') is not null then
    alter table public.staff_onboarding_candidates alter column venue_id drop not null;
  end if;

  if to_regclass('public.onboarding_workflows') is not null then
    alter table public.onboarding_workflows alter column venue_id drop not null;
  end if;

  if to_regclass('public.staff_members') is not null then
    alter table public.staff_members alter column venue_id drop not null;
  end if;
end $polymorphic_hiring_nullable_venue$;
