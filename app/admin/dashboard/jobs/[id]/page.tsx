import Link from "next/link"
import { notFound } from "next/navigation"

import { JobPostingBuilder } from "@/components/hiring/job-posting-builder"
import { HiringMissingScope } from "@/components/hiring/hiring-missing-scope"
import { WorkforceHero, WorkforcePageShell } from "@/components/hiring/workforce-ui"
import { Button } from "@/components/ui/button"
import { resolveAdminWorkforceEmployer } from "@/lib/hiring/resolve-admin-workforce-employer"
import { getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import type { JobPostingFormValues } from "@/types/job-posting-builder"

interface ManageHiringJobPageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function toJobPostingFormValues(row: Record<string, unknown>): Partial<JobPostingFormValues> {
  const applicationFormTemplate = row.application_form_template

  return {
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "",
    description: typeof row.description === "string" ? row.description : "",
    department: typeof row.department === "string" ? row.department : "",
    position: typeof row.position === "string" ? row.position : "",
    employment_type: typeof row.employment_type === "string" ? row.employment_type as JobPostingFormValues["employment_type"] : "contractor",
    location: typeof row.location === "string" ? row.location : "",
    role_type: typeof row.role_type === "string" ? row.role_type : "",
    number_of_positions: typeof row.number_of_positions === "number" ? row.number_of_positions : 1,
    salary_range: typeof row.salary_range === "object" ? row.salary_range as JobPostingFormValues["salary_range"] : null,
    requirements: toStringArray(row.requirements),
    responsibilities: toStringArray(row.responsibilities),
    benefits: toStringArray(row.benefits),
    skills: toStringArray(row.skills),
    experience_level: typeof row.experience_level === "string" ? row.experience_level as JobPostingFormValues["experience_level"] : "any",
    remote: Boolean(row.remote),
    urgent: Boolean(row.urgent),
    required_certifications: toStringArray(row.required_certifications),
    application_form_template:
      applicationFormTemplate && typeof applicationFormTemplate === "object"
        ? applicationFormTemplate as JobPostingFormValues["application_form_template"]
        : undefined,
    onboarding_template_id: typeof row.onboarding_template_id === "string" ? row.onboarding_template_id : null,
    event_id: typeof row.event_id === "string" ? row.event_id : null,
    tour_id: typeof row.tour_id === "string" ? row.tour_id : null,
    event_date: typeof row.event_date === "string" ? row.event_date : null,
    status: typeof row.status === "string" ? row.status as JobPostingFormValues["status"] : "draft",
  }
}

export default async function ManageHiringJobPage({ params, searchParams }: ManageHiringJobPageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams ?? Promise.resolve({})])
  const employer = await resolveAdminWorkforceEmployer({ searchParams: resolvedSearchParams })

  if (!employer) {
    return (
      <WorkforcePageShell>
        <HiringMissingScope />
      </WorkforcePageShell>
    )
  }

  const supabase = createHiringServiceClient()
  const { data, error } = await supabase
    .from("job_posting_templates")
    .select("*")
    .eq("id", id)
    .eq("employer_entity_type", employer.entityType)
    .eq("employer_entity_id", employer.entityId)
    .maybeSingle()

  if (error || !data) notFound()

  const queryString = getEmployerQueryString(employer)

  return (
    <WorkforcePageShell className="lg:px-10">
      <WorkforceHero
        title="Manage Job Posting"
        description={`Edit, publish, close, or archive this scoped Workforce job posting for ${employer.displayName}.`}
        badge={employer.entityType}
        actions={
          <Button asChild variant="outline" size="sm" className="border-slate-600 text-slate-200">
            <Link href={`/admin/dashboard/applications?job_id=${id}&${queryString}`}>
              View applications
            </Link>
          </Button>
        }
      />
      <JobPostingBuilder
        employer={employer}
        initialData={toJobPostingFormValues(data as Record<string, unknown>)}
        mode="edit"
        submitEndpoint={`/api/hiring/job-postings/${id}?${queryString}`}
      />
    </WorkforcePageShell>
  )
}
