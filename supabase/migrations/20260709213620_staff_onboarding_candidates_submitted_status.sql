alter table public.staff_onboarding_candidates
  drop constraint if exists staff_onboarding_candidates_status_check;

alter table public.staff_onboarding_candidates
  add constraint staff_onboarding_candidates_status_check
  check (status in ('pending', 'in_progress', 'submitted', 'completed', 'rejected', 'approved'));

alter table public.staff_onboarding_candidates
  drop constraint if exists staff_onboarding_candidates_stage_check;

alter table public.staff_onboarding_candidates
  add constraint staff_onboarding_candidates_stage_check
  check (stage in ('invitation', 'onboarding', 'documents', 'review', 'approved', 'rejected'));;
