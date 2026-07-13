import { NextRequest, NextResponse } from "next/server"

import { getAuthenticatedUserId } from "@/lib/api/hiring-route-helpers"
import { resolveHiringEntity } from "@/lib/auth/acting-context"
import { HiringCandidateWorkflowService } from "@/lib/services/hiring-candidate-workflow.service"
import type { HiringEntityType } from "@/types/hiring-entity"

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const entityType = searchParams.get("entity_type") as HiringEntityType | null
  const entityId = searchParams.get("entity_id")
  const venueId = searchParams.get("venue_id")

  const employer = await resolveHiringEntity({
    userId,
    entityType: entityType ?? undefined,
    entityId: entityId ?? undefined,
    venueId: venueId ?? undefined,
    eventId: searchParams.get("event_id") ?? undefined,
    tourId: searchParams.get("tour_id") ?? undefined,
  })

  const result = await HiringCandidateWorkflowService.listCandidates({ actorUserId: userId, employer })
  if (result.error) return NextResponse.json({ error: result.error }, { status: 403 })

  return NextResponse.json({
    data: result.data ?? [],
    meta: {
      total: result.data?.length ?? 0,
      employer,
    },
  })
}
