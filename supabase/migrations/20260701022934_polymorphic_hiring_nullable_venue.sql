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
end $polymorphic_hiring_nullable_venue$;;
