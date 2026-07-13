import { HiringDashboardShell } from "@/components/hiring/hiring-dashboard-shell"
import { OnboardingKanban } from "@/components/hiring/onboarding-kanban"
import { resolveEmployerFromSearchParams } from "@/lib/hiring/employer-search-params"

interface AdminCandidatesPageProps {
  searchParams: Record<string, string | string[] | undefined>
}

export default function AdminCandidatesPage({ searchParams }: AdminCandidatesPageProps) {
  const employer = resolveEmployerFromSearchParams(searchParams)

  return (
    <HiringDashboardShell employer={employer} title="Candidates" description="Review onboarding progress, documents, invitations, and candidate workflow state.">
      {employer ? <OnboardingKanban employer={employer} /> : null}
    </HiringDashboardShell>
  )
}
