"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, MoreHorizontal, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ToastAction } from "@/components/ui/toast"
import { getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { ApplicationApplicantSummary } from "@/components/hiring/application-applicant-summary"
import { ApplicationDetailDrawer } from "@/components/hiring/application-detail-drawer"
import { ApplicationInsightsBadges } from "@/components/hiring/application-insights-badges"
import { ApplicationJobSummary } from "@/components/hiring/application-job-summary"
import { ApplicationReviewActions } from "@/components/hiring/application-review-actions"
import { ApplicationStarToggle } from "@/components/hiring/application-star-toggle"
import { ApplicationReviewEmptyState } from "@/components/hiring/application-review-empty-state"
import { ApplicationReviewFilters } from "@/components/hiring/application-review-filters"
import { ApproveOnboardingTemplateDialog } from "@/components/hiring/approve-onboarding-template-dialog"
import { BulkApplicationActions } from "@/components/hiring/bulk-application-actions"
import { WorkforcePanel } from "@/components/hiring/workforce-ui"
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

function getPayloadError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null

  const error = (payload as { error?: unknown }).error
  if (typeof error === "string") return error
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message
  }

  return null
}

function normalizeApplications(data: HiringApplicationListResponse): HiringApplicationReviewItem[] {
  return data.applications || data.data || []
}

const ACTION_SUCCESS_MESSAGE: Record<HiringApplicationReviewAction, string> = {
  approve: "Application approved — worker added to roster (pending) and onboarding invitation sent.",
  reject: "Application rejected.",
  shortlist: "Application shortlisted.",
  waitlist: "Application waitlisted.",
  mark_reviewed: "Application marked as reviewed.",
}

function buildViewRosterAction(employer: HiringApplicationReviewPanelProps["employer"]) {
  const query = getEmployerQueryString(employer)
  return (
    <ToastAction altText="Open roster" onClick={() => {
      window.location.href = `/admin/dashboard/hiring?${query}&tab=roster`
    }}>
      Open roster
    </ToastAction>
  )
}

interface DecisionResultData {
  onboarding?: { isPending?: boolean; name?: string | null } | null
  candidate?: { id?: string | null } | null
  warnings?: string[]
}

interface TemplatePrompt {
  applicationId: string
  jobId: string | null
}

