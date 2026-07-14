import { JobPostingBuilder } from "@/components/hiring/job-posting-builder"
import { HiringMissingScope } from "@/components/hiring/hiring-missing-scope"
import { buildEmployerFromSearchParams } from "@/lib/hiring/employer-search-params"

interface NewHiringJobPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}

async function resolveSearchParams(
  searchParams: NewHiringJobPageProps["searchParams"]
): Promise<Record<string, string | string[] | undefined>> {
  return await Promise.resolve(searchParams)
}

export default async function NewHiringJobPage({ searchParams }: NewHiringJobPageProps) {
  const resolvedSearchParams = await resolveSearchParams(searchParams)
  const employer = buildEmployerFromSearchParams({ searchParams: resolvedSearchParams })

  if (!employer) {
    return <HiringMissingScope />
  }

  return (
    <main className="container mx-auto max-w-5xl space-y-6 p-4 py-8">
      <div>
        <p className="text-sm text-muted-foreground">Universal Hiring</p>
        <h1 className="text-3xl font-bold tracking-tight">Create job posting</h1>
        <p className="mt-2 text-muted-foreground">
          Create a real job posting for this hiring account. Applicant intake fields are saved with the posting and
          onboarding is resolved after approval.
        </p>
      </div>
      <JobPostingBuilder employer={employer} />
    </main>
  )
}
