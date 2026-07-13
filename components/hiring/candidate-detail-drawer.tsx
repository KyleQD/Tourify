"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, FileText, Loader2, Mail, Phone, ShieldAlert, UserRound, XCircle } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { ToastAction } from "@/components/ui/toast"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ApplicationResponsesList } from "@/components/hiring/application-responses-list"
import { CandidateDocumentReview } from "@/components/hiring/candidate-document-review"
import { WorkflowTimeline } from "@/components/hiring/workflow-timeline"
import { WorkforcePanel } from "@/components/hiring/workforce-ui"
import { CandidateOnboardingPanel } from "@/components/hiring/candidate-card/candidate-onboarding-panel"
import { CandidateAssignmentPanel } from "@/components/hiring/candidate-card/candidate-assignment-panel"
import { OnboardingDeliveryBadge } from "@/components/hiring/candidate-card/onboarding-delivery-badge"
import { getCandidateStageLabel, getCandidateStatusLabel } from "@/lib/hiring/candidate-workflow-utils"
import { getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { HiringCandidate } from "@/types/hiring-candidate-workflow"
import type { HiringEntity } from "@/types/hiring-entity"

interface CandidateDetailDrawerProps {
  candidate: HiringCandidate | null
  employer: HiringEntity
  open: boolean
  onOpenChange: (open: boolean) => void
  onReviewDocument?: (args: { documentId: string; status: "verified" | "rejected"; rejectionReason?: string }) => Promise<void>
  onCandidateUpdated?: () => void
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase()
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

function countAnswers(responses: Record<string, unknown> | null | undefined): number {
  if (!responses) return 0
  return Object.values(responses).filter((value) => {
    if (value === null || value === undefined) return false
    if (typeof value === "string") return value.trim().length > 0
    if (typeof value === "boolean") return true
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === "object") return Object.keys(value).length > 0
    return true
  }).length
}

function getReviewDocCounts(candidate: HiringCandidate) {
  const documents = candidate.documents ?? []
  const pending = documents.filter((doc) => doc.status === "pending").length
  const rejected = documents.filter((doc) => doc.status === "rejected").length
  const verified = documents.filter((doc) => doc.status === "verified").length
  const requiredBlocked = documents.filter(
    (doc) => doc.required && (doc.status === "rejected" || doc.status === "expired" || doc.status === "pending")
  )
  // Pending required docs are OK for approve-all (server bulk-approves). Rejected/expired block.
  const hasRejectedRequired = documents.some(
    (doc) => doc.required && (doc.status === "rejected" || doc.status === "expired")
  )

  return { pending, rejected, verified, total: documents.length, hasRejectedRequired, requiredBlocked }
}

export function CandidateDetailDrawer({
  candidate,
  employer,
  open,
  onOpenChange,
  onReviewDocument,
  onCandidateUpdated,
}: CandidateDetailDrawerProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [reviewNotes, setReviewNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!candidate) {
    return <Sheet open={open} onOpenChange={onOpenChange} />
  }

  const hasBlockingIssues = (candidate.blockingIssueCount ?? 0) > 0
  const hasMissingRequired = (candidate.missingRequiredCount ?? 0) > 0
  const isOnboardingActive =
    candidate.onboardingDeliveryStatus === "in_progress" || candidate.onboardingDeliveryStatus === "sent"
  const isAwaitingReview = candidate.status === "submitted" || candidate.stage === "review"
  const isNeedsRevision = candidate.status === "needs_revision"
  const docCounts = getReviewDocCounts(candidate)
  const answerCount = countAnswers(candidate.onboardingResponses)
  const canApprove = isAwaitingReview && !hasBlockingIssues && !docCounts.hasRejectedRequired
  const canRequestChanges = isAwaitingReview && reviewNotes.trim().length > 0

  function handleUpdated() {
    onCandidateUpdated?.()
  }

  async function submitReview(action: "approve" | "request_changes") {
    if (!candidate) return

    if (action === "request_changes" && !reviewNotes.trim()) {
      toast({
        title: "Notes required",
        description: "Add notes explaining what the worker should fix.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/hiring/candidates/${candidate.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          notes: reviewNotes.trim() || undefined,
          employer_entity_type: employer.entityType,
          employer_entity_id: employer.entityId,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(getPayloadError(payload) ?? `Failed to ${action === "approve" ? "approve" : "request changes for"} onboarding`)
      }

      if (action === "approve") {
        const query = getEmployerQueryString(employer)
        const rosterHref = `/admin/dashboard/hiring?${query}&tab=roster`
        toast({
          title: "Approved — added to roster",
          description: `${candidate.name} was notified and is ready for role and team assignment.`,
          action: (
            <ToastAction altText="Open roster" onClick={() => router.push(rosterHref)}>
              Open roster
            </ToastAction>
          ),
        })
        setReviewNotes("")
        onOpenChange(false)
      } else {
        toast({
          title: "Changes requested",
          description: `${candidate.name} was notified to revise their onboarding.`,
        })
        setReviewNotes("")
        onOpenChange(false)
      }

      onCandidateUpdated?.()
    } catch (error) {
      toast({
        title: action === "approve" ? "Could not approve onboarding" : "Could not request changes",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const reviewSummary = (
    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
      <Badge variant="outline" className="border-slate-600/60 text-slate-200">
        {answerCount} answer{answerCount === 1 ? "" : "s"}
      </Badge>
      <Badge variant="outline" className="border-slate-600/60 text-slate-200">
        {docCounts.total} doc{docCounts.total === 1 ? "" : "s"}
        {docCounts.pending > 0 ? ` · ${docCounts.pending} pending` : ""}
        {docCounts.rejected > 0 ? ` · ${docCounts.rejected} rejected` : ""}
      </Badge>
      {isAwaitingReview ? (
        <Badge variant="outline" className="border-amber-400/40 text-amber-200">
          Awaiting review
        </Badge>
      ) : null}
      {isNeedsRevision ? (
        <Badge variant="outline" className="border-rose-400/40 text-rose-200">
          Needs revision
        </Badge>
      ) : null}
    </div>
  )

  const reviewChecklist = (
    <>
      <WorkforcePanel className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <h3 className="text-base font-medium text-white">Onboarding answers</h3>
        </div>
        <ApplicationResponsesList responses={candidate.onboardingResponses} />
      </WorkforcePanel>

      <CandidateDocumentReview documents={candidate.documents} onReviewDocument={onReviewDocument} />

      {candidate.notes ? (
        <WorkforcePanel className="space-y-2 p-5">
          <h3 className="text-base font-medium text-white">Admin notes</h3>
          <p className="whitespace-pre-wrap text-sm text-slate-300">{candidate.notes}</p>
        </WorkforcePanel>
      ) : null}
    </>
  )

  const contactAndSource = (
    <div className="grid gap-4 md:grid-cols-2">
      <WorkforcePanel className="space-y-3 p-5">
        <h3 className="text-base font-medium text-white">Contact</h3>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Mail className="h-4 w-4 text-slate-500" />
          <span>{candidate.email}</span>
        </div>
        {candidate.phone ? (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Phone className="h-4 w-4 text-slate-500" />
            <span>{candidate.phone}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <UserRound className="h-4 w-4 text-slate-500" />
          <span>{candidate.userId ? "Linked account" : "No linked account yet"}</span>
        </div>
      </WorkforcePanel>

      <WorkforcePanel className="space-y-2 p-5 text-sm text-slate-300">
        <h3 className="text-base font-medium text-white">Source</h3>
        <p>
          <span className="text-slate-500">Job:</span> {candidate.job?.title ?? candidate.position ?? "—"}
        </p>
        <p>
          <span className="text-slate-500">Applied via:</span>{" "}
          {candidate.applicationId ? "Job application" : "Direct invite"}
        </p>
        <p>
          <span className="text-slate-500">Manager:</span>{" "}
          {candidate.assignment?.managerName ?? candidate.assignedManagerName ?? "Unassigned"}
        </p>
      </WorkforcePanel>
    </div>
  )

  const adminToolsAccordion = (
    <Accordion type="single" collapsible className="rounded-xl border border-slate-700/60 bg-slate-900/40 px-4">
      <AccordionItem value="admin-tools" className="border-none">
        <AccordionTrigger className="text-sm text-slate-300 hover:no-underline">Admin tools</AccordionTrigger>
        <AccordionContent className="space-y-4 pb-4">
          <WorkflowTimeline steps={candidate.workflowSteps} currentStage={candidate.workflowCurrentStage} />
          <CandidateOnboardingPanel candidate={candidate} employer={employer} onUpdated={handleUpdated} />
          <CandidateAssignmentPanel candidate={candidate} employer={employer} onUpdated={handleUpdated} />
          {contactAndSource}
          {candidate.roster ? (
            <WorkforcePanel className="space-y-2 p-5 text-sm text-slate-300">
              <h3 className="text-base font-medium text-white">Roster & Work Mode</h3>
              <p>
                <span className="text-slate-500">Staff member:</span> {candidate.roster.staffMemberId ?? "Not created"}
              </p>
              <p>
                <span className="text-slate-500">Employment assignment:</span>{" "}
                {candidate.roster.employmentAssignmentId ?? "Not created"}
              </p>
              <p>
                <span className="text-slate-500">Work Mode:</span> {candidate.roster.workModeStatus ?? "not_created"}
              </p>
              <p>
                <span className="text-slate-500">Zone:</span> {candidate.roster.zone ?? "Unassigned"}
              </p>
            </WorkforcePanel>
          ) : null}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-hidden border-slate-800 bg-slate-950/95 p-0 text-white backdrop-blur-xl sm:max-w-3xl">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.12),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.12),transparent_38%)]" />

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-6">
          <SheetHeader className="space-y-4 text-left">
            <div className="flex items-start gap-4">
              <Avatar className={cn("h-14 w-14 ring-2 ring-transparent", isOnboardingActive && "ring-cyan-400/50")}>
                <AvatarImage src={candidate.avatarUrl ?? undefined} alt={candidate.name} />
                <AvatarFallback className="bg-slate-800 text-slate-200">{getInitials(candidate.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-2xl text-white">{candidate.name}</SheetTitle>
                <SheetDescription className="text-slate-400">
                  {[candidate.job?.title ?? candidate.position, candidate.department, candidate.employmentType]
                    .filter(Boolean)
                    .join(" • ")}
                </SheetDescription>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-slate-600/60 text-slate-200">
                    {getCandidateStatusLabel(candidate.status)}
                  </Badge>
                  <Badge variant="outline" className="border-purple-400/40 text-purple-200">
                    {getCandidateStageLabel(candidate.stage)}
                  </Badge>
                  <OnboardingDeliveryBadge status={candidate.onboardingDeliveryStatus} />
                  {candidate.complianceStatus ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        candidate.complianceStatus === "blocked"
                          ? "border-rose-500/50 text-rose-200"
                          : candidate.complianceStatus === "approved"
                            ? "border-emerald-500/40 text-emerald-200"
                            : "border-slate-600/60 text-slate-300"
                      )}
                    >
                      Compliance: {candidate.complianceStatus.replace("_", " ")}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-3">{reviewSummary}</div>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            {isAwaitingReview || isNeedsRevision ? (
              <>
                <WorkforcePanel className="space-y-3 p-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white">{candidate.onboardingProgress}% complete</span>
                      <span className="text-slate-400">
                        Updated {candidate.updatedAt ? new Date(candidate.updatedAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    <Progress value={candidate.onboardingProgress} className="h-1.5" />
                    {hasBlockingIssues || hasMissingRequired || docCounts.hasRejectedRequired ? (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                        <div className="flex items-center gap-2 font-medium">
                          <ShieldAlert className="h-4 w-4" />
                          Action needed
                        </div>
                        <p className="text-rose-200/80">
                          {docCounts.hasRejectedRequired
                            ? "One or more required documents were rejected. Request changes or re-verify before approving."
                            : `${candidate.missingRequiredCount ?? 0} missing required item(s), ${candidate.blockingIssueCount ?? 0} blocking issue(s).`}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </WorkforcePanel>

                {reviewChecklist}
                {adminToolsAccordion}
              </>
            ) : (
              <>
                <WorkforcePanel className="space-y-5 p-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white">{candidate.onboardingProgress}% complete</span>
                      <span className="text-slate-400">
                        Updated {candidate.updatedAt ? new Date(candidate.updatedAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                    <Progress value={candidate.onboardingProgress} className="h-1.5" />
                    {hasBlockingIssues || hasMissingRequired ? (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                        <div className="flex items-center gap-2 font-medium">
                          <ShieldAlert className="h-4 w-4" />
                          Action needed
                        </div>
                        <p className="text-rose-200/80">
                          {candidate.missingRequiredCount ?? 0} missing required item(s), {candidate.blockingIssueCount ?? 0}{" "}
                          blocking issue(s).
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <WorkflowTimeline steps={candidate.workflowSteps} currentStage={candidate.workflowCurrentStage} />
                </WorkforcePanel>

                <CandidateOnboardingPanel candidate={candidate} employer={employer} onUpdated={handleUpdated} />
                <CandidateAssignmentPanel candidate={candidate} employer={employer} onUpdated={handleUpdated} />
                {reviewChecklist}
                {contactAndSource}

                {candidate.roster ? (
                  <WorkforcePanel className="space-y-2 p-5 text-sm text-slate-300">
                    <h3 className="text-base font-medium text-white">Roster & Work Mode</h3>
                    <p>
                      <span className="text-slate-500">Staff member:</span> {candidate.roster.staffMemberId ?? "Not created"}
                    </p>
                    <p>
                      <span className="text-slate-500">Employment assignment:</span>{" "}
                      {candidate.roster.employmentAssignmentId ?? "Not created"}
                    </p>
                    <p>
                      <span className="text-slate-500">Work Mode:</span> {candidate.roster.workModeStatus ?? "not_created"}
                    </p>
                    <p>
                      <span className="text-slate-500">Zone:</span> {candidate.roster.zone ?? "Unassigned"}
                    </p>
                  </WorkforcePanel>
                ) : null}
              </>
            )}
          </div>
        </div>

        {isAwaitingReview ? (
          <div className="shrink-0 border-t border-slate-800 bg-slate-950/90 px-6 py-4 backdrop-blur-xl">
            <div className="space-y-3">
              <Textarea
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                placeholder="Notes for the worker (required to request changes)"
                className="min-h-[72px] border-slate-700/60 bg-slate-900/60 text-white placeholder:text-slate-500"
              />
              {!canApprove ? (
                <p className="text-xs text-rose-300">
                  {docCounts.hasRejectedRequired
                    ? "Resolve rejected required documents before approving."
                    : hasBlockingIssues
                      ? `Resolve ${candidate.blockingIssueCount} blocking issue(s) before approving.`
                      : null}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={!canRequestChanges || isSubmitting}
                  onClick={() => void submitReview("request_changes")}
                  className="border-rose-500/40 text-rose-200 hover:bg-rose-500/10"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                  Request changes
                </Button>
                <Button
                  disabled={!canApprove || isSubmitting}
                  onClick={() => void submitReview("approve")}
                  className="bg-emerald-500/90 text-white hover:bg-emerald-500"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Approve all
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
