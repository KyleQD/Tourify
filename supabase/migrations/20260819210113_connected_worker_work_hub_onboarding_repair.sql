set client_min_messages = warning;

begin;

-- Link pre-existing roster rows to the onboarding candidate produced by their
-- approved application. This preserves both records and lets Work Hub show the
-- actual onboarding progress instead of the staff_members default.
with candidate_matches as (
  select distinct on (member.id)
    member.id as staff_member_id,
    candidate.id as candidate_id,
    candidate.onboarding_progress,
    candidate.compliance_status
  from public.staff_members member
  join public.staff_onboarding_candidates candidate
    on candidate.user_id = member.user_id
   and candidate.employer_entity_type = member.employer_entity_type
   and candidate.employer_entity_id = member.employer_entity_id
  where member.user_id is not null
    and (
      member.onboarding_candidate_id is null
      or coalesce(member.onboarding_progress, 0) < coalesce(candidate.onboarding_progress, 0)
    )
  order by
    member.id,
    candidate.onboarding_progress desc nulls last,
    candidate.updated_at desc nulls last,
    candidate.created_at desc
)
update public.staff_members member
set onboarding_candidate_id = coalesce(member.onboarding_candidate_id, match.candidate_id),
    onboarding_progress = greatest(
      coalesce(member.onboarding_progress, 0),
      coalesce(match.onboarding_progress, 0)
    ),
    compliance_status = case
      when member.compliance_status is null then match.compliance_status
      else member.compliance_status
    end,
    updated_at = now()
from candidate_matches match
where member.id = match.staff_member_id;

commit;
