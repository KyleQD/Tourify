-- Allow worker-submitted onboarding to land in admin review before final approval.
-- Previously status check omitted 'submitted', which caused complete POSTs to fail with 500.

begin;

alter table public.staff_onboarding_candidates
  drop constraint if exists staff_onboarding_candidates_status_check;

alter table public.staff_onboarding_candidates
  add constraint staff_onboarding_candidates_status_check
  check (status in ('pending', 'in_progress', 'submitted', 'completed', 'rejected', 'approved'));

-- Ensure review stage remains valid (already present on Demo, keep idempotent).
alter table public.staff_onboarding_candidates
  drop constraint if exists staff_onboarding_candidates_stage_check;

alter table public.staff_onboarding_candidates
  add constraint staff_onboarding_candidates_stage_check
  check (stage in ('invitation', 'onboarding', 'documents', 'review', 'approved', 'rejected'));

commit;
