-- Allow admins to request onboarding revisions after worker submit.
-- Workers with status needs_revision can reopen the invite and resubmit.

begin;

alter table public.staff_onboarding_candidates
  drop constraint if exists staff_onboarding_candidates_status_check;

alter table public.staff_onboarding_candidates
  add constraint staff_onboarding_candidates_status_check
  check (status in (
    'pending',
    'in_progress',
    'submitted',
    'needs_revision',
    'completed',
    'rejected',
    'approved'
  ));

commit;
