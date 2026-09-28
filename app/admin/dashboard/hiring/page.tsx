import { HiringDashboard, HiringMissingScope } from "@/components/hiring"
import { WorkforcePageShell } from "@/components/hiring/workforce-ui"
import { resolveAdminWorkforceEmployer } from "@/lib/hiring/resolve-admin-workforce-employer"
import type { HiringDashboardTab } from "@/types/hiring-dashboard"

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const VALID_TABS: HiringDashboardTab[] = [
  "overview",
  "jobs",
  "applications",
  "onboarding",
  "roster",
  "templates",
  "audit",
]

function resolveInitialTab(value: string | string[] | undefined): HiringDashboardTab {
  const tab = Array.isArray(value) ? value[0] : value
  if (tab && (VALID_TABS as string[]).includes(tab)) return tab as HiringDashboardTab
  return "overview"
}

function resolveFirstString(value: string | string[] | undefined): string | null {
  const resolved = Array.isArray(value) ? value[0] : value
  return resolved?.trim() || null
}

export default async function UniversalHiringDashboardPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const employer = await resolveAdminWorkforceEmployer({ searchParams: resolvedSearchParams })
  const initialTab = resolveInitialTab(resolvedSearchParams.tab)
  const initialCandidateId = resolveFirstString(resolvedSearchParams.candidateId)
  const initialMemberId = resolveFirstString(resolvedSearchParams.memberId)

  if (!employer) {
    return (
      <WorkforcePageShell>
        <HiringMissingScope />
      </WorkforcePageShell>
    )
  }

  return (
    <WorkforcePageShell>
      <HiringDashboard
        employer={employer}
        initialTab={initialTab}
        initialCandidateId={initialCandidateId}
        initialMemberId={initialMemberId}
      />
    </WorkforcePageShell>
  )
}
