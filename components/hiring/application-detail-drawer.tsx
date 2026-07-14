"use client"

import { ExternalLink, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApplicantProfileSnapshotView } from "@/components/hiring/applicant-profile-snapshot-view"
import { ApplicationApplicantSummary } from "@/components/hiring/application-applicant-summary"
import { ApplicationInsightsBadges } from "@/components/hiring/application-insights-badges"
import { ApplicationJobSummary } from "@/components/hiring/application-job-summary"
import { ApplicationResponsesList } from "@/components/hiring/application-responses-list"
import { ApplicationReviewActions } from "@/components/hiring/application-review-actions"
import { ApplicationRating } from "@/components/hiring/application-rating"
import { ApplicationStarToggle } from "@/components/hiring/application-star-toggle"
import type { HiringApplicationReviewItem } from "@/types/hiring-application-review"
import { cn } from "@/lib/utils"

interface ApplicationDetailDrawerProps {
  application: HiringApplicationReviewItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove: (application: HiringApplicationReviewItem) => void
  onReject: (application: HiringApplicationReviewItem) => void
  onShortlist: (application: HiringApplicationReviewItem) => void
  onWaitlist: (application: HiringApplicationReviewItem) => void
  onToggleStar?: (application: HiringApplicationReviewItem) => void
}

const glassPanel =
  "rounded-2xl border border-white/10 bg-white/[0.045] shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl"
const outlineBtn =
  "rounded-xl border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
const sectionLabel = "mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400"

export function ApplicationDetailDrawer({
  application,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onShortlist,
  onWaitlist,
  onToggleStar,
}: ApplicationDetailDrawerProps) {
  if (!application) return null

  const onboardingHref = application.candidate?.invitationToken
    ? `/onboarding/hire/${application.candidate.invitationToken}`
    : null
  const snapshot = application.profileSnapshot ?? null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] max-w-4xl overflow-y-auto border-white/10 bg-slate-950/95 p-0 text-white shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:rounded-2xl"
        )}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />

        <div className="space-y-6 p-6 pb-0">
          <DialogHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3 pr-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 via-purple-500/20 to-fuchsia-400/20 ring-1 ring-white/10">
                  <UserRound className="h-5 w-5 text-cyan-300" />
                </div>
                <div>
                  <DialogTitle className="text-xl text-white">Application Review</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Review the applicant profile, submitted answers, eligibility, and onboarding status.
                  </DialogDescription>
                </div>
              </div>
              {onToggleStar ? (
                <ApplicationStarToggle
                  isStarred={application.isStarred}
                  onToggle={() => onToggleStar(application)}
                  withLabel
                  size="sm"
                />
              ) : null}
            </div>
          </DialogHeader>

          <div className={cn(glassPanel, "p-4")}>
            <ApplicationApplicantSummary
              applicantName={application.applicant.name}
              applicantEmail={application.applicant.email}
              applicantPhone={application.applicant.phone || undefined}
              avatarUrl={application.applicant.avatarUrl || undefined}
              status={application.status}
              appliedAt={application.appliedAt || undefined}
            />
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="h-auto w-full justify-start gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
              <TabsTrigger
                value="profile"
                className="rounded-lg px-3 py-2 text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="answers"
                className="rounded-lg px-3 py-2 text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                Screening answers
              </TabsTrigger>
              <TabsTrigger
                value="signals"
                className="rounded-lg px-3 py-2 text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                Signals
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4">
              {snapshot ? (
                <ApplicantProfileSnapshotView snapshot={snapshot} sharedAt={application.profileSharedAt} />
              ) : (
                <div className={cn(glassPanel, "p-5")}>
                  <p className="text-sm text-slate-400">
                    This applicant applied before profile sharing was available, so no profile snapshot is attached.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="answers" className="mt-4">
              <ApplicationResponsesList responses={application.formResponses} applicationId={application.id} />
            </TabsContent>

            <TabsContent value="signals" className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className={cn(glassPanel, "p-4")}>
                  <h3 className={sectionLabel}>Job</h3>
                  <ApplicationJobSummary
                    title={application.job.title}
                    department={application.job.department || undefined}
                    position={application.job.position || undefined}
                    location={application.job.location || undefined}
                  />
                </div>

                <div className={cn(glassPanel, "p-4")}>
                  <h3 className={sectionLabel}>Signals</h3>
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
                          <Badge key={issue} variant="outline" className="mr-2 border-amber-500/40 bg-amber-500/10 text-amber-300">
                            {issue}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {application.candidate ? (
                <div className={cn(glassPanel, "p-4")}>
                  <h3 className={sectionLabel}>Onboarding Candidate</h3>
                  <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                      <p className="mt-1 font-medium text-white">{application.candidate.status || "Not started"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Stage</p>
                      <p className="mt-1 font-medium text-white">{application.candidate.stage || "Invitation"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Progress</p>
                      <p className="mt-1 font-medium text-white">{application.candidate.onboardingProgress ?? 0}%</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Token</p>
                      {onboardingHref ? (
                        <Button asChild size="sm" variant="outline" className={cn("mt-1", outlineBtn)}>
                          <a href={onboardingHref} target="_blank" rel="noreferrer">
                            Open link <ExternalLink className="ml-2 h-3 w-3" />
                          </a>
                        </Button>
                      ) : (
                        <p className="mt-1 font-medium text-slate-400">Not generated</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>

        <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 bg-slate-950/90 px-6 py-4 backdrop-blur-xl">
          <ApplicationReviewActions
            onApprove={() => onApprove(application)}
            onReject={() => onReject(application)}
            onShortlist={() => onShortlist(application)}
          />
          <Button variant="outline" className={outlineBtn} onClick={() => onWaitlist(application)}>
            Waitlist
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
