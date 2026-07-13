"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringCandidateListItem } from "@/types/hiring-dashboard"
import { formatDashboardDate, getEmployerQueryString, getProgressPercent, normalizeStatusLabel } from "@/lib/hiring/hiring-dashboard-utils"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"

interface HiringOnboardingPanelProps {
  employer: HiringEntity
}

export function HiringOnboardingPanel({ employer }: HiringOnboardingPanelProps) {
  const queryString = getEmployerQueryString(employer)
  const { data: candidates, isLoading, error } = useHiringDashboardFetch<HiringCandidateListItem[]>({
    url: `/api/admin/onboarding/candidates?${queryString}`,
    initialData: [],
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding</CardTitle>
        <CardDescription>Track approved candidates through token-based worker onboarding.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading candidates…</p> : null}
        {!isLoading && candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No onboarding candidates exist for this account yet.</p>
        ) : null}
        {candidates.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {candidates.map((candidate) => {
              const progress = getProgressPercent(candidate.onboardingProgress)
              return (
                <div key={candidate.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{candidate.name}</h3>
                        <Badge variant="outline">{normalizeStatusLabel(candidate.status)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {[candidate.department, candidate.position].filter(Boolean).join(" • ") || candidate.email || "Candidate"}
                      </p>
                      <p className="text-xs text-muted-foreground">Updated {formatDashboardDate(candidate.updatedAt)}</p>
                    </div>
                    {candidate.invitationToken ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/onboarding/hire/${candidate.invitationToken}`} target="_blank" rel="noreferrer">
                          Open link
                        </a>
                      </Button>
                    ) : null}
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
    </Card>
  )
}
