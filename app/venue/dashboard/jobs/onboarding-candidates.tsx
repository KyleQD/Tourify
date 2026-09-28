"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface OnboardingCandidate {
  id: string
  name: string
  email: string
  position: string | null
  department: string | null
  status: string
  stage: string | null
  onboarding_progress: number | null
  start_date?: string | null
}

/**
 * VEN-138 — Onboarding surface for the Jobs page. Reads the canonical
 * staff_onboarding_candidates table scoped to the acting venue.
 */
export function OnboardingCandidates({ venueId }: { venueId: string }) {
  const [candidates, setCandidates] = useState<OnboardingCandidate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/venue/hiring?venue_id=${encodeURIComponent(venueId)}&include=onboarding`,
        { credentials: "include", cache: "no-store" },
      )
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) throw new Error(json?.error || "Failed to load onboarding")
      setCandidates(Array.isArray(json.onboarding) ? json.onboarding : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load onboarding")
    } finally {
      setIsLoading(false)
    }
  }, [venueId])

  useEffect(() => {
    void load()
  }, [load])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading onboarding…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
        {error}
      </div>
    )
  }

  if (candidates.length === 0) {
    return (
      <Card className="border-gray-800 bg-gray-900">
        <CardContent className="p-6 text-center text-sm text-gray-400">
          No onboarding candidates yet — hire someone through the pipeline to start the flow.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {candidates.map((candidate) => (
        <div
          key={candidate.id}
          className="flex flex-col gap-3 rounded-lg border border-gray-800 bg-gray-900 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-semibold text-white">{candidate.name}</p>
            <p className="text-xs text-gray-400">
              {candidate.position || "Team member"} ·{" "}
              {candidate.department || "Operations"} · {candidate.email}
            </p>
          </div>
          <div className="flex min-w-[180px] items-center gap-4">
            <div className="min-w-[140px]">
              <div className="mb-1 flex justify-between text-xs text-gray-400">
                <span>Progress</span>
                <span>{candidate.onboarding_progress ?? 0}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-700">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{ width: `${candidate.onboarding_progress ?? 0}%` }}
                />
              </div>
            </div>
            <Badge variant="secondary" className="capitalize">
              {candidate.stage || candidate.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
