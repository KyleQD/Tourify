import Link from "next/link"
import { notFound } from "next/navigation"

import { JobPostingBuilder } from "@/components/hiring/job-posting-builder"
import { JobPostingLifecycleActions } from "@/components/hiring/job-posting-lifecycle-actions"
import { HiringMissingScope } from "@/components/hiring/hiring-missing-scope"
import { WorkforceHero, WorkforcePageShell, WorkforcePanel } from "@/components/hiring/workforce-ui"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  const status = typeof data.status === "string" ? data.status : "draft"
  let hasVacancy = false
  if (status === "filled") {
    const { data: candidateRows } = await supabase
      .from("staff_onboarding_candidates")
      .select("id")
      .eq("job_posting_id", id)
      .eq("employer_entity_type", employer.entityType)
      .eq("employer_entity_id", employer.entityId)
    const candidateIds = (candidateRows ?? []).map((candidate) => candidate.id)
    const activeHires = candidateIds.length
      ? await supabase
          .from("staff_members")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .eq("employer_entity_type", employer.entityType)
          .eq("employer_entity_id", employer.entityId)
          .in("onboarding_candidate_id", candidateIds)
      : { count: 0 }
    hasVacancy = (activeHires.count ?? 0) < (typeof data.number_of_positions === "number" ? data.number_of_positions : 1)
  }
  const [applicationsResult, approvedResult, activityResult] = status === "archived"
    ? await Promise.all([
        supabase
          .from("job_applications")
          .select("id, applicant_name, applicant_email, status, applied_at", { count: "exact" })
          .eq("job_posting_id", id)
          .eq("employer_entity_type", employer.entityType)
          .eq("employer_entity_id", employer.entityId)
          .order("applied_at", { ascending: false })
          .limit(20),
        supabase
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .eq("job_posting_id", id)
          .eq("employer_entity_type", employer.entityType)
          .eq("employer_entity_id", employer.entityId)
          .in("status", ["approved", "accepted"]),
        supabase
          .from("hiring_audit_events")
          .select("id, event_type, action, title, content, created_at", { count: "exact" })
          .eq("job_id", id)
          .eq("employer_entity_type", employer.entityType)
          .eq("employer_entity_id", employer.entityId)
          .order("created_at", { ascending: false })
          .limit(20),
      ])
    : [{ data: [], count: 0 }, { data: [], count: 0 }, { data: [], count: 0 }]
  const applications = applicationsResult.data
  const activity = activityResult.data

  return (
    <WorkforcePageShell className="lg:px-10">
      <WorkforceHero
        title="Manage Job Posting"
        description={`Edit, publish, close, or archive this scoped Workforce job posting for ${employer.displayName}.`}
        badge={employer.entityType}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="border-slate-600 text-slate-200">
              <Link href={`/admin/dashboard/applications?job_id=${id}&${queryString}`}>View applications</Link>
            </Button>
            <JobPostingLifecycleActions
              jobId={id}
              title={typeof data.title === "string" ? data.title : "Job posting"}
              status={status}
              queryString={queryString}
              hasVacancy={hasVacancy}
            />
          </div>
        }
      />
      {status === "archived" ? (
        <div className="space-y-6">
          <WorkforcePanel>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-white">Archived posting history</CardTitle>
                <Badge variant="outline">Archived</Badge>
              </div>
              <CardDescription>This posting is read-only. Restore it to retain this applicant pool, or repost it as a separate empty draft.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><p className="text-2xl font-semibold text-white">{applicationsResult.count ?? 0}</p><p className="text-sm text-slate-400">Total applicants</p></div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><p className="text-2xl font-semibold text-white">{approvedResult.count ?? 0}</p><p className="text-sm text-slate-400">Approved applicants</p></div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><p className="text-2xl font-semibold text-white">{activityResult.count ?? 0}</p><p className="text-sm text-slate-400">Activity records</p></div>
            </CardContent>
          </WorkforcePanel>

          <div className="grid gap-6 xl:grid-cols-2">
            <WorkforcePanel>
              <CardHeader><CardTitle className="text-white">Applicant pool</CardTitle><CardDescription>The original candidates remain available if a hire drops out.</CardDescription></CardHeader>
              <CardContent className="space-y-2">
                {applications?.length ? applications.map((application) => (
                  <Link key={application.id} href={`/admin/dashboard/applications/${application.id}?${queryString}`} className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-cyan-400/30">
                    <div className="flex items-center justify-between gap-3"><div><p className="font-medium text-white">{application.applicant_name ?? application.applicant_email ?? "Applicant"}</p><p className="text-xs text-slate-500">{application.applied_at ? new Date(application.applied_at).toLocaleDateString() : "Date unavailable"}</p></div><Badge variant="outline">{application.status}</Badge></div>
                  </Link>
                )) : <p className="text-sm text-slate-400">No applicants were recorded for this posting.</p>}
              </CardContent>
            </WorkforcePanel>
            <WorkforcePanel>
              <CardHeader><CardTitle className="text-white">Posting activity</CardTitle><CardDescription>Preserved changes and hiring decisions for this role.</CardDescription></CardHeader>
              <CardContent className="space-y-2">
                {activity?.length ? activity.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><p className="font-medium text-white">{item.title ?? item.event_type ?? item.action ?? "Hiring activity"}</p><p className="text-sm text-slate-400">{item.content ?? "A hiring activity was recorded."}</p><p className="mt-1 text-xs text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleString() : "Date unavailable"}</p></div>
                )) : <p className="text-sm text-slate-400">No activity has been recorded for this posting.</p>}
              </CardContent>
            </WorkforcePanel>
          </div>
        </div>
      ) : (
        <JobPostingBuilder
          employer={employer}
          initialData={toJobPostingFormValues(data as Record<string, unknown>)}
          mode="edit"
          submitEndpoint={`/api/hiring/job-postings/${id}?${queryString}`}
        />
      )}
    </WorkforcePageShell>
  )
}
