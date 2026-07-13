"use client"

import { useMemo } from "react"
import type { HiringEntity } from "@/types/hiring-entity"

interface UseHiringEntityArgs {
  employer: HiringEntity | null
}

interface UseHiringEntityResult {
  employer: HiringEntity | null
  hasEmployer: boolean
  queryString: string
}

export function useHiringEntity({ employer }: UseHiringEntityArgs): UseHiringEntityResult {
  const queryString = useMemo(() => {
    if (!employer) return ""

    const params = new URLSearchParams()
    params.set("entity_type", employer.entityType)
    params.set("entity_id", employer.entityId)

    if (employer.scope?.venueId) params.set("venue_id", employer.scope.venueId)
    if (employer.scope?.eventId) params.set("event_id", employer.scope.eventId)
    if (employer.scope?.tourId) params.set("tour_id", employer.scope.tourId)

    return params.toString()
  }, [employer])

  return {
    employer,
    hasEmployer: Boolean(employer?.entityId),
    queryString,
  }
}
