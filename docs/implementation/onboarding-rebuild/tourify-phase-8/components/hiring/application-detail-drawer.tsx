"use client"

import { ExternalLink } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ApplicationApplicantSummary } from "@/components/hiring/application-applicant-summary"
import { ApplicationInsightsBadges } from "@/components/hiring/application-insights-badges"
import { ApplicationJobSummary } from "@/components/hiring/application-job-summary"
import { ApplicationResponsesList } from "@/components/hiring/application-responses-list"
import { ApplicationReviewActions } from "@/components/hiring/application-review-actions"
import { ApplicationRating } from "@/components/hiring/application-rating"
import type { HiringApplicationReviewItem } from "@/types/hiring-application-review"

interface ApplicationDetailDrawerProps {
  application: HiringApplicationReviewItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove: (application: HiringApplicationReviewItem) => void
  onReject: (application: HiringApplicationReviewItem) => void
  onShortlist: (application: HiringApplicationReviewItem) => void
  onWaitlist: (application: HiringApplicationReviewItem) => void
}

export function ApplicationDetailDrawer({
  application,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onShortlist,
  onWaitlist,
}: ApplicationDetailDrawerProps) {
  if (!application) return null

  const onboardingHref = application.candidate?.invitationToken
    ? `/onboarding/hire/${application.candidate.invitationToken}`
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-slate-800 bg-slate-950 text-white">
        <DialogHeader>
          <DialogTitle>Application Review</DialogTitle>
          <DialogDescription className="text-slate-400">
            Review applicant details, submitted answers, eligibility, and onboarding status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <ApplicationApplicantSummary
            applicantName={application.applicant.name}
            applicantEmail={application.applicant.email}
            applicantPhone={application.applicant.phone || undefined}
            avatarUrl={application.applicant.avatarUrl || undefined}
            status={application.status}
            appliedAt={application.appliedAt || undefined}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Job</h3>
              <ApplicationJobSummary
                title={application.job.title}
                department={application.job.department || undefined}
                position={application.job.position || undefined}
                location={application.job.location || undefined}
              />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Signals</h3>
              <div className="space-y-3">
                <ApplicationRating rating={application.rating || undefined} />
                <ApplicationInsightsBadges
                  onboardingStage={application.candidate?.stage || undefined}
                  contractStatus={application.contractStatus || undefined}
                  isEligible={application.eligibility?.isEligible ?? null}
                  reReviewRequestedAt={application.reReviewRequestedAt || undefined}
                />
                {application.eligibility?.issues?.length ? (
                  <div className="space-y-2">
                    {application.eligibility.issues.map((issue) => (
                      <Badge key={issue} variant="outline" className="mr-2 border-amber-500/40 text-amber-300">
                        {issue}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {application.candidate ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Onboarding Candidate</h3>
              <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-4">
                <div>
                  <p className="text-slate-500">Status</p>
                  <p className="font-medium text-white">{application.candidate.status || "Not started"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Stage</p>
                  <p className="font-medium text-white">{application.candidate.stage || "Invitation"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Progress</p>
                  <p className="font-medium text-white">{application.candidate.onboardingProgress ?? 0}%</p>
                </div>
                <div>
                  <p className="text-slate-500">Token</p>
                  {onboardingHref ? (
                    <Button asChild size="sm" variant="outline" className="mt-1">
                      <a href={onboardingHref} target="_blank" rel="noreferrer">
                        Open link <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  ) : (
                    <p className="font-medium text-slate-400">Not generated</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <Separator className="bg-slate-800" />

          <section>
            <h3 className="mb-3 text-lg font-semibold text-white">Submitted Responses</h3>
            <ApplicationResponsesList responses={application.formResponses} />
          </section>

          <div className="sticky bottom-0 -mx-6 border-t border-slate-800 bg-slate-950/95 px-6 py-4 backdrop-blur">
            <ApplicationReviewActions
              onApprove={() => onApprove(application)}
              onReject={() => onReject(application)}
              onShortlist={() => onShortlist(application)}
              onMessage={() => onWaitlist(application)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
