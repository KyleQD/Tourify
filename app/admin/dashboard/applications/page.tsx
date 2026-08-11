import { ApplicationReviewPanel } from "@/components/hiring/application-review-panel"
import { HiringMissingScope } from "@/components/hiring/hiring-missing-scope"
import { WorkforcePageShell } from "@/components/hiring/workforce-ui"
import { resolveAdminWorkforceEmployer } from "@/lib/hiring/resolve-admin-workforce-employer"

interface AdminDashboardApplicationsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminDashboardApplicationsPage({ searchParams }: AdminDashboardApplicationsPageProps) {
  const resolvedSearchParams = await searchParams
  const employer = await resolveAdminWorkforceEmployer({ searchParams: resolvedSearchParams })

  if (!employer) {
    return (
      <WorkforcePageShell>
        <HiringMissingScope title="Choose a hiring account" />
      </WorkforcePageShell>
    )
  }

  return (
    <WorkforcePageShell>
      <ApplicationReviewPanel employer={employer} />
    </WorkforcePageShell>
  )
}
