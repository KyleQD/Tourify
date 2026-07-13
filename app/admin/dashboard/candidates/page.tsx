import { OnboardingKanban } from "@/components/hiring/onboarding-kanban"
import { HiringMissingScope } from "@/components/hiring"
import { WorkforceHero, WorkforcePageShell } from "@/components/hiring/workforce-ui"
import { resolveAdminWorkforceEmployer } from "@/lib/hiring/resolve-admin-workforce-employer"

interface AdminCandidatesPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminCandidatesPage({ searchParams }: AdminCandidatesPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const employer = await resolveAdminWorkforceEmployer({ searchParams: resolvedSearchParams })
  const candidateIdParam = resolvedSearchParams.candidateId
  const initialCandidateId = Array.isArray(candidateIdParam) ? candidateIdParam[0] : candidateIdParam ?? null

  if (!employer) {
    return (
      <WorkforcePageShell>
        <HiringMissingScope />
      </WorkforcePageShell>
    )
  }

  return (
    <WorkforcePageShell>
      <WorkforceHero
        title="Candidate Pipeline"
        description={`Track onboarding progress, compliance review, and document readiness for ${employer.displayName}.`}
        badge={employer.entityType}
      />
      <OnboardingKanban employer={employer} initialCandidateId={initialCandidateId} />
    </WorkforcePageShell>
  )
}
