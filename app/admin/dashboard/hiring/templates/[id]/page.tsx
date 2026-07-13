import { HiringMissingScope } from "@/components/hiring"
import { TemplateBuilderShell } from "@/components/hiring/template-builder/template-builder-shell"
import { WorkforcePageShell } from "@/components/hiring/workforce-ui"
import { resolveAdminWorkforceEmployer } from "@/lib/hiring/resolve-admin-workforce-employer"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function EditHiringTemplatePage({ params, searchParams }: PageProps) {
  const { id } = await params
  const resolvedSearchParams = (await searchParams) ?? {}
  const employer = await resolveAdminWorkforceEmployer({ searchParams: resolvedSearchParams })

  if (!employer) {
    return (
      <WorkforcePageShell>
        <HiringMissingScope />
      </WorkforcePageShell>
    )
  }

  return <TemplateBuilderShell employer={employer} templateId={id} />
}
