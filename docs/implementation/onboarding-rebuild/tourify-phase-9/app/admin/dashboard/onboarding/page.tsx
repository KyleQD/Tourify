import { HiringDashboardShell } from "@/components/hiring/hiring-dashboard-shell"
import { OnboardingKanban } from "@/components/hiring/onboarding-kanban"
import { resolveEmployerFromSearchParams } from "@/lib/hiring/employer-search-params"

interface AdminOnboardingPageProps {
  searchParams: Record<string, string | string[] | undefined>
}

export default function AdminOnboardingPage({ searchParams }: AdminOnboardingPageProps) {
  const employer = resolveEmployerFromSearchParams(searchParams)

  return (
    <HiringDashboardShell employer={employer} title="Onboarding Pipeline" description="Track candidates from invitation to Work Mode readiness.">
      {employer ? <OnboardingKanban employer={employer} /> : null}
    </HiringDashboardShell>
  )
}
