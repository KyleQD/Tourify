"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Loader2, RefreshCcw, UserCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CandidateDetailDrawer } from "@/components/hiring/candidate-detail-drawer"
import { OnboardingKanbanFilters } from "@/components/hiring/onboarding-kanban-filters"
import { buildCandidateKanbanColumns, filterCandidates } from "@/lib/hiring/candidate-workflow-utils"
import type { CandidateKanbanApiResponse, CandidateKanbanFilters, HiringCandidate } from "@/types/hiring-candidate-workflow"
import type { HiringEntity } from "@/types/hiring-entity"

interface OnboardingKanbanProps {
  employer: HiringEntity
  initialCandidates?: HiringCandidate[]
}

const DEFAULT_FILTERS: CandidateKanbanFilters = {
  search: "",
  department: "all",
  position: "all",
  complianceStatus: "all",
  status: "all",
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

export function OnboardingKanban({ employer, initialCandidates = [] }: OnboardingKanbanProps) {
  const [candidates, setCandidates] = useState<HiringCandidate[]>(initialCandidates)
  const [filters, setFilters] = useState<CandidateKanbanFilters>(DEFAULT_FILTERS)
  const [selectedCandidate, setSelectedCandidate] = useState<HiringCandidate | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(!initialCandidates.length)
  const [error, setError] = useState<string | null>(null)

  async function fetchCandidates() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/onboarding/candidates?${buildCandidateQuery(employer)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? "Failed to load onboarding candidates")
      }

      const payload = (await response.json()) as CandidateKanbanApiResponse | { data?: HiringCandidate[] }
      setCandidates(payload.data ?? [])
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load onboarding candidates")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchCandidates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employer.entityType, employer.entityId, employer.scope?.eventId, employer.scope?.tourId, employer.scope?.venueId])

  const filteredCandidates = useMemo(() => filterCandidates({ candidates, filters }), [candidates, filters])
  const columns = useMemo(() => buildCandidateKanbanColumns(filteredCandidates), [filteredCandidates])

  function openCandidate(candidate: HiringCandidate) {
    setSelectedCandidate(candidate)
    setIsDrawerOpen(true)
  }

  async function reviewDocument(args: { documentId: string; status: "verified" | "rejected"; rejectionReason?: string }) {
    const response = await fetch(`/api/admin/onboarding/documents/${args.documentId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: args.status,
        rejection_reason: args.rejectionReason,
        employer_entity_type: employer.entityType,
        employer_entity_id: employer.entityId,
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.error ?? "Failed to review document")
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
        <Card>
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
            <UserCheck className="h-8 w-8 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">No onboarding candidates yet</h3>
              <p className="text-sm text-muted-foreground">
                Candidates appear here after an application is approved or a direct invite is created.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 overflow-x-auto pb-2 lg:grid-cols-7">
          {columns.map((column) => (
            <div key={column.id} className="min-w-[260px] space-y-3">
              <div className="rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium">{column.title}</h3>
                  <Badge variant="secondary">{column.candidates.length}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{column.description}</p>
              </div>

              <div className="space-y-3">
                {column.candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => openCandidate(candidate)}
                    className="w-full rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-primary/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium leading-none">{candidate.name}</p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{candidate.email}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {candidate.position ? <Badge variant="outline">{candidate.position}</Badge> : null}
                        {candidate.department ? <Badge variant="secondary">{candidate.department}</Badge> : null}
                      </div>

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
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onReviewDocument={reviewDocument}
      />
    </div>
  )
}
