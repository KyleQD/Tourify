import Link from "next/link"
import { ApplicationReviewPanel } from "@/components/hiring/application-review-panel"
import { HiringMissingScope } from "@/components/hiring/hiring-missing-scope"
import { WorkforceHero, WorkforcePageShell } from "@/components/hiring/workforce-ui"
import { Button } from "@/components/ui/button"
import { getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import { resolveAdminWorkforceEmployer } from "@/lib/hiring/resolve-admin-workforce-employer"

interface AdminApplicationDetailPageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminApplicationDetailPage({ params, searchParams }: AdminApplicationDetailPageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams ?? Promise.resolve({})])
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
      <WorkforceHero
        title="Review Application"
        description={`Application ${id} is loaded in the scoped review workspace for ${employer.displayName}. Open the candidate drawer to inspect details and record a decision.`}
        badge={employer.entityType}
        actions={
          <Button asChild variant="outline" size="sm" className="border-slate-600 text-slate-200">
            <Link href={`/admin/dashboard/candidates?${getEmployerQueryString(employer)}`}>
              Open candidates
            </Link>
          </Button>
        }
      />
      <ApplicationReviewPanel employer={employer} initialApplicationId={id} />
    </WorkforcePageShell>
  )
}
