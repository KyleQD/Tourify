"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, MoreHorizontal, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ApplicationApplicantSummary } from "@/components/hiring/application-applicant-summary"
import { ApplicationDetailDrawer } from "@/components/hiring/application-detail-drawer"
import { ApplicationInsightsBadges } from "@/components/hiring/application-insights-badges"
import { ApplicationJobSummary } from "@/components/hiring/application-job-summary"
import { ApplicationReviewActions } from "@/components/hiring/application-review-actions"
import { ApplicationReviewEmptyState } from "@/components/hiring/application-review-empty-state"
import { ApplicationReviewFilters } from "@/components/hiring/application-review-filters"
import { BulkApplicationActions } from "@/components/hiring/bulk-application-actions"
import { buildHiringApplicationsQueryString } from "@/lib/hiring/application-review-schema"
import { cn } from "@/lib/utils"
import type {
  HiringApplicationDecisionPayload,
  HiringApplicationListResponse,
  HiringApplicationReviewAction,
  HiringApplicationReviewFilters,
  HiringApplicationReviewItem,
  HiringApplicationReviewPanelProps,
} from "@/types/hiring-application-review"

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "Unexpected application review error"
}

function normalizeApplications(data: HiringApplicationListResponse): HiringApplicationReviewItem[] {
  return data.applications || data.data || []
}

