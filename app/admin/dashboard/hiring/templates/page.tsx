import { HiringMissingScope } from "@/components/hiring"
import { TemplateLibrary } from "@/components/hiring/template-library"
import { WorkforcePageShell } from "@/components/hiring/workforce-ui"
import { resolveAdminWorkforceEmployer } from "@/lib/hiring/resolve-admin-workforce-employer"

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function HiringTemplatesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const employer = await resolveAdminWorkforceEmployer({ searchParams: resolvedSearchParams })

  if (!employer) {
    return (
      <WorkforcePageShell>
        <HiringMissingScope />
      </WorkforcePageShell>
    )
  }

  return (
    <WorkforcePageShell>
      <TemplateLibrary employer={employer} />
    </WorkforcePageShell>
  )
}