export function ApplicationReviewPanel({
  employer,
  initialStatus = "all",
  initialJobId,
  initialApplicationId,
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
  const [templatePrompt, setTemplatePrompt] = useState<TemplatePrompt | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  function buildViewCandidateAction(candidateId?: string | null) {
    const query = getEmployerQueryString(employer)
    const href = candidateId
      ? `/admin/dashboard/candidates?${query}&candidateId=${candidateId}`
      : `/admin/dashboard/candidates?${query}`
    return (
      <ToastAction altText="View in Candidates" onClick={() => router.push(href)}>
        View in Candidates
      </ToastAction>
    )
  }

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
      starred: filters.starredOnly,
    })

    try {
      const response = await fetch(`/api/hiring/applications?${queryString}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      })

      const payload = (await response.json()) as HiringApplicationListResponse

      if (!response.ok) {
        throw new Error(getPayloadError(payload) || "Failed to load applications")
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

  }, [employer.entityType, employer.entityId, filters.status, filters.jobId, filters.search, filters.department, filters.starredOnly])

  // Deep link: when an application id is provided (e.g. /applications/[id]), open
  // its detail drawer as soon as that application is present in the list.
  useEffect(() => {
    if (!initialApplicationId || applications.length === 0) return
    const match = applications.find((application) => application.id === initialApplicationId)
    if (match) {
      setSelectedApplication(match)
      setIsDetailOpen(true)
    }

  }, [initialApplicationId, applications])

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

  async function toggleStar(application: HiringApplicationReviewItem) {
    const nextStarred = !application.isStarred

    // Optimistic update for both the list and the open drawer.
    setApplications((current) =>
      current.map((item) => (item.id === application.id ? { ...item, isStarred: nextStarred } : item))
    )
    setSelectedApplication((current) =>
      current && current.id === application.id ? { ...current, isStarred: nextStarred } : current
    )

    try {
      const response = await fetch(`/api/hiring/applications/${application.id}/star`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          is_starred: nextStarred,
          employer_entity_type: employer.entityType,
          employer_entity_id: employer.entityId,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(getPayloadError(result) || "Failed to update star")
      }

      // Keep the starred-only view consistent when un-starring.
      if (!nextStarred && filters.starredOnly) {
        setApplications((current) => current.filter((item) => item.id !== application.id))
      }
    } catch (requestError) {
      // Revert on failure.
      setApplications((current) =>
        current.map((item) => (item.id === application.id ? { ...item, isStarred: application.isStarred } : item))
      )
      setSelectedApplication((current) =>
        current && current.id === application.id ? { ...current, isStarred: application.isStarred } : current
      )
      setError(getErrorMessage(requestError))
    }
  }

  async function submitDecision({
    applicationId,
    action,
    reason,
    onboardingTemplateId,
    jobId,
  }: {
    applicationId: string
    action: HiringApplicationReviewAction
    reason?: string
    onboardingTemplateId?: string
    jobId?: string | null
  }) {
    setIsSubmitting(true)
    setError(null)

    const payload: HiringApplicationDecisionPayload = {
      action,
      employer_entity_type: employer.entityType,
      employer_entity_id: employer.entityId,
      reason,
      ...(onboardingTemplateId ? { onboarding_template_id: onboardingTemplateId } : {}),
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

      const result = await response.json()

      if (!response.ok) {
        throw new Error(getPayloadError(result) || `Failed to ${action} application`)
      }

      setSelectedApplicationIds((ids) => ids.filter((id) => id !== applicationId))

      const data = (result?.data ?? null) as DecisionResultData | null
      const warnings = Array.isArray(data?.warnings) ? data!.warnings : []
      const isPendingTemplate = action === "approve" && Boolean(data?.onboarding?.isPending) && !onboardingTemplateId
      const hasRosterWarning =
        action === "approve" && warnings.some((warning) => /roster/i.test(warning))

      const candidateId = data?.candidate?.id ?? null

      // If onboarding template is pending, keep the admin in the flow to assign one.
      if (isPendingTemplate) {
        setTemplatePrompt({ applicationId, jobId: jobId ?? null })
        toast({
          title: "Application approved",
          description:
            "No template assigned yet. Pick one now, or assign it later from the Candidates tab." +
            (warnings.length ? ` ${warnings.join(" ")}` : ""),
          action: hasRosterWarning ? buildViewRosterAction(employer) : buildViewCandidateAction(candidateId),
        })
      } else {
        setTemplatePrompt(null)
        setIsDetailOpen(false)
        toast({
          title: hasRosterWarning ? "Approved with roster issue" : "Success",
          description: ACTION_SUCCESS_MESSAGE[action] + (warnings.length ? ` ${warnings.join(" ")}` : ""),
          action:
            action === "approve"
              ? hasRosterWarning
                ? buildViewRosterAction(employer)
                : buildViewCandidateAction(candidateId)
              : undefined,
          variant: hasRosterWarning ? "destructive" : undefined,
        })
      }

      await fetchApplications()
    } catch (requestError) {
      const message = getErrorMessage(requestError)
      setError(message)
      toast({ title: `Could not ${action.replace("_", " ")} application`, description: message, variant: "destructive" })
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

      const failedCount = results.filter(
        (result) => result.status === "rejected" || (result.status === "fulfilled" && !result.value.ok)
      ).length
      if (failedCount > 0) {
        throw new Error(`${failedCount} application action${failedCount === 1 ? "" : "s"} failed`)
      }

      const succeededCount = selectedApplicationIds.length
      setSelectedApplicationIds([])
      toast({
        title: "Success",
        description:
          `${succeededCount} application${succeededCount === 1 ? "" : "s"} updated. ${ACTION_SUCCESS_MESSAGE[action]}` +
          (action === "approve" ? " Assign onboarding templates from the Candidates tab." : ""),
        action: action === "approve" ? buildViewCandidateAction(null) : undefined,
      })
      await fetchApplications()
    } catch (requestError) {
      const message = getErrorMessage(requestError)
      setError(message)
      toast({ title: "Bulk action failed", description: message, variant: "destructive" })
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
        <WorkforcePanel>
          <CardContent className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading applications…
          </CardContent>
        </WorkforcePanel>
      ) : applications.length === 0 ? (
        <ApplicationReviewEmptyState />
      ) : (
        <div className="space-y-3">
          {applications.map((application) => {
            const isSelected = selectedApplicationIds.includes(application.id)

            return (
              <WorkforcePanel key={application.id} className="overflow-hidden">
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
                      <ApplicationStarToggle
                        isStarred={application.isStarred}
                        onToggle={() => void toggleStar(application)}
                      />
                      <ApplicationReviewActions
                        size="sm"
                        onApprove={() =>
                          void submitDecision({ applicationId: application.id, action: "approve", jobId: application.job.id })
                        }
                        onReject={() => void submitDecision({ applicationId: application.id, action: "reject" })}
                        onShortlist={() => void submitDecision({ applicationId: application.id, action: "shortlist" })}
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
                <CardContent className="grid gap-4 border-t border-slate-800/80 bg-slate-900/25 pt-4 md:grid-cols-[1fr_auto]">
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
              </WorkforcePanel>
            )
          })}
        </div>
      )}

      <ApplicationDetailDrawer
        application={selectedApplication}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onApprove={(application) =>
          void submitDecision({ applicationId: application.id, action: "approve", jobId: application.job.id })
        }
        onReject={(application) => void submitDecision({ applicationId: application.id, action: "reject" })}
        onShortlist={(application) => void submitDecision({ applicationId: application.id, action: "shortlist" })}
        onWaitlist={(application) => void submitDecision({ applicationId: application.id, action: "waitlist" })}
        onToggleStar={(application) => void toggleStar(application)}
      />

      <ApproveOnboardingTemplateDialog
        employer={employer}
        open={Boolean(templatePrompt)}
        onOpenChange={(open) => {
          if (!open) setTemplatePrompt(null)
        }}
        jobId={templatePrompt?.jobId}
        isSubmitting={isSubmitting}
        onApprove={({ onboardingTemplateId }) => {
          if (!templatePrompt) return
          const { applicationId, jobId } = templatePrompt
          if (!onboardingTemplateId) {
            setTemplatePrompt(null)
            return
          }
          void submitDecision({ applicationId, action: "approve", onboardingTemplateId, jobId })
        }}
      />
    </div>
  )
}