export function ApplicationReviewPanel({
  employer,
  initialStatus = "all",
  initialJobId,
  className,
}: HiringApplicationReviewPanelProps) {
  const [applications, setApplications] = useState<HiringApplicationReviewItem[]>([])
  const [filters, setFilters] = useState<HiringApplicationReviewFilters>({
    status: initialStatus,
    jobId: initialJobId,
  })
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([])
  const [selectedApplication, setSelectedApplication] = useState<HiringApplicationReviewItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const departments = useMemo(() => {
    return Array.from(
      new Set(
        applications
          .map((application) => application.job.department)
          .filter((department): department is string => Boolean(department))
      )
    ).sort()
  }, [applications])

  async function fetchApplications() {
    setIsLoading(true)
    setError(null)

    const queryString = buildHiringApplicationsQueryString({
      entity_type: employer.entityType,
      entity_id: employer.entityId,
      status: filters.status,
      job_id: filters.jobId,
      search: filters.search,
      department: filters.department,
    })

    try {
      const response = await fetch(`/api/hiring/applications?${queryString}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      })

      const payload = (await response.json()) as HiringApplicationListResponse

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load applications")
      }

      setApplications(normalizeApplications(payload))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      setApplications([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchApplications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employer.entityType, employer.entityId, filters.status, filters.jobId, filters.search, filters.department])

  function toggleApplicationSelection(applicationId: string) {
    setSelectedApplicationIds((currentIds) => {
      if (currentIds.includes(applicationId)) {
        return currentIds.filter((id) => id !== applicationId)
      }

      return [...currentIds, applicationId]
    })
  }

  function openApplication(application: HiringApplicationReviewItem) {
    setSelectedApplication(application)
    setIsDetailOpen(true)
  }

  async function submitDecision({
    applicationId,
    action,
    reason,
  }: {
    applicationId: string
    action: HiringApplicationReviewAction
    reason?: string
  }) {
    setIsSubmitting(true)
    setError(null)

    const payload: HiringApplicationDecisionPayload = {
      action,
      employer_entity_type: employer.entityType,
      employer_entity_id: employer.entityId,
      reason,
    }

    try {
      const response = await fetch(`/api/hiring/applications/${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${action} application`)
      }

      setSelectedApplicationIds((ids) => ids.filter((id) => id !== applicationId))
      await fetchApplications()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function submitBulkDecision(action: HiringApplicationReviewAction) {
    if (selectedApplicationIds.length === 0) return

    setIsSubmitting(true)
    setError(null)

    try {
      const results = await Promise.allSettled(
        selectedApplicationIds.map((applicationId) =>
          fetch(`/api/hiring/applications/${applicationId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              action,
              employer_entity_type: employer.entityType,
              employer_entity_id: employer.entityId,
            } satisfies HiringApplicationDecisionPayload),
          })
        )
      )

      const failedCount = results.filter((result) => result.status === "rejected").length
      if (failedCount > 0) {
        throw new Error(`${failedCount} application action${failedCount === 1 ? "" : "s"} failed`)
      }

      setSelectedApplicationIds([])
      await fetchApplications()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Applications</h2>
          <p className="text-sm text-slate-400">
            Review real applications submitted to {employer.displayName}. Approvals must run through the hiring service bridge.
          </p>
        </div>
        <Button variant="outline" onClick={() => void fetchApplications()} disabled={isLoading || isSubmitting}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <ApplicationReviewFilters filters={filters} departments={departments} onFiltersChange={setFilters} />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Application review error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <BulkApplicationActions
        selectedCount={selectedApplicationIds.length}
        isSubmitting={isSubmitting}
        onApproveSelected={() => void submitBulkDecision("approve")}
        onRejectSelected={() => void submitBulkDecision("reject")}
        onShortlistSelected={() => void submitBulkDecision("shortlist")}
        onWaitlistSelected={() => void submitBulkDecision("waitlist")}
        onClearSelection={() => setSelectedApplicationIds([])}
      />

      {isLoading ? (
        <Card className="border-slate-800 bg-slate-950/60">
          <CardContent className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading applications…
          </CardContent>
        </Card>
      ) : applications.length === 0 ? (
        <ApplicationReviewEmptyState />
      ) : (
        <div className="space-y-3">
          {applications.map((application) => {
            const isSelected = selectedApplicationIds.includes(application.id)

            return (
              <Card key={application.id} className="border-slate-800 bg-slate-950/60">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleApplicationSelection(application.id)}
                        aria-label={`Select application for ${application.applicant.name}`}
                        className="mt-1"
                      />
                      <ApplicationApplicantSummary
                        applicantName={application.applicant.name}
                        applicantEmail={application.applicant.email}
                        applicantPhone={application.applicant.phone || undefined}
                        avatarUrl={application.applicant.avatarUrl || undefined}
                        status={application.status}
                        appliedAt={application.appliedAt || undefined}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <ApplicationReviewActions
                        size="sm"
                        onApprove={() => void submitDecision({ applicationId: application.id, action: "approve" })}
                        onReject={() => void submitDecision({ applicationId: application.id, action: "reject" })}
                        onShortlist={() => void submitDecision({ applicationId: application.id, action: "shortlist" })}
                        onMessage={() => void submitDecision({ applicationId: application.id, action: "waitlist" })}
                        approveVariant="default"
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openApplication(application)}>View details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void submitDecision({ applicationId: application.id, action: "mark_reviewed" })}>
                            Mark reviewed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void submitDecision({ applicationId: application.id, action: "waitlist" })}>
                            Waitlist
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 border-t border-slate-900 pt-4 md:grid-cols-[1fr_auto]">
                  <ApplicationJobSummary
                    title={application.job.title}
                    department={application.job.department || undefined}
                    position={application.job.position || undefined}
                    location={application.job.location || undefined}
                    displayMode="stacked"
                  />
                  <ApplicationInsightsBadges
                    onboardingStage={application.candidate?.stage || undefined}
                    contractStatus={application.contractStatus || undefined}
                    isEligible={application.eligibility?.isEligible ?? null}
                    reReviewRequestedAt={application.reReviewRequestedAt || undefined}
                    stackRight
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <ApplicationDetailDrawer
        application={selectedApplication}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onApprove={(application) => void submitDecision({ applicationId: application.id, action: "approve" })}
        onReject={(application) => void submitDecision({ applicationId: application.id, action: "reject" })}
        onShortlist={(application) => void submitDecision({ applicationId: application.id, action: "shortlist" })}
        onWaitlist={(application) => void submitDecision({ applicationId: application.id, action: "waitlist" })}
      />
    </div>
  )
}
