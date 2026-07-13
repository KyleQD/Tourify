import { ApplicationReviewPanel } from "@/components/hiring/application-review-panel"
import { HiringMissingScope } from "@/components/hiring/hiring-missing-scope"
import { parseEmployerFromSearchParams } from "@/lib/hiring/employer-search-params"

interface AdminDashboardApplicationsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminDashboardApplicationsPage({ searchParams }: AdminDashboardApplicationsPageProps) {
  const resolvedSearchParams = await searchParams
  const employer = parseEmployerFromSearchParams(resolvedSearchParams)

  if (!employer) {
    return <HiringMissingScope title="Choose a hiring account" />
  }

  return <ApplicationReviewPanel employer={employer} />
}
