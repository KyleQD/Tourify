import { JobPostingBuilder } from "@/components/hiring/job-posting-builder"
import { HiringMissingScope } from "@/components/hiring/hiring-missing-scope"
import { WorkforceHero, WorkforcePageShell } from "@/components/hiring/workforce-ui"
import { resolveAdminWorkforceEmployer } from "@/lib/hiring/resolve-admin-workforce-employer"

interface NewHiringJobPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

async function resolveSearchParams(
  searchParams: NewHiringJobPageProps["searchParams"]
): Promise<Record<string, string | string[] | undefined>> {
  return (await searchParams) ?? {}
}

export default async function NewHiringJobPage({ searchParams }: NewHiringJobPageProps) {
  const resolvedSearchParams = await resolveSearchParams(searchParams)
  const employer = await resolveAdminWorkforceEmployer({ searchParams: resolvedSearchParams })

  if (!employer) {
    return (
      <WorkforcePageShell>
        <HiringMissingScope />
      </WorkforcePageShell>
    )
  }

  return (
    <WorkforcePageShell className="lg:px-10">
      <WorkforceHero
        title="Create Job Posting"
        description={`Create a scoped workforce job for ${employer.displayName}. Applicant intake fields are saved with the posting and onboarding is resolved after approval.`}
        badge={employer.entityType}
      />
      <JobPostingBuilder employer={employer} />
    </WorkforcePageShell>
  )
}
