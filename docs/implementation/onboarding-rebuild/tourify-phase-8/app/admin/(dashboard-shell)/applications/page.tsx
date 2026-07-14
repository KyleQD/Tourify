import { ApplicationReviewPanel } from "@/components/hiring/application-review-panel"
import { HiringMissingScope } from "@/components/hiring/hiring-missing-scope"
import { parseEmployerFromSearchParams } from "@/lib/hiring/employer-search-params"

interface ApplicationsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const resolvedSearchParams = await searchParams
  const employer = parseEmployerFromSearchParams(resolvedSearchParams)

  if (!employer) {
    return <HiringMissingScope title="Choose a hiring account" />
  }

  const initialStatus = typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : "all"
  const initialJobId = typeof resolvedSearchParams.job_id === "string" ? resolvedSearchParams.job_id : undefined

  return (
    <ApplicationReviewPanel
      employer={employer}
      initialStatus={initialStatus as never}
      initialJobId={initialJobId}
    />
  )
}
