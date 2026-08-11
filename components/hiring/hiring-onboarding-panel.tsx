"use client"

import { useEffect, useState } from "react"
import { UserCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CandidateDetailDrawer } from "@/components/hiring/candidate-detail-drawer"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringCandidate } from "@/types/hiring-candidate-workflow"
import { formatDashboardDate, getEmployerQueryString, getProgressPercent, normalizeStatusLabel } from "@/lib/hiring/hiring-dashboard-utils"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"
import { WorkforceEmptyState, WorkforcePanel } from "./workforce-ui"

interface HiringOnboardingPanelProps {
  employer: HiringEntity
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

export function HiringOnboardingPanel({ employer }: HiringOnboardingPanelProps) {
  const queryString = getEmployerQueryString(employer)
  const { data: candidates, isLoading, error, refetch } = useHiringDashboardFetch<HiringCandidate[]>({
    url: `/api/admin/onboarding/candidates?${queryString}`,
    initialData: [],
  })
  const [selectedCandidate, setSelectedCandidate] = useState<HiringCandidate | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  function openCandidate(candidate: HiringCandidate) {
    setSelectedCandidate(candidate)
    setIsDrawerOpen(true)
  }

  async function handleCandidateUpdated() {
    await refetch()
  }

  // Keep the open drawer in sync after list refetch (approve, doc review, assignment).
  useEffect(() => {
    if (!selectedCandidate) return
    const next = candidates.find((candidate) => candidate.id === selectedCandidate.id)
    if (next) setSelectedCandidate(next)
  }, [candidates, selectedCandidate?.id])

  async function reviewDocument(args: {
    documentId: string
    status: "verified" | "rejected"
    rejectionReason?: string
  }) {
    const apiStatus = args.status === "verified" ? "approved" : "rejected"
    const response = await fetch(`/api/admin/onboarding/documents/${args.documentId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: apiStatus,
        review_notes: args.rejectionReason,
        employer_entity_type: employer.entityType,
        employer_entity_id: employer.entityId,
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(getPayloadError(payload) ?? "Failed to review document")
    }

    await refetch()
  }

  return (
    <>
      <WorkforcePanel>
        <CardHeader>
          <CardTitle className="text-white">Onboarding</CardTitle>
          <CardDescription>Review submitted onboarding, approve hires onto the roster, then assign roles.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {isLoading ? <p className="text-sm text-muted-foreground">Loading candidates…</p> : null}
          {!isLoading && candidates.length === 0 ? (
            <WorkforceEmptyState
              icon={UserCheck}
              title="No onboarding candidates"
              description="Approved applicants and direct invites will appear here as onboarding cards."
            />
          ) : null}
          {candidates.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {candidates.map((candidate) => {
                const progress = getProgressPercent(candidate.onboardingProgress)
                return (
                  <div key={candidate.id} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-white">{candidate.name}</h3>
                          <Badge variant="outline">{normalizeStatusLabel(candidate.status)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {[candidate.department, candidate.position].filter(Boolean).join(" • ") ||
                            candidate.email ||
                            "Candidate"}
                        </p>
                        <p className="text-xs text-muted-foreground">Updated {formatDashboardDate(candidate.updatedAt)}</p>
                      </div>
                      <Button className="rounded-xl" variant="outline" size="sm" onClick={() => openCandidate(candidate)}>
                        View details
                      </Button>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </CardContent>
      </WorkforcePanel>

      <CandidateDetailDrawer
        candidate={selectedCandidate}
        employer={employer}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onReviewDocument={reviewDocument}
        onCandidateUpdated={handleCandidateUpdated}
      />
    </>
  )
}
