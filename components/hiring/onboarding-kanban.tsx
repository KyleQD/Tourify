"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { AlertCircle, Loader2, RefreshCcw, UserCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CandidateDetailDrawer } from "@/components/hiring/candidate-detail-drawer"
import { OnboardingKanbanFilters } from "@/components/hiring/onboarding-kanban-filters"
import { WorkforceEmptyState, WorkforcePanel } from "@/components/hiring/workforce-ui"
import { buildCandidateKanbanColumns, filterCandidates } from "@/lib/hiring/candidate-workflow-utils"
import type { CandidateKanbanApiResponse, CandidateKanbanFilters, HiringCandidate } from "@/types/hiring-candidate-workflow"
import type { HiringEntity } from "@/types/hiring-entity"

interface OnboardingKanbanProps {
  employer: HiringEntity
  initialCandidates?: HiringCandidate[]
  initialCandidateId?: string | null
}

const DEFAULT_FILTERS: CandidateKanbanFilters = {
  search: "",
  department: "all",
  position: "all",
  complianceStatus: "all",
  status: "all",
  templateState: "all",
  deliveryStatus: "all",
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

function buildCandidateQuery(employer: HiringEntity): string {
  const params = new URLSearchParams({
    entity_type: employer.entityType,
    entity_id: employer.entityId,
  })

  if (employer.scope?.eventId) params.set("event_id", employer.scope.eventId)
  if (employer.scope?.tourId) params.set("tour_id", employer.scope.tourId)
  if (employer.scope?.venueId) params.set("venue_id", employer.scope.venueId)

  return params.toString()
}

export function OnboardingKanban({ employer, initialCandidates = [], initialCandidateId = null }: OnboardingKanbanProps) {
  const [candidates, setCandidates] = useState<HiringCandidate[]>(initialCandidates)
  const [filters, setFilters] = useState<CandidateKanbanFilters>(DEFAULT_FILTERS)
  const [selectedCandidate, setSelectedCandidate] = useState<HiringCandidate | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(!initialCandidates.length)
  const [error, setError] = useState<string | null>(null)
  const deepLinkedCandidateId = initialCandidateId
  const hasHandledDeepLink = useRef(false)

  async function fetchCandidates(): Promise<HiringCandidate[]> {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/onboarding/candidates?${buildCandidateQuery(employer)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(getPayloadError(payload) ?? "Failed to load onboarding candidates")
      }

      const payload = (await response.json()) as CandidateKanbanApiResponse | { data?: HiringCandidate[] }
      const nextCandidates = payload.data ?? []
      setCandidates(nextCandidates)
      return nextCandidates
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load onboarding candidates")
      return []
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh the list after an in-drawer update and keep the open drawer in sync.
  async function handleCandidateUpdated() {
    const next = await fetchCandidates()
    setSelectedCandidate((prev) => (prev ? next.find((candidate) => candidate.id === prev.id) ?? prev : prev))
  }

  useEffect(() => {
    void fetchCandidates()

  }, [employer.entityType, employer.entityId, employer.scope?.eventId, employer.scope?.tourId, employer.scope?.venueId])

  // Refresh when the admin returns to this tab so newly submitted onboarding appears without a full reload.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void fetchCandidates()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)

  }, [employer.entityType, employer.entityId])

  const filteredCandidates = useMemo(() => filterCandidates({ candidates, filters }), [candidates, filters])
  const columns = useMemo(() => buildCandidateKanbanColumns(filteredCandidates), [filteredCandidates])

  // Open the drawer for a candidate deep-linked from the approval flow (?candidateId=).
  useEffect(() => {
    if (hasHandledDeepLink.current || !deepLinkedCandidateId || candidates.length === 0) return
    const match = candidates.find((candidate) => candidate.id === deepLinkedCandidateId)
    if (match) {
      hasHandledDeepLink.current = true
      setSelectedCandidate(match)
      setIsDrawerOpen(true)
    }
  }, [candidates, deepLinkedCandidateId])

  function openCandidate(candidate: HiringCandidate) {
    setSelectedCandidate(candidate)
    setIsDrawerOpen(true)
  }

  async function reviewDocument(args: { documentId: string; status: "verified" | "rejected"; rejectionReason?: string }) {
    // The compliance review API expects "approved" | "rejected" | "needs_review" and review_notes.
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

    await fetchCandidates()
  }

  if (isLoading && candidates.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-[320px] items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading onboarding candidates...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <h3 className="font-semibold">Could not load candidates</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={fetchCandidates} variant="outline">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Onboarding Pipeline</h2>
          <p className="text-sm text-muted-foreground">
            Track real candidates from invitation through completion for {employer.displayName}.
          </p>
        </div>
        <Button variant="outline" onClick={fetchCandidates} disabled={isLoading}>
          <RefreshCcw className={isLoading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
          Refresh
        </Button>
      </div>

      <OnboardingKanbanFilters candidates={candidates} filters={filters} onFiltersChange={setFilters} />

      {candidates.length === 0 ? (
        <WorkforceEmptyState
          icon={UserCheck}
          title="No onboarding candidates yet"
          description="Candidates appear here after an application is approved or a direct invite is created."
          action={
            <Button asChild size="sm" className="rounded-xl">
              <Link href={`/admin/dashboard/hiring?tab=applications&${buildCandidateQuery(employer)}`}>
                Review applications
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 overflow-x-auto pb-2 lg:grid-cols-7">
          {columns.map((column) => (
            <div key={column.id} className="min-w-[260px] space-y-3">
              <WorkforcePanel className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium text-white">{column.title}</h3>
                  <Badge variant="secondary">{column.candidates.length}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-400">{column.description}</p>
              </WorkforcePanel>

              <div className="space-y-3">
                {column.candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => openCandidate(candidate)}
                    className="w-full rounded-[1.15rem] border border-slate-700/60 bg-slate-950/65 p-4 text-left shadow-lg shadow-slate-950/20 transition hover:border-cyan-400/50 hover:bg-slate-900/75 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  >
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium leading-none text-white">{candidate.name}</p>
                        <p className="mt-1 truncate text-sm text-slate-400">{candidate.email}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {candidate.position ? <Badge variant="outline">{candidate.position}</Badge> : null}
                        {candidate.department ? <Badge variant="secondary">{candidate.department}</Badge> : null}
                        {candidate.templateState === "pending" ? (
                          <Badge variant="outline" className="border-amber-500/50 text-amber-200">
                            Template pending
                          </Badge>
                        ) : candidate.template ? (
                          <Badge variant="outline" className="border-cyan-500/40 text-cyan-200">
                            {candidate.template.name}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-500/50 text-slate-300">
                            Using job default
                          </Badge>
                        )}
                        {(candidate.onboardingDeliveryStatus ?? "not_sent") === "not_sent" ? (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-200">
                            Not sent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-200">
                            Invite sent
                          </Badge>
                        )}
                        {candidate.assignment?.managerName ? (
                          <Badge variant="outline" className="border-slate-500/50 text-slate-300">
                            Mgr: {candidate.assignment.managerName}
                          </Badge>
                        ) : null}
                      </div>
                      {candidate.templateState === "pending" ? (
                        <p className="text-xs text-amber-300">Assign onboarding to send it to this applicant.</p>
                      ) : null}

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{candidate.onboardingProgress}%</span>
                        </div>
                        <Progress value={candidate.onboardingProgress} />
                      </div>

                      {(candidate.missingRequiredCount ?? 0) > 0 || (candidate.blockingIssueCount ?? 0) > 0 ? (
                        <p className="text-xs text-destructive">
                          {(candidate.missingRequiredCount ?? 0)} missing • {(candidate.blockingIssueCount ?? 0)} blocking
                        </p>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <CandidateDetailDrawer
        candidate={selectedCandidate}
        employer={employer}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onReviewDocument={reviewDocument}
        onCandidateUpdated={handleCandidateUpdated}
      />
    </div>
  )
}
