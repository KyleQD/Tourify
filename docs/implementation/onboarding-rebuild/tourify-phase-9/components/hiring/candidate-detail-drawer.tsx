"use client"

import { ExternalLink, Mail, Phone, ShieldAlert, UserRound } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { CandidateDocumentReview } from "@/components/hiring/candidate-document-review"
import { WorkflowTimeline } from "@/components/hiring/workflow-timeline"
import { getCandidateStageLabel, getCandidateStatusLabel } from "@/lib/hiring/candidate-workflow-utils"
import type { HiringCandidate } from "@/types/hiring-candidate-workflow"

interface CandidateDetailDrawerProps {
  candidate: HiringCandidate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onReviewDocument?: (args: { documentId: string; status: "verified" | "rejected"; rejectionReason?: string }) => Promise<void>
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

export function CandidateDetailDrawer({ candidate, open, onOpenChange, onReviewDocument }: CandidateDetailDrawerProps) {
  if (!candidate) {
    return <Sheet open={open} onOpenChange={onOpenChange} />
  }

  const hasBlockingIssues = (candidate.blockingIssueCount ?? 0) > 0
  const hasMissingRequired = (candidate.missingRequiredCount ?? 0) > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader className="space-y-4 text-left">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={candidate.avatarUrl ?? undefined} alt={candidate.name} />
              <AvatarFallback>{getInitials(candidate.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-2xl">{candidate.name}</SheetTitle>
              <SheetDescription>
                {[candidate.position, candidate.department, candidate.employmentType].filter(Boolean).join(" • ")}
              </SheetDescription>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline">{getCandidateStatusLabel(candidate.status)}</Badge>
                <Badge variant="secondary">{getCandidateStageLabel(candidate.stage)}</Badge>
                {candidate.complianceStatus ? (
                  <Badge variant={candidate.complianceStatus === "blocked" ? "destructive" : "outline"}>
                    Compliance: {candidate.complianceStatus.replace("_", " ")}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Onboarding Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>{candidate.onboardingProgress}% complete</span>
                <span className="text-muted-foreground">Updated {candidate.updatedAt ? new Date(candidate.updatedAt).toLocaleDateString() : "—"}</span>
              </div>
              <Progress value={candidate.onboardingProgress} />
              {hasBlockingIssues || hasMissingRequired ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <div className="flex items-center gap-2 font-medium">
                    <ShieldAlert className="h-4 w-4" />
                    Action needed
                  </div>
                  <p>
                    {candidate.missingRequiredCount ?? 0} missing required item(s), {candidate.blockingIssueCount ?? 0} blocking issue(s).
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{candidate.email}</span>
                </div>
                {candidate.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{candidate.phone}</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  <span>User ID: {candidate.userId ?? "Not linked"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Job:</span> {candidate.job?.title ?? candidate.position ?? "—"}</p>
                <p><span className="text-muted-foreground">Application:</span> {candidate.applicationId ?? "Direct invite"}</p>
                <p><span className="text-muted-foreground">Template:</span> {candidate.template?.name ?? "No template linked"}</p>
                <p><span className="text-muted-foreground">Manager:</span> {candidate.assignedManagerName ?? "Unassigned"}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invitation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">Invitation ID:</span> {candidate.invitationId ?? "—"}</p>
              <p><span className="text-muted-foreground">Token present:</span> {candidate.invitationToken ? "Yes" : "No"}</p>
              {candidate.onboardingUrl ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={candidate.onboardingUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open onboarding link
                  </a>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <CandidateDocumentReview documents={candidate.documents} onReviewDocument={onReviewDocument} />

          <WorkflowTimeline steps={candidate.workflowSteps} />

          {candidate.roster ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Roster & Work Mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Staff member:</span> {candidate.roster.staffMemberId ?? "Not created"}</p>
                <p><span className="text-muted-foreground">Employment assignment:</span> {candidate.roster.employmentAssignmentId ?? "Not created"}</p>
                <p><span className="text-muted-foreground">Work Mode:</span> {candidate.roster.workModeStatus ?? "not_created"}</p>
                <p><span className="text-muted-foreground">Zone:</span> {candidate.roster.zone ?? "Unassigned"}</p>
              </CardContent>
            </Card>
          ) : null}

          {candidate.notes ? (
            <>
              <Separator />
              <div>
                <h3 className="font-medium">Notes</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{candidate.notes}</p>
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
